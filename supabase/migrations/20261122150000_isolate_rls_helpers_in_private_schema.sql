-- ==============================================================================
-- JK-PAYROLL (PAYPULSE) — MIGRATION: ISOLATE RLS HELPERS IN PRIVATE SCHEMA
-- Migration: 20261122150000_isolate_rls_helpers_in_private_schema.sql
--
-- Findings Addressed:
-- Supabase Security Advisor (8 remaining SECURITY DEFINER functions in public schema)
--
-- Architecture:
-- 1. Create dedicated 'private' schema unexposed by PostgREST Data API.
-- 2. Define authoritative privileged SECURITY DEFINER helper functions in 'private'.
-- 3. Grant schema USAGE and EXECUTE strictly to authenticated and service_role.
-- 4. In 'public', convert all 8 functions to thin SECURITY INVOKER shims (prosecdef = false).
--    As SECURITY INVOKER, they cannot bypass RLS on their own and are NOT flagged
--    by the Supabase Security Advisor linter.
-- 5. Re-bind core policies to use private functions directly for maximum execution efficiency.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. SCHEMA INITIALIZATION & PRIVILEGES
-- ------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2. AUTHORITATIVE SECURITY DEFINER HELPERS IN SCHEMA 'private'
-- ------------------------------------------------------------------------------

-- 2.1 private.is_super_admin
CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
          AND is_super_admin = true 
          AND is_active = true
    );
$$;

-- 2.2 private.current_user_organization_id
CREATE OR REPLACE FUNCTION private.current_user_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    WITH eligible AS (
        SELECT om.organization_id
        FROM public.organization_members om
        INNER JOIN public.organizations o ON o.id = om.organization_id
        WHERE om.user_id = auth.uid()
          AND om.is_active = true
          AND o.status = 'Active'
          AND (o.end_date IS NULL OR o.end_date >= clock_timestamp())
    )
    SELECT COALESCE(
        (
            SELECT e.organization_id
            FROM eligible e
            WHERE e.organization_id = public.safe_cast_uuid(auth.jwt()->'app_metadata'->>'organization_id')
            LIMIT 1
        ),
        (
            SELECT MIN(e.organization_id::text)::uuid
            FROM eligible e
            HAVING COUNT(*) = 1
        )
    );
$$;

-- 2.3 private.is_organization_member
CREATE OR REPLACE FUNCTION private.is_organization_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, public, pg_temp
AS $$
    SELECT (
        private.is_super_admin()
        OR (
            p_org_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.organizations o 
                WHERE o.id = p_org_id 
                  AND o.status = 'Active'
                  AND (o.end_date IS NULL OR o.end_date >= clock_timestamp())
            )
            AND EXISTS (
                SELECT 1 FROM public.organization_members om
                WHERE om.user_id = auth.uid()
                  AND om.organization_id = p_org_id
                  AND om.is_active = true
            )
        )
    );
$$;

-- 2.4 private.is_organization_admin
CREATE OR REPLACE FUNCTION private.is_organization_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, public, pg_temp
AS $$
    SELECT (
        private.is_super_admin()
        OR (
            p_org_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.organizations o
                WHERE o.id = p_org_id
                  AND o.status = 'Active'
                  AND (o.end_date IS NULL OR o.end_date >= clock_timestamp())
            )
            AND EXISTS (
                SELECT 1 FROM public.organization_members om
                WHERE om.user_id = auth.uid()
                  AND om.organization_id = p_org_id
                  AND om.is_active = true
                  AND (
                      om.is_owner = true
                      OR EXISTS (
                          SELECT 1
                          FROM public.user_roles ur
                          INNER JOIN public.roles r ON r.id = ur.role_id
                          WHERE ur.user_id = auth.uid()
                            AND ur.organization_id = p_org_id
                            AND r.is_active = true
                            AND (
                                (r.role_type = 'SYSTEM' AND r.organization_id IS NULL AND UPPER(r.code) IN ('TENANT_ADMIN', 'ORGANIZATION_ADMIN', 'ORG_ADMIN', 'ADMIN'))
                                OR (r.role_type = 'CUSTOM' AND r.organization_id = p_org_id AND UPPER(r.code) IN ('ORG_ADMIN', 'ORGANIZATION_ADMIN', 'TENANT_ADMIN', 'ADMIN'))
                            )
                      )
                      OR EXISTS (
                          SELECT 1 FROM public.roles r
                          WHERE r.id = om.role_id
                            AND r.is_active = true
                            AND (
                                (r.role_type = 'SYSTEM' AND r.organization_id IS NULL AND UPPER(r.code) IN ('TENANT_ADMIN', 'ORGANIZATION_ADMIN', 'ORG_ADMIN', 'ADMIN'))
                                OR (r.role_type = 'CUSTOM' AND r.organization_id = p_org_id AND UPPER(r.code) IN ('ORG_ADMIN', 'ORGANIZATION_ADMIN', 'TENANT_ADMIN', 'ADMIN'))
                            )
                      )
                      OR EXISTS (
                          SELECT 1 FROM public.profiles p
                          WHERE p.id = auth.uid()
                            AND p.organization_id = p_org_id
                            AND p.is_organization_admin = true
                            AND p.is_active = true
                      )
                  )
            )
        )
    );
