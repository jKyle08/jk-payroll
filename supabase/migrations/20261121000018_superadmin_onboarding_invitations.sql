-- ==============================================================================
-- PHASE 1.2: single-use, SuperAdmin-issued organization onboarding invitations.
-- The invitation is valid for 24 hours and provisions all tenant records in one
-- PostgreSQL transaction. Supabase Auth user creation is external and is cleaned
-- up by Express if the transactional provisioning RPC fails.
-- ==============================================================================
BEGIN;

DO $$
BEGIN
    IF to_regclass('public.organizations') IS NULL
       OR to_regclass('public.organization_members') IS NULL
       OR to_regclass('public.user_roles') IS NULL
       OR to_regclass('public.profiles') IS NULL
       OR to_regclass('public.departments') IS NULL
       OR to_regclass('public.roles') IS NULL THEN
        RAISE EXCEPTION 'Phase 1.2 preflight failed: required provisioning tables are missing';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.roles
        WHERE code = 'TENANT_ADMIN' AND role_type = 'SYSTEM'
          AND organization_id IS NULL AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Phase 1.2 preflight failed: active SYSTEM TENANT_ADMIN role is missing';
    END IF;
END;
$$;

CREATE TABLE public.organization_onboarding_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    invited_email TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    expires_at TIMESTAMPTZ NOT NULL,
    redeemed_at TIMESTAMPTZ,
    redeemed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    CONSTRAINT chk_onboarding_invitation_redemption CHECK (
        (redeemed_at IS NULL AND redeemed_by IS NULL AND organization_id IS NULL)
        OR (redeemed_at IS NOT NULL AND organization_id IS NOT NULL)
    )
);
ALTER TABLE public.organization_onboarding_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_onboarding_invitations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.organization_onboarding_invitations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.organization_onboarding_invitations TO service_role;

CREATE OR REPLACE FUNCTION public.create_organization_onboarding_invitation(
    p_actor_id UUID,
    p_invited_email TEXT,
    p_token_hash TEXT
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_expires TIMESTAMPTZ := clock_timestamp() + INTERVAL '24 hours';
BEGIN
    IF p_actor_id IS NULL OR p_invited_email IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
        RAISE EXCEPTION 'Invalid onboarding invitation request' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = p_actor_id AND p.is_active = true AND p.is_super_admin = true
    ) THEN
        RAISE EXCEPTION 'Only an active SuperAdmin may issue organization onboarding links'
            USING ERRCODE = '42501';
    END IF;

    -- New issuance for the same address invalidates any older unredeemed link.
    DELETE FROM public.organization_onboarding_invitations
    WHERE lower(invited_email) = lower(trim(p_invited_email)) AND redeemed_at IS NULL;

    INSERT INTO public.organization_onboarding_invitations(token_hash, invited_email, created_by, expires_at)
    VALUES (p_token_hash, lower(trim(p_invited_email)), p_actor_id, v_expires);
    RETURN v_expires;
END;
$$;

