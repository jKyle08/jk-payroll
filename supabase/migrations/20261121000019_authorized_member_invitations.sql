-- ==============================================================================
-- PHASE 1.2: organization-member invitations and atomic membership activation.
-- Ordinary organization administrators may invite non-admin users only.
-- ==============================================================================
BEGIN;

DO $$
BEGIN
    IF to_regclass('public.organization_members') IS NULL
       OR to_regclass('public.user_roles') IS NULL
       OR to_regclass('public.profiles') IS NULL
       OR to_regclass('public.departments') IS NULL
       OR to_regclass('public.roles') IS NULL THEN
        RAISE EXCEPTION 'Phase 1.2 preflight failed: required membership tables are missing';
    END IF;
END;
$$;

CREATE TABLE public.organization_member_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    invited_email TEXT NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE RESTRICT,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    expires_at TIMESTAMPTZ NOT NULL,
    redeemed_at TIMESTAMPTZ,
    redeemed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT chk_member_invitation_redemption CHECK (
        (redeemed_at IS NULL AND redeemed_by IS NULL)
        OR redeemed_at IS NOT NULL
    )
);
ALTER TABLE public.organization_member_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_member_invitations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.organization_member_invitations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.organization_member_invitations TO service_role;

-- Actor-scoped predicate duplicated in the privileged RPC because auth.uid() is
-- unavailable to service_role. This function is not client executable.
CREATE OR REPLACE FUNCTION public.is_active_org_admin_for_user(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.organizations o ON o.id = p_org_id
        WHERE p.id = p_user_id AND p.is_active = true AND p.is_super_admin = true
          AND o.status = 'Active' AND (o.end_date IS NULL OR o.end_date >= clock_timestamp())
    ) OR EXISTS (
        SELECT 1
        FROM public.organization_members om
        JOIN public.organizations o ON o.id = om.organization_id
        JOIN public.profiles p ON p.id = om.user_id
        WHERE om.user_id = p_user_id
          AND om.organization_id = p_org_id
          AND om.is_active = true
          AND p.is_active = true
          AND o.status = 'Active'
          AND (o.end_date IS NULL OR o.end_date >= clock_timestamp())
          AND (
              om.is_owner = true
              OR (p.organization_id = p_org_id AND p.is_organization_admin = true)
              OR EXISTS (
                  SELECT 1 FROM public.user_roles ur
                  JOIN public.roles r ON r.id = ur.role_id
                  WHERE ur.organization_id = p_org_id AND ur.user_id = p_user_id
                    AND r.is_active = true AND r.role_type = 'SYSTEM'
                    AND r.organization_id IS NULL
                    AND upper(r.code) IN ('TENANT_ADMIN','ORGANIZATION_ADMIN','ORG_ADMIN','ADMIN')
              )
              OR EXISTS (
                  SELECT 1 FROM public.roles r
                  WHERE r.id = om.role_id AND r.is_active = true
                    AND r.role_type = 'SYSTEM' AND r.organization_id IS NULL
                    AND upper(r.code) IN ('TENANT_ADMIN','ORGANIZATION_ADMIN','ORG_ADMIN','ADMIN')
              )
          )
    );
$$;

