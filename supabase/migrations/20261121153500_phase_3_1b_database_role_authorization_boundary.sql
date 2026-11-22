-- Phase 3.1B: enforce organization role scope at PostgreSQL boundaries.
-- Migration 20 remains unchanged. This migration supplements its narrow guard.
-- Trusted first-owner TENANT_ADMIN writes remain available only to service_role
-- through the existing SECURITY DEFINER provisioning workflow.
BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_organization_role_code(p_code TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, public, pg_temp
AS $$
    SELECT regexp_replace(upper(coalesce(p_code, '')), '[[:space:]_-]+', '', 'g');
$$;

CREATE OR REPLACE FUNCTION public.is_assignable_organization_role(
    p_role_id UUID,
    p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.roles r
        WHERE r.id = p_role_id
          AND r.organization_id = p_organization_id
          AND r.role_type = 'CUSTOM'
          AND r.is_active = true
          AND public.normalize_organization_role_code(r.code) NOT IN (
              'SUPERADMIN', 'PLATFORMSUPERADMIN', 'TENANTADMIN',
              'ORGANIZATIONADMIN', 'ORGADMIN', 'ADMIN'
          )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_existing_trusted_tenant_admin_user_role(
    p_organization_id UUID,
    p_user_id UUID,
    p_role_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        JOIN public.organization_members om
          ON om.organization_id = ur.organization_id
         AND om.user_id = ur.user_id
         AND om.role_id = ur.role_id
         AND om.is_owner = true
         AND om.is_active = true
        WHERE ur.organization_id = p_organization_id
          AND ur.user_id = p_user_id
          AND ur.role_id = p_role_id
          AND public.normalize_organization_role_code(r.code) = 'TENANTADMIN'
          AND r.role_type = 'SYSTEM'
          AND r.organization_id IS NULL
          AND r.is_active = true
          AND om.is_active = true
    );
$$;

CREATE OR REPLACE FUNCTION public.is_existing_trusted_tenant_admin_membership(
    p_membership_id UUID,
    p_organization_id UUID,
    p_user_id UUID,
    p_role_id UUID,
    p_is_owner BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
    SELECT p_is_owner IS TRUE AND EXISTS (
        SELECT 1
        FROM public.organization_members om
        JOIN public.roles r ON r.id = om.role_id
        WHERE om.id = p_membership_id
          AND om.organization_id = p_organization_id
          AND om.user_id = p_user_id
          AND om.role_id = p_role_id
          AND om.is_owner = true
          AND om.is_active = true
          AND public.normalize_organization_role_code(r.code) = 'TENANTADMIN'
          AND r.role_type = 'SYSTEM'
          AND r.organization_id IS NULL
          AND r.is_active = true
    );
$$;

CREATE OR REPLACE FUNCTION public.enforce_organization_role_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $$
DECLARE
    v_role public.roles%ROWTYPE;
    v_code TEXT;
    v_actor_role TEXT := coalesce(auth.role(), 'anon');
    v_is_first_owner_tenant_admin BOOLEAN := false;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.organization_id IS DISTINCT FROM OLD.organization_id
       AND v_actor_role <> 'service_role' AND NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Organization administrators cannot move assignments across organizations'
            USING ERRCODE = '42501';
    END IF;

    IF TG_TABLE_NAME = 'organization_members' THEN
        IF TG_OP = 'INSERT' AND NEW.is_owner AND v_actor_role <> 'service_role' THEN
            RAISE EXCEPTION 'Only trusted onboarding may create an organization owner membership'
                USING ERRCODE = '42501';
        END IF;
        IF TG_OP = 'UPDATE' AND NEW.is_owner IS DISTINCT FROM OLD.is_owner
           AND v_actor_role <> 'service_role' THEN
            RAISE EXCEPTION 'Only trusted provisioning may change organization owner status'
                USING ERRCODE = '42501';
        END IF;
        IF NEW.role_id IS NULL THEN
            RETURN NEW;
        END IF;
    END IF;

    SELECT r.* INTO v_role
    FROM public.roles r
    WHERE r.id = NEW.role_id
    FOR SHARE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Assigned role does not exist' USING ERRCODE = '23503';
    END IF;

    v_code := public.normalize_organization_role_code(v_role.code);
    IF v_code = 'TENANTADMIN'
       AND v_actor_role = 'service_role'
       AND v_role.role_type = 'SYSTEM'
       AND v_role.organization_id IS NULL
       AND v_role.is_active = true THEN
        IF TG_TABLE_NAME = 'organization_members' THEN
            v_is_first_owner_tenant_admin := NEW.is_owner;
        ELSE
            SELECT EXISTS (
                SELECT 1 FROM public.organization_members om
                WHERE om.organization_id = NEW.organization_id
                  AND om.user_id = NEW.user_id
                  AND om.role_id = NEW.role_id
                  AND om.is_owner = true
                  AND om.is_active = true
            ) INTO v_is_first_owner_tenant_admin;
        END IF;
        IF v_is_first_owner_tenant_admin
           AND EXISTS (
               SELECT 1 FROM public.profiles p
               WHERE p.id = NEW.user_id
                 AND p.is_active = true
                 AND p.is_super_admin = false
           ) THEN
            RETURN NEW;
        END IF;
    END IF;

    IF v_code IN (
        'SUPERADMIN', 'PLATFORMSUPERADMIN', 'TENANTADMIN',
        'ORGANIZATIONADMIN', 'ORGADMIN', 'ADMIN'
    ) THEN
        RAISE EXCEPTION 'Protected role codes cannot be assigned through organization role management'
            USING ERRCODE = '42501';
    END IF;

    IF v_role.role_type <> 'CUSTOM'
       OR v_role.organization_id IS DISTINCT FROM NEW.organization_id
       OR NOT v_role.is_active THEN
        RAISE EXCEPTION 'Role must be active, custom, and scoped to the assignment organization'
            USING ERRCODE = '23514';
    END IF;

    IF TG_TABLE_NAME = 'user_roles'
       AND NOT EXISTS (
           SELECT 1 FROM public.organization_members om
           WHERE om.organization_id = NEW.organization_id
             AND om.user_id = NEW.user_id
             AND om.is_active = true
       ) THEN
        RAISE EXCEPTION 'User role assignment requires active membership in the same organization'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_phase31b_user_role_assignment ON public.user_roles;
CREATE TRIGGER trg_phase31b_user_role_assignment
    BEFORE INSERT OR UPDATE OF organization_id, user_id, role_id
    ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.enforce_organization_role_assignment();

DROP TRIGGER IF EXISTS trg_phase31b_organization_member_role_assignment ON public.organization_members;
CREATE TRIGGER trg_phase31b_organization_member_role_assignment
    BEFORE INSERT OR UPDATE OF organization_id, user_id, role_id, is_owner
    ON public.organization_members
    FOR EACH ROW EXECUTE FUNCTION public.enforce_organization_role_assignment();

CREATE OR REPLACE FUNCTION public.enforce_member_invitation_role_eligibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
    IF NOT public.is_assignable_organization_role(NEW.role_id, NEW.organization_id) THEN
        RAISE EXCEPTION 'Invitations require an active, same-organization custom role that is not protected'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_phase31b_member_invitation_role ON public.organization_member_invitations;
CREATE TRIGGER trg_phase31b_member_invitation_role
    BEFORE INSERT OR UPDATE OF organization_id, role_id
    ON public.organization_member_invitations
    FOR EACH ROW EXECUTE FUNCTION public.enforce_member_invitation_role_eligibility();

CREATE OR REPLACE FUNCTION public.prevent_assigned_role_identity_or_scope_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    v_has_assignments BOOLEAN;
    v_old_code TEXT := public.normalize_organization_role_code(OLD.code);
    v_new_code TEXT := public.normalize_organization_role_code(NEW.code);
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur WHERE ur.role_id = OLD.id
        UNION ALL
        SELECT 1 FROM public.organization_members om WHERE om.role_id = OLD.id
    ) INTO v_has_assignments;

    IF v_has_assignments AND (
        NEW.organization_id IS DISTINCT FROM OLD.organization_id
        OR NEW.role_type IS DISTINCT FROM OLD.role_type
    ) THEN
        RAISE EXCEPTION 'Role organization scope/type cannot change while assignments reference it'
            USING ERRCODE = '42501';
    END IF;

    IF v_has_assignments AND v_new_code IS DISTINCT FROM v_old_code
       AND (
           v_new_code IN ('SUPERADMIN', 'PLATFORMSUPERADMIN', 'TENANTADMIN',
                          'ORGANIZATIONADMIN', 'ORGADMIN', 'ADMIN')
           OR v_old_code IN ('SUPERADMIN', 'PLATFORMSUPERADMIN', 'TENANTADMIN',
                             'ORGANIZATIONADMIN', 'ORGADMIN', 'ADMIN')
       ) THEN
        RAISE EXCEPTION 'Protected role identity cannot change while assignments reference it'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_phase31b_role_identity_scope ON public.roles;
CREATE TRIGGER trg_phase31b_role_identity_scope
    BEFORE UPDATE OF code, organization_id, role_type
    ON public.roles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_assigned_role_identity_or_scope_change();

-- Keep SELECT policy behavior from migration 10. Restrict INSERT and both the
-- old/new sides of UPDATE to active custom roles scoped to the resulting org.
DROP POLICY IF EXISTS user_roles_insert_policy ON public.user_roles;
DROP POLICY IF EXISTS user_roles_update_policy ON public.user_roles;
CREATE POLICY user_roles_insert_policy ON public.user_roles
    FOR INSERT TO authenticated
    WITH CHECK (
        (public.is_super_admin()
         OR (organization_id = public.current_user_organization_id()
             AND public.is_organization_admin(organization_id)))
        AND public.is_assignable_organization_role(role_id, organization_id)
    );
CREATE POLICY user_roles_update_policy ON public.user_roles
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR (organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id))
    )
    WITH CHECK (
        (public.is_super_admin()
         OR (organization_id = public.current_user_organization_id()
             AND public.is_organization_admin(organization_id)))
        AND (
            public.is_assignable_organization_role(role_id, organization_id)
            OR public.is_existing_trusted_tenant_admin_user_role(organization_id, user_id, role_id)
        )
    );

