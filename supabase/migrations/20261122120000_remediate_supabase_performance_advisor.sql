-- ==============================================================================
-- JK-PAYROLL (PAYPULSE) — MIGRATION: SUPABASE PERFORMANCE ADVISOR REMEDIATION
-- Migration: 20261122120000_remediate_supabase_performance_advisor.sql
--
-- Findings Addressed:
-- 1. auth_rls_initplan:
--    - organization_members.org_members_select_policy
--    - profiles.profiles_select_policy
--    - profiles.profiles_delete_policy
--    - profiles.profiles_update_policy
--    - profiles.profiles_insert_policy
--    - user_roles.user_roles_select_policy
--    - user_permissions.user_permissions_select_policy
--    Remediation: Wrap auth.uid() function calls in scalar subqueries `(SELECT auth.uid())`
--    to enable PostgreSQL query planner InitPlan optimization instead of row-by-row re-evaluation.
--    Introduce SECURITY DEFINER helper `public.get_profile_by_id()` for old-row profile inspections
--    to prevent PostgreSQL query rewriter infinite recursion during UPDATE evaluations.
--
-- 2. multiple_permissive_policies:
--    - modules.modules_mutate_policy
--    - modules.modules_read_policy
--    - module_actions.module_actions_mutate_policy
--    - module_actions.module_actions_read_policy
--    Remediation: Replace overlapping `FOR ALL` mutation policies on catalog tables
--    (modules, module_actions) with discrete, non-overlapping INSERT, UPDATE, and DELETE policies.
--    This leaves exactly one permissive policy per command (SELECT: modules_read_policy,
--    INSERT: modules_insert_policy, UPDATE: modules_update_policy, DELETE: modules_delete_policy)
--    and eliminates redundant evaluation of is_super_admin() on SELECT queries.
--
-- 3. duplicate_index:
--    - organizations.organizations_slug_key
--    - organizations.uq_organizations_slug
--    Remediation: Drop the redundant constraint `uq_organizations_slug` (and its supporting index),
--    preserving the primary `organizations_slug_key` unique constraint.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DUPLICATE INDEX REMEDIATION (Finding 3)
-- ------------------------------------------------------------------------------
-- Drop redundant constraint and its backing index on organizations(slug).
-- Canonical unique constraint `organizations_slug_key` remains intact.
ALTER TABLE public.organizations
    DROP CONSTRAINT IF EXISTS uq_organizations_slug;

-- Also ensure no standalone redundant index remains if created independently
DROP INDEX IF EXISTS public.uq_organizations_slug;

-- ------------------------------------------------------------------------------
-- 2. PROFILE SECURITY HELPER (Anti-Recursion for RLS UPDATE)
-- ------------------------------------------------------------------------------
-- Provides trusted access to old-row profile values during RLS WITH CHECK validation,
-- avoiding nested RLS rewrite re-entry on public.profiles.
CREATE OR REPLACE FUNCTION public.get_profile_by_id(p_id UUID)
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT * FROM public.profiles WHERE id = p_id LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_profile_by_id(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_by_id(UUID) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. AUTH_RLS_INITPLAN OPTIMIZATION (Finding 1)
-- ------------------------------------------------------------------------------

-- 3.1 organization_members.org_members_select_policy
DROP POLICY IF EXISTS org_members_select_policy ON public.organization_members;
CREATE POLICY org_members_select_policy ON public.organization_members
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR user_id = (SELECT auth.uid())
        OR public.is_organization_admin(organization_id)
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_member(organization_id)
        )
    );

-- 3.2 profiles.profiles_select_policy
DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
CREATE POLICY profiles_select_policy ON public.profiles
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR id = (SELECT auth.uid())
        OR organization_id = public.current_user_organization_id()
        OR public.is_organization_member(organization_id)
    );

-- 3.3 profiles.profiles_delete_policy
DROP POLICY IF EXISTS profiles_delete_policy ON public.profiles;
CREATE POLICY profiles_delete_policy ON public.profiles
    FOR DELETE TO authenticated
    USING (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id)
            AND is_super_admin = false
            AND id <> (SELECT auth.uid())
        )
    );

-- 3.4 profiles.profiles_insert_policy
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;
CREATE POLICY profiles_insert_policy ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR (
            id = (SELECT auth.uid())
            AND organization_id IS NULL
            AND department_id IS NULL
            AND is_super_admin = false
            AND is_organization_admin = false
        )
        OR (
            organization_id IS NOT NULL
            AND organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id)
            AND is_super_admin = false
            AND is_organization_admin = false
            AND EXISTS (
                SELECT 1 FROM public.organization_members om
                WHERE om.user_id = public.profiles.id
                  AND om.organization_id = public.profiles.organization_id
                  AND om.is_active = true
            )
            AND (
                department_id IS NULL
                OR EXISTS (
                    SELECT 1 FROM public.departments d
                    WHERE d.id = public.profiles.department_id
                      AND d.organization_id = public.profiles.organization_id
                )
            )
        )
    );