CREATE OR REPLACE FUNCTION public.provision_organization_from_onboarding_invitation(
    p_token_hash TEXT,
    p_user_id UUID,
    p_organization JSONB,
    p_department_name TEXT DEFAULT 'Human Resources',
    p_department_code TEXT DEFAULT 'HR'
)
RETURNS TABLE (organization_id UUID, department_id UUID, user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_inv public.organization_onboarding_invitations%ROWTYPE;
    v_email TEXT;
    v_org_id UUID;
    v_dept_id UUID;
    v_tenant_role_id UUID;
    v_code TEXT;
BEGIN
    IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' OR p_user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid onboarding credentials' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_inv
    FROM public.organization_onboarding_invitations i
    WHERE i.token_hash = p_token_hash
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid onboarding invitation' USING ERRCODE = '42501';
    END IF;
    -- Idempotent replay by the same identity returns the already-provisioned result.
    IF v_inv.redeemed_at IS NOT NULL THEN
        IF v_inv.redeemed_by = p_user_id THEN
            SELECT d.id INTO v_dept_id
            FROM public.departments d
            WHERE d.organization_id = v_inv.organization_id
            ORDER BY d.created_at ASC LIMIT 1;
            RETURN QUERY SELECT v_inv.organization_id, v_dept_id, p_user_id;
            RETURN;
        END IF;
        RAISE EXCEPTION 'Onboarding invitation has already been used' USING ERRCODE = '42501';
    END IF;
    IF v_inv.expires_at <= clock_timestamp() THEN
        RAISE EXCEPTION 'Onboarding invitation has expired' USING ERRCODE = '42501';
    END IF;

    SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = p_user_id;
    IF v_email IS NULL OR v_email <> lower(v_inv.invited_email) THEN
        RAISE EXCEPTION 'Authenticated account does not match the invited email' USING ERRCODE = '42501';
    END IF;
    IF p_organization IS NULL OR nullif(trim(p_organization->>'name'), '') IS NULL
       OR nullif(trim(p_organization->>'code'), '') IS NULL THEN
        RAISE EXCEPTION 'Organization name and code are required' USING ERRCODE = '22023';
    END IF;

    v_code := upper(trim(p_organization->>'code'));
    SELECT r.id INTO v_tenant_role_id
    FROM public.roles r
    WHERE r.code = 'TENANT_ADMIN' AND r.role_type = 'SYSTEM'
      AND r.organization_id IS NULL AND r.is_active = true
    LIMIT 1;
    IF v_tenant_role_id IS NULL THEN
        RAISE EXCEPTION 'Active SYSTEM TENANT_ADMIN role is unavailable';
    END IF;

    INSERT INTO public.organizations (
        name, code, slug, legal_name, tax_id, industry, domain, sector, tier,
        status, start_date, end_date, currency, timezone, country_code,
        default_pay_frequency, supported_work_modes, statutory_ids, settings, modules,
        primary_contact_id, created_by
    ) VALUES (
        trim(p_organization->>'name'), v_code,
        coalesce(nullif(trim(p_organization->>'slug'), ''), lower(regexp_replace(v_code, '[^a-z0-9]+', '-', 'g'))),
        nullif(p_organization->>'legalName', ''), nullif(p_organization->>'taxId', ''),
        coalesce(nullif(p_organization->>'industry', ''), 'Technology & Software'),
        nullif(p_organization->>'domain', ''),
        coalesce(nullif(p_organization->>'sector', ''), 'Private')::public.organization_sector,
        coalesce(nullif(p_organization->>'tier', ''), 'Enterprise')::public.organization_tier,
        'Active'::public.organization_status,
        coalesce(nullif(p_organization->>'startDate', '')::timestamptz, clock_timestamp()),
        nullif(p_organization->>'endDate', '')::timestamptz,
        coalesce(nullif(p_organization->>'currency', ''), 'PHP'),
        coalesce(nullif(p_organization->>'timezone', ''), 'Asia/Manila'),
        coalesce(nullif(p_organization->>'countryCode', ''), 'PH'),
        coalesce(nullif(p_organization->>'defaultPayFrequency', ''), 'Semi-Monthly')::public.pay_frequency,
        coalesce(p_organization->'supportedWorkModes', '["OnSite","Remote","Hybrid"]'::jsonb),
        coalesce(p_organization->'statutoryIds', '{}'::jsonb),
        coalesce(p_organization->'settings', '{}'::jsonb),
        coalesce(p_organization->'modules', '["Department","EmployeeProfile","RolePermission"]'::jsonb),
        p_user_id, v_inv.created_by
    ) RETURNING id INTO v_org_id;

    INSERT INTO public.departments (organization_id, code, name, created_by)
    VALUES (v_org_id, upper(trim(p_department_code)), trim(p_department_name), v_inv.created_by)
    RETURNING id INTO v_dept_id;

    INSERT INTO public.profiles (
        id, organization_id, department_id, full_name, email, username, title,
        is_organization_admin, is_super_admin, is_active, created_by
    ) VALUES (
        p_user_id, v_org_id, v_dept_id,
        coalesce(nullif(trim(p_organization #>> '{admin,fullName}'), ''), split_part(v_email, '@', 1)),
        v_email, nullif(p_organization #>> '{admin,username}', ''),
        nullif(p_organization #>> '{admin,title}', ''), false, false, true, v_inv.created_by
    );

    INSERT INTO public.organization_members (
        organization_id, user_id, role_id, department_id, is_owner, is_active
    ) VALUES (v_org_id, p_user_id, v_tenant_role_id, v_dept_id, true, true);

    INSERT INTO public.user_roles (organization_id, user_id, role_id, assigned_by)
    VALUES (v_org_id, p_user_id, v_tenant_role_id, v_inv.created_by);

    UPDATE public.organization_onboarding_invitations
    SET redeemed_at = clock_timestamp(), redeemed_by = p_user_id, organization_id = v_org_id
    WHERE id = v_inv.id;

    RETURN QUERY SELECT v_org_id, v_dept_id, p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization_onboarding_invitation(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.provision_organization_from_onboarding_invitation(TEXT, UUID, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization_onboarding_invitation(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.provision_organization_from_onboarding_invitation(TEXT, UUID, JSONB, TEXT, TEXT) TO service_role;

COMMIT;

-- Rollback (manual, only if no invitations have been issued):
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.provision_organization_from_onboarding_invitation(TEXT, UUID, JSONB, TEXT, TEXT);
-- DROP FUNCTION IF EXISTS public.create_organization_onboarding_invitation(UUID, TEXT, TEXT);
-- DROP TABLE IF EXISTS public.organization_onboarding_invitations;
-- COMMIT;