DROP POLICY IF EXISTS org_members_insert_policy ON public.organization_members;
DROP POLICY IF EXISTS org_members_update_policy ON public.organization_members;
CREATE POLICY org_members_insert_policy ON public.organization_members
    FOR INSERT TO authenticated
    WITH CHECK (
        (public.is_super_admin()
         OR (organization_id = public.current_user_organization_id()
             AND public.is_organization_admin(organization_id)))
        AND is_owner = false
        AND (role_id IS NULL OR public.is_assignable_organization_role(role_id, organization_id))
    );
CREATE POLICY org_members_update_policy ON public.organization_members
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR (organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id))
    )
    WITH CHECK (
        (public.is_super_admin()
         OR (organization_id = public.current_user_organization_id()
             AND public.is_organization_admin(organization_id)))
        AND (
            role_id IS NULL
            OR public.is_assignable_organization_role(role_id, organization_id)
            OR public.is_existing_trusted_tenant_admin_membership(id, organization_id, user_id, role_id, is_owner)
        )
    );

REVOKE ALL ON FUNCTION public.normalize_organization_role_code(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_assignable_organization_role(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_assignable_organization_role(UUID, UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_existing_trusted_tenant_admin_user_role(UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_existing_trusted_tenant_admin_user_role(UUID, UUID, UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_existing_trusted_tenant_admin_membership(UUID, UUID, UUID, UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_existing_trusted_tenant_admin_membership(UUID, UUID, UUID, UUID, BOOLEAN) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_organization_role_assignment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_assigned_role_identity_or_scope_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_member_invitation_role_eligibility() FROM PUBLIC, anon, authenticated;

COMMIT;