CREATE OR REPLACE FUNCTION public.create_organization_member_invitation(
    p_actor_id UUID,
    p_organization_id UUID,
    p_invited_email TEXT,
    p_department_id UUID,
    p_role_id UUID,
    p_token_hash TEXT
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role public.roles%ROWTYPE;
    v_expires TIMESTAMPTZ := clock_timestamp() + INTERVAL '24 hours';
BEGIN
    IF NOT public.is_active_org_admin_for_user(p_actor_id, p_organization_id) THEN
        RAISE EXCEPTION 'Active organization administrator authority is required' USING ERRCODE = '42501';
    END IF;
    IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' OR p_invited_email IS NULL THEN
        RAISE EXCEPTION 'Invalid member invitation' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE o.id = p_organization_id AND o.status = 'Active'
          AND (o.end_date IS NULL OR o.end_date >= clock_timestamp())
    ) THEN
        RAISE EXCEPTION 'Organization is not eligible for invitations' USING ERRCODE = '42501';
    END IF;
    IF p_department_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.departments d
        WHERE d.id = p_department_id AND d.organization_id = p_organization_id AND d.is_active = true
    ) THEN
        RAISE EXCEPTION 'Department must be active and belong to the target organization' USING ERRCODE = '23514';
    END IF;

    SELECT * INTO v_role FROM public.roles r WHERE r.id = p_role_id FOR SHARE;
    IF NOT FOUND OR NOT v_role.is_active THEN
        RAISE EXCEPTION 'Role is missing or inactive' USING ERRCODE = '23514';
    END IF;
    IF v_role.role_type = 'SYSTEM' OR v_role.organization_id IS DISTINCT FROM p_organization_id
       OR upper(v_role.code) IN ('TENANT_ADMIN','ORGANIZATION_ADMIN','ORG_ADMIN','ADMIN','SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Organization administrators cannot invite privileged or out-of-organization roles' USING ERRCODE = '42501';
    END IF;

    IF EXISTS (
        SELECT 1 FROM auth.users u
        JOIN public.organization_members om ON om.user_id = u.id AND om.organization_id = p_organization_id
        WHERE lower(u.email) = lower(trim(p_invited_email))
    ) THEN
        RAISE EXCEPTION 'User already has an active membership in this organization' USING ERRCODE = '23505';
    END IF;

    DELETE FROM public.organization_member_invitations
    WHERE organization_id = p_organization_id
      AND lower(invited_email) = lower(trim(p_invited_email)) AND redeemed_at IS NULL;
    INSERT INTO public.organization_member_invitations(
        token_hash, organization_id, invited_email, department_id, role_id, created_by, expires_at
    ) VALUES (
        p_token_hash, p_organization_id, lower(trim(p_invited_email)),
        p_department_id, p_role_id, p_actor_id, v_expires
    );
    RETURN v_expires;
END;
$$;

CREATE OR REPLACE FUNCTION public.provision_organization_member_from_invitation(
    p_token_hash TEXT,
    p_user_id UUID,
    p_full_name TEXT
)
RETURNS TABLE (organization_id UUID, department_id UUID, user_id UUID, role_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_inv public.organization_member_invitations%ROWTYPE;
    v_email TEXT;
    v_existing_profile public.profiles%ROWTYPE;
BEGIN
    SELECT * INTO v_inv FROM public.organization_member_invitations i
    WHERE i.token_hash = p_token_hash FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid member invitation' USING ERRCODE = '42501'; END IF;

    IF v_inv.redeemed_at IS NOT NULL THEN
        IF v_inv.redeemed_by = p_user_id THEN
            RETURN QUERY SELECT v_inv.organization_id, v_inv.department_id, p_user_id, v_inv.role_id;
            RETURN;
        END IF;
        RAISE EXCEPTION 'Member invitation has already been used' USING ERRCODE = '42501';
    END IF;
    IF v_inv.expires_at <= clock_timestamp() THEN
        RAISE EXCEPTION 'Member invitation has expired' USING ERRCODE = '42501';
    END IF;
    SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = p_user_id;
    IF v_email IS NULL OR v_email <> lower(v_inv.invited_email) THEN
        RAISE EXCEPTION 'Account does not match the invited email' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE o.id = v_inv.organization_id AND o.status = 'Active'
          AND (o.end_date IS NULL OR o.end_date >= clock_timestamp())
    ) THEN RAISE EXCEPTION 'Organization is not eligible for membership' USING ERRCODE = '42501'; END IF;
    IF v_inv.department_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.departments d WHERE d.id = v_inv.department_id
          AND d.organization_id = v_inv.organization_id AND d.is_active = true
    ) THEN RAISE EXCEPTION 'Invited department is no longer eligible' USING ERRCODE = '23514'; END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.roles r WHERE r.id = v_inv.role_id AND r.organization_id = v_inv.organization_id
          AND r.role_type = 'CUSTOM' AND r.is_active = true
          AND upper(r.code) NOT IN ('TENANT_ADMIN','ORGANIZATION_ADMIN','ORG_ADMIN','ADMIN','SUPER_ADMIN')
    ) THEN RAISE EXCEPTION 'Invited role is no longer eligible' USING ERRCODE = '23514'; END IF;
    IF EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = v_inv.organization_id AND om.user_id = p_user_id
    ) THEN RAISE EXCEPTION 'User already has a membership in this organization' USING ERRCODE = '23505'; END IF;

    SELECT * INTO v_existing_profile FROM public.profiles p WHERE p.id = p_user_id;
    IF FOUND THEN
        IF NOT v_existing_profile.is_active OR lower(v_existing_profile.email) <> v_email THEN
            RAISE EXCEPTION 'Existing profile is inactive or identity does not match' USING ERRCODE = '42501';
        END IF;
    ELSE
        INSERT INTO public.profiles(
            id, organization_id, department_id, full_name, email,
            is_organization_admin, is_super_admin, is_active
        ) VALUES (
            p_user_id, v_inv.organization_id, v_inv.department_id,
            trim(p_full_name), v_email, false, false, true
        );
    END IF;

    INSERT INTO public.organization_members(
        organization_id, user_id, role_id, department_id, is_owner, is_active
    ) VALUES (
        v_inv.organization_id, p_user_id, v_inv.role_id, v_inv.department_id, false, true
    );
    INSERT INTO public.user_roles(organization_id, user_id, role_id, assigned_by)
    VALUES (v_inv.organization_id, p_user_id, v_inv.role_id, v_inv.created_by);

    UPDATE public.organization_member_invitations
    SET redeemed_at = clock_timestamp(), redeemed_by = p_user_id
    WHERE id = v_inv.id;
    RETURN QUERY SELECT v_inv.organization_id, v_inv.department_id, p_user_id, v_inv.role_id;
END;
$$;

REVOKE ALL ON FUNCTION public.is_active_org_admin_for_user(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_organization_member_invitation(UUID, UUID, TEXT, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.provision_organization_member_from_invitation(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization_member_invitation(UUID, UUID, TEXT, UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.provision_organization_member_from_invitation(TEXT, UUID, TEXT) TO service_role;

COMMIT;

-- Rollback guidance (only if no member invitations have been created):
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.provision_organization_member_from_invitation(TEXT, UUID, TEXT);
-- DROP FUNCTION IF EXISTS public.create_organization_member_invitation(UUID, UUID, TEXT, UUID, UUID, TEXT);
-- DROP FUNCTION IF EXISTS public.is_active_org_admin_for_user(UUID, UUID);
-- DROP TABLE IF EXISTS public.organization_member_invitations;
-- COMMIT;