-- 3.5 profiles.profiles_update_policy
DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
CREATE POLICY profiles_update_policy ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        -- Self-update: Caller must be updating their own record AND must currently be ACTIVE
        OR (
            id = (SELECT auth.uid())
            AND (SELECT (p).is_active FROM public.get_profile_by_id((SELECT auth.uid())) p) = true
        )
        -- Org admin update: Org admin in current organization
        OR (
            organization_id = public.current_user_organization_id() 
            AND public.is_organization_admin(organization_id)
        )
    )
    WITH CHECK (
        public.is_super_admin()
        -- Self-update restrictions:
        -- User cannot alter security-sensitive provisioning fields
        OR (
            id = (SELECT auth.uid())
            AND is_super_admin = (SELECT (p).is_super_admin FROM public.get_profile_by_id((SELECT auth.uid())) p)
            AND is_organization_admin = (SELECT (p).is_organization_admin FROM public.get_profile_by_id((SELECT auth.uid())) p)
            AND is_active = (SELECT (p).is_active FROM public.get_profile_by_id((SELECT auth.uid())) p)
            AND (organization_id IS NOT DISTINCT FROM (SELECT (p).organization_id FROM public.get_profile_by_id((SELECT auth.uid())) p))
            AND (department_id IS NOT DISTINCT FROM (SELECT (p).department_id FROM public.get_profile_by_id((SELECT auth.uid())) p))
        )
        -- Org admin update restrictions:
        -- Org admin cannot promote to super admin or to is_organization_admin via profile
        -- Cannot reassign profile to another organization
        -- Department must be within the same organization
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id)
            AND is_super_admin = false
            AND is_organization_admin = (SELECT (p).is_organization_admin FROM public.get_profile_by_id(public.profiles.id) p)
            AND (organization_id IS NOT DISTINCT FROM (SELECT (p).organization_id FROM public.get_profile_by_id(public.profiles.id) p))
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

-- 3.6 user_roles.user_roles_select_policy
DROP POLICY IF EXISTS user_roles_select_policy ON public.user_roles;
CREATE POLICY user_roles_select_policy ON public.user_roles
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR user_id = (SELECT auth.uid())
        OR organization_id = public.current_user_organization_id()
        OR public.is_organization_member(organization_id)
    );

-- 3.7 user_permissions.user_permissions_select_policy
DROP POLICY IF EXISTS user_permissions_select_policy ON public.user_permissions;
CREATE POLICY user_permissions_select_policy ON public.user_permissions
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR user_id = (SELECT auth.uid())
        OR organization_id = public.current_user_organization_id()
        OR public.is_organization_member(organization_id)
    );

-- ------------------------------------------------------------------------------
-- 4. MULTIPLE PERMISSIVE POLICIES REMEDIATION (Finding 2)
-- ------------------------------------------------------------------------------
-- Drop overlapping `FOR ALL` policies on public.modules and public.module_actions.
-- Recreate mutation policies per command (INSERT, UPDATE, DELETE) restricted to superadmin.
-- Preserves existing `modules_read_policy` and `module_actions_read_policy` for SELECT.

-- 4.1 public.modules
DROP POLICY IF EXISTS modules_mutate_policy ON public.modules;
DROP POLICY IF EXISTS modules_insert_policy ON public.modules;
DROP POLICY IF EXISTS modules_update_policy ON public.modules;
DROP POLICY IF EXISTS modules_delete_policy ON public.modules;

CREATE POLICY modules_insert_policy ON public.modules
    FOR INSERT TO authenticated
    WITH CHECK (public.is_super_admin());

CREATE POLICY modules_update_policy ON public.modules
    FOR UPDATE TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY modules_delete_policy ON public.modules
    FOR DELETE TO authenticated
    USING (public.is_super_admin());

-- 4.2 public.module_actions
DROP POLICY IF EXISTS module_actions_mutate_policy ON public.module_actions;
DROP POLICY IF EXISTS module_actions_insert_policy ON public.module_actions;
DROP POLICY IF EXISTS module_actions_update_policy ON public.module_actions;
DROP POLICY IF EXISTS module_actions_delete_policy ON public.module_actions;

CREATE POLICY module_actions_insert_policy ON public.module_actions
    FOR INSERT TO authenticated
    WITH CHECK (public.is_super_admin());

CREATE POLICY module_actions_update_policy ON public.module_actions
    FOR UPDATE TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY module_actions_delete_policy ON public.module_actions
    FOR DELETE TO authenticated
    USING (public.is_super_admin());