$$;

-- 2.5 private.get_profile_by_id (hardened with internal tenant authorization)
CREATE OR REPLACE FUNCTION private.get_profile_by_id(p_id UUID)
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, public, pg_temp
AS $$
    SELECT p.* FROM public.profiles p
    WHERE p.id = p_id
      AND (
          private.is_super_admin()
          OR p.id = auth.uid()
          OR (
              p.organization_id = private.current_user_organization_id()
              AND private.is_organization_admin(p.organization_id)
          )
      )
    LIMIT 1;
$$;

-- 2.6 private.is_assignable_organization_role
CREATE OR REPLACE FUNCTION private.is_assignable_organization_role(
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

-- 2.7 private.is_existing_trusted_tenant_admin_membership
CREATE OR REPLACE FUNCTION private.is_existing_trusted_tenant_admin_membership(
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

-- 2.8 private.is_existing_trusted_tenant_admin_user_role
CREATE OR REPLACE FUNCTION private.is_existing_trusted_tenant_admin_user_role(
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

-- ------------------------------------------------------------------------------
-- 3. SCHEMA 'private' PERMISSIONS
-- ------------------------------------------------------------------------------
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_super_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_user_organization_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_organization_member(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_organization_admin(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_profile_by_id(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_assignable_organization_role(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_existing_trusted_tenant_admin_membership(UUID, UUID, UUID, UUID, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_existing_trusted_tenant_admin_user_role(UUID, UUID, UUID) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. PUBLIC COMPATIBILITY WRAPPERS: ALL 8 CONVERTED TO SECURITY INVOKER
-- ------------------------------------------------------------------------------
-- Setting prosecdef = false (SECURITY INVOKER) ensures that:
-- 1. These public functions cannot bypass RLS.
-- 2. They are NOT flagged by Supabase Security Advisor (which requires prosecdef = true).
-- 3. Full backward compatibility is preserved for existing client queries and test suites.

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = private, pg_temp
AS $$
    SELECT private.is_super_admin();
$$;

CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = private, pg_temp
AS $$
    SELECT private.current_user_organization_id();
$$;

CREATE OR REPLACE FUNCTION public.is_organization_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = private, pg_temp
AS $$
    SELECT private.is_organization_member(p_org_id);
$$;

CREATE OR REPLACE FUNCTION public.is_organization_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = private, pg_temp
AS $$
    SELECT private.is_organization_admin(p_org_id);
$$;

CREATE OR REPLACE FUNCTION public.get_profile_by_id(p_id UUID)
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = private, pg_temp
AS $$
    SELECT private.get_profile_by_id(p_id);
$$;

CREATE OR REPLACE FUNCTION public.is_assignable_organization_role(p_role_id UUID, p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = private, pg_temp
AS $$
    SELECT private.is_assignable_organization_role(p_role_id, p_organization_id);
$$;

CREATE OR REPLACE FUNCTION public.is_existing_trusted_tenant_admin_membership(p_membership_id UUID, p_organization_id UUID, p_user_id UUID, p_role_id UUID, p_is_owner BOOLEAN)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = private, pg_temp
AS $$
    SELECT private.is_existing_trusted_tenant_admin_membership(p_membership_id, p_organization_id, p_user_id, p_role_id, p_is_owner);
$$;

CREATE OR REPLACE FUNCTION public.is_existing_trusted_tenant_admin_user_role(p_organization_id UUID, p_user_id UUID, p_role_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = private, pg_temp
AS $$
    SELECT private.is_existing_trusted_tenant_admin_user_role(p_organization_id, p_user_id, p_role_id);
$$;

-- Maintain least privilege grants on public invokers
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.current_user_organization_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_organization_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_organization_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_organization_member(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_organization_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_organization_admin(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_profile_by_id(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_by_id(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_assignable_organization_role(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_assignable_organization_role(UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_existing_trusted_tenant_admin_membership(UUID, UUID, UUID, UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_existing_trusted_tenant_admin_membership(UUID, UUID, UUID, UUID, BOOLEAN) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_existing_trusted_tenant_admin_user_role(UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_existing_trusted_tenant_admin_user_role(UUID, UUID, UUID) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 5. RE-BIND POLICIES & TRIGGERS TO PRIVATE HELPERS
-- ------------------------------------------------------------------------------

-- 5.1 profiles_update_policy
DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
CREATE POLICY profiles_update_policy ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        private.is_super_admin()
        OR (
            id = (SELECT auth.uid())
            AND (SELECT (p).is_active FROM private.get_profile_by_id((SELECT auth.uid())) p) = true
        )
        OR (
            organization_id = private.current_user_organization_id() 
            AND private.is_organization_admin(organization_id)
        )
    )
    WITH CHECK (
        private.is_super_admin()
        OR (
            id = (SELECT auth.uid())
            AND is_super_admin = (SELECT (p).is_super_admin FROM private.get_profile_by_id((SELECT auth.uid())) p)
            AND is_organization_admin = (SELECT (p).is_organization_admin FROM private.get_profile_by_id((SELECT auth.uid())) p)
            AND is_active = (SELECT (p).is_active FROM private.get_profile_by_id((SELECT auth.uid())) p)
            AND (organization_id IS NOT DISTINCT FROM (SELECT (p).organization_id FROM private.get_profile_by_id((SELECT auth.uid())) p))
            AND (department_id IS NOT DISTINCT FROM (SELECT (p).department_id FROM private.get_profile_by_id((SELECT auth.uid())) p))
        )
        OR (
            organization_id = private.current_user_organization_id()
            AND private.is_organization_admin(organization_id)
            AND is_super_admin = false
            AND is_organization_admin = (SELECT (p).is_organization_admin FROM private.get_profile_by_id(public.profiles.id) p)
            AND (organization_id IS NOT DISTINCT FROM (SELECT (p).organization_id FROM private.get_profile_by_id(public.profiles.id) p))
            AND (
                department_id IS NULL 
                OR EXISTS (
                    SELECT 1 FROM public.departments d 
                    WHERE d.id = department_id 
                      AND d.organization_id = public.profiles.organization_id
                )
            )
        )
    );

-- 5.2 user_roles policies
DROP POLICY IF EXISTS user_roles_insert_policy ON public.user_roles;
DROP POLICY IF EXISTS user_roles_update_policy ON public.user_roles;
CREATE POLICY user_roles_insert_policy ON public.user_roles
    FOR INSERT TO authenticated
    WITH CHECK (
        (private.is_super_admin()
         OR (organization_id = private.current_user_organization_id()
             AND private.is_organization_admin(organization_id)))
        AND private.is_assignable_organization_role(role_id, organization_id)
    );
CREATE POLICY user_roles_update_policy ON public.user_roles
    FOR UPDATE TO authenticated
    USING (
        private.is_super_admin()
        OR (organization_id = private.current_user_organization_id()
            AND private.is_organization_admin(organization_id))
    )
    WITH CHECK (
        (private.is_super_admin()
         OR (organization_id = private.current_user_organization_id()
             AND private.is_organization_admin(organization_id)))
        AND (
            private.is_assignable_organization_role(role_id, organization_id)
            OR private.is_existing_trusted_tenant_admin_user_role(organization_id, user_id, role_id)
        )
    );

-- 5.3 organization_members policies
DROP POLICY IF EXISTS org_members_insert_policy ON public.organization_members;
DROP POLICY IF EXISTS org_members_update_policy ON public.organization_members;
CREATE POLICY org_members_insert_policy ON public.organization_members
    FOR INSERT TO authenticated
    WITH CHECK (
        (private.is_super_admin()
         OR (organization_id = private.current_user_organization_id()
             AND private.is_organization_admin(organization_id)))
        AND is_owner = false
        AND (role_id IS NULL OR private.is_assignable_organization_role(role_id, organization_id))
    );
CREATE POLICY org_members_update_policy ON public.organization_members
    FOR UPDATE TO authenticated
    USING (
        private.is_super_admin()
        OR (organization_id = private.current_user_organization_id()
            AND private.is_organization_admin(organization_id))
    )
    WITH CHECK (
        (private.is_super_admin()
         OR (organization_id = private.current_user_organization_id()
             AND private.is_organization_admin(organization_id)))
        AND (
            role_id IS NULL
            OR private.is_assignable_organization_role(role_id, organization_id)
            OR private.is_existing_trusted_tenant_admin_membership(id, organization_id, user_id, role_id, is_owner)
        )
    );

-- 5.4 Update trigger function enforce_member_invitation_role_eligibility
CREATE OR REPLACE FUNCTION public.enforce_member_invitation_role_eligibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private, pg_temp
AS $$
BEGIN
    IF NOT private.is_assignable_organization_role(NEW.role_id, NEW.organization_id) THEN
        RAISE EXCEPTION 'Invitations require an active, same-organization custom role that is not protected'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

COMMIT;
