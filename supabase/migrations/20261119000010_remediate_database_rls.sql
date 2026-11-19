-- ==============================================================================
-- JK-PAYROLL: ROW-LEVEL SECURITY (RLS) & DATABASE ACCESS HARDENING
-- Migration: 20261119000010_remediate_database_rls.sql
-- Findings Remediated:
--   - SEC-FIND-07: Explicit authorization boundaries for service-role access
--   - SEC-FIND-13: Enable and enforce RLS on organization_members and payroll_runs
--   - SEC-FIND-14: Replace overly permissive FOR ALL policies with command-specific policies
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDENED HELPER FUNCTIONS (SECURITY DEFINER, SEARCH_PATH = PUBLIC)
-- ------------------------------------------------------------------------------

-- Get current authenticated user's organization ID safely with multiple fallbacks
CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND is_active = true LIMIT 1),
        (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true LIMIT 1),
        NULLIF(auth.jwt()->'app_metadata'->>'organization_id', '')::UUID
    );
$$;

-- Check if current user is Super Admin via profile or trusted JWT app_metadata
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() AND is_active = true),
        (auth.jwt()->'app_metadata'->>'role' = 'SUPER_ADMIN'),
        (auth.jwt()->'app_metadata'->>'role_name' = 'SUPER_ADMIN'),
        (auth.jwt()->'app_metadata'->>'role_name' = 'Platform Super Administrator'),
        false
    );
$$;

-- Check if current user is an Organization Admin / Owner for a specific organization
CREATE OR REPLACE FUNCTION public.is_organization_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        -- Super Admin has universal admin privileges across all organizations
        (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() AND is_active = true),
        (auth.jwt()->'app_metadata'->>'role' = 'SUPER_ADMIN'),
        -- Check profiles table organization_admin flag
        (SELECT is_organization_admin FROM public.profiles 
          WHERE id = auth.uid() AND organization_id = p_org_id AND is_active = true),
        -- Check organization_members table for owner flag or admin role
        EXISTS (
            SELECT 1 FROM public.organization_members om
            LEFT JOIN public.roles r ON om.role_id = r.id
            WHERE om.user_id = auth.uid()
              AND om.organization_id = p_org_id
              AND om.is_active = true
              AND (
                  om.is_owner = true 
                  OR UPPER(r.code) IN ('ADMIN', 'ORGANIZATION_ADMIN', 'ORG_ADMIN')
                  OR UPPER(r.name) IN ('ADMIN', 'ORGANIZATION ADMINISTRATOR', 'ORGANIZATION ADMIN')
              )
        ),
        false
    );
$$;

-- Check if current user is an active member of a specific organization
CREATE OR REPLACE FUNCTION public.is_organization_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        -- Super Admin is authorized for all organizations
        (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() AND is_active = true),
        (auth.jwt()->'app_metadata'->>'role' = 'SUPER_ADMIN'),
        -- Active profile in target organization
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.organization_id = p_org_id
              AND p.is_active = true
        ),
        -- Active membership record in organization_members
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = auth.uid()
              AND om.organization_id = p_org_id
              AND om.is_active = true
        ),
        false
    );
$$;

-- ------------------------------------------------------------------------------
-- 2. MANDATORY ROW LEVEL SECURITY ENFORCEMENT (SEC-FIND-13)
-- ------------------------------------------------------------------------------

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. DROP OVERLY PERMISSIVE 'FOR ALL' LEGACY POLICIES (SEC-FIND-14)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS organizations_access_policy ON public.organizations;
DROP POLICY IF EXISTS departments_access_policy ON public.departments;
DROP POLICY IF EXISTS profiles_access_policy ON public.profiles;
DROP POLICY IF EXISTS roles_access_policy ON public.roles;
DROP POLICY IF EXISTS user_roles_access_policy ON public.user_roles;
DROP POLICY IF EXISTS org_modules_access_policy ON public.organization_modules;
DROP POLICY IF EXISTS dept_modules_access_policy ON public.department_modules;
DROP POLICY IF EXISTS role_permissions_access_policy ON public.role_permissions;
DROP POLICY IF EXISTS user_permissions_access_policy ON public.user_permissions;
DROP POLICY IF EXISTS organization_members_access_policy ON public.organization_members;
DROP POLICY IF EXISTS payroll_runs_access_policy ON public.payroll_runs;

-- Drop any previous granular policies to ensure idempotent migration
DROP POLICY IF EXISTS organizations_select_policy ON public.organizations;
DROP POLICY IF EXISTS organizations_insert_policy ON public.organizations;
DROP POLICY IF EXISTS organizations_update_policy ON public.organizations;
DROP POLICY IF EXISTS organizations_delete_policy ON public.organizations;

DROP POLICY IF EXISTS org_members_select_policy ON public.organization_members;
DROP POLICY IF EXISTS org_members_insert_policy ON public.organization_members;
DROP POLICY IF EXISTS org_members_update_policy ON public.organization_members;
DROP POLICY IF EXISTS org_members_delete_policy ON public.organization_members;

DROP POLICY IF EXISTS departments_select_policy ON public.departments;
DROP POLICY IF EXISTS departments_insert_policy ON public.departments;
DROP POLICY IF EXISTS departments_update_policy ON public.departments;
DROP POLICY IF EXISTS departments_delete_policy ON public.departments;

DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_policy ON public.profiles;

DROP POLICY IF EXISTS roles_select_policy ON public.roles;
DROP POLICY IF EXISTS roles_insert_policy ON public.roles;
DROP POLICY IF EXISTS roles_update_policy ON public.roles;
DROP POLICY IF EXISTS roles_delete_policy ON public.roles;

DROP POLICY IF EXISTS user_roles_select_policy ON public.user_roles;
DROP POLICY IF EXISTS user_roles_insert_policy ON public.user_roles;
DROP POLICY IF EXISTS user_roles_update_policy ON public.user_roles;
DROP POLICY IF EXISTS user_roles_delete_policy ON public.user_roles;

DROP POLICY IF EXISTS org_modules_select_policy ON public.organization_modules;
DROP POLICY IF EXISTS org_modules_insert_policy ON public.organization_modules;
DROP POLICY IF EXISTS org_modules_update_policy ON public.organization_modules;
DROP POLICY IF EXISTS org_modules_delete_policy ON public.organization_modules;

DROP POLICY IF EXISTS dept_modules_select_policy ON public.department_modules;
DROP POLICY IF EXISTS dept_modules_insert_policy ON public.department_modules;
DROP POLICY IF EXISTS dept_modules_update_policy ON public.department_modules;
DROP POLICY IF EXISTS dept_modules_delete_policy ON public.department_modules;

DROP POLICY IF EXISTS role_permissions_select_policy ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_insert_policy ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_update_policy ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_delete_policy ON public.role_permissions;

DROP POLICY IF EXISTS user_permissions_select_policy ON public.user_permissions;
DROP POLICY IF EXISTS user_permissions_insert_policy ON public.user_permissions;
DROP POLICY IF EXISTS user_permissions_update_policy ON public.user_permissions;
DROP POLICY IF EXISTS user_permissions_delete_policy ON public.user_permissions;

DROP POLICY IF EXISTS payroll_runs_select_policy ON public.payroll_runs;
DROP POLICY IF EXISTS payroll_runs_insert_policy ON public.payroll_runs;
DROP POLICY IF EXISTS payroll_runs_update_policy ON public.payroll_runs;
DROP POLICY IF EXISTS payroll_runs_delete_policy ON public.payroll_runs;

DROP POLICY IF EXISTS modules_mutate_policy ON public.modules;
DROP POLICY IF EXISTS module_actions_mutate_policy ON public.module_actions;

-- ------------------------------------------------------------------------------
-- 4. GRANULAR COMMAND-SPECIFIC POLICIES (SEC-FIND-14 & SEC-FIND-13)
-- ------------------------------------------------------------------------------

-- 4.1 ORGANIZATIONS
CREATE POLICY organizations_select_policy ON public.organizations
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR (id = public.current_user_organization_id() AND is_active = true)
        OR (public.is_organization_member(id) AND is_active = true)
    );

CREATE POLICY organizations_insert_policy ON public.organizations
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
    );

CREATE POLICY organizations_update_policy ON public.organizations
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR (id = public.current_user_organization_id() AND public.is_organization_admin(id))
    )
    WITH CHECK (
        public.is_super_admin()
        OR (id = public.current_user_organization_id() AND public.is_organization_admin(id))
    );

CREATE POLICY organizations_delete_policy ON public.organizations
    FOR DELETE TO authenticated
    USING (
        public.is_super_admin()
    );

-- 4.2 ORGANIZATION_MEMBERS (SEC-FIND-13)
CREATE POLICY org_members_select_policy ON public.organization_members
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR user_id = auth.uid()
        OR public.is_organization_admin(organization_id)
        OR (organization_id = public.current_user_organization_id() AND public.is_organization_member(organization_id))
    );

CREATE POLICY org_members_insert_policy ON public.organization_members
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR (organization_id = public.current_user_organization_id() AND public.is_organization_admin(organization_id))
    );

CREATE POLICY org_members_update_policy ON public.organization_members
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR (organization_id = public.current_user_organization_id() AND public.is_organization_admin(organization_id))
    )
    WITH CHECK (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id() 
            AND public.is_organization_admin(organization_id)
            AND (is_owner IS FALSE OR public.is_super_admin() OR EXISTS (
                SELECT 1 FROM public.organization_members om
                WHERE om.user_id = auth.uid() 
                  AND om.organization_id = public.organization_members.organization_id 
                  AND om.is_owner = true
            ))
        )
    );

CREATE POLICY org_members_delete_policy ON public.organization_members
    FOR DELETE TO authenticated
    USING (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id)
            AND (is_owner IS FALSE OR public.is_super_admin())
        )
    );

-- 4.3 DEPARTMENTS
CREATE POLICY departments_select_policy ON public.departments
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR (organization_id = public.current_user_organization_id() AND is_active = true)
        OR (public.is_organization_member(organization_id) AND is_active = true)
    );

CREATE POLICY departments_insert_policy ON public.departments
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR (organization_id = public.current_user_organization_id() AND public.is_organization_admin(organization_id))
    );

CREATE POLICY departments_update_policy ON public.departments
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR (organization_id = public.current_user_organization_id() AND public.is_organization_admin(organization_id))
    )
    WITH CHECK (
        public.is_super_admin()
        OR (organization_id = public.current_user_organization_id() AND public.is_organization_admin(organization_id))
    );

CREATE POLICY departments_delete_policy ON public.departments
    FOR DELETE TO authenticated
    USING (
        public.is_super_admin()
        OR (organization_id = public.current_user_organization_id() AND public.is_organization_admin(organization_id))
    );

-- 4.4 PROFILES
CREATE POLICY profiles_select_policy ON public.profiles
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR id = auth.uid()
        OR organization_id = public.current_user_organization_id()
        OR public.is_organization_member(organization_id)
    );

CREATE POLICY profiles_insert_policy ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR (id = auth.uid() AND is_super_admin = false)
        OR (
            organization_id = public.current_user_organization_id() 
            AND public.is_organization_admin(organization_id) 
            AND is_super_admin = false
        )
    );

CREATE POLICY profiles_update_policy ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR id = auth.uid()
        OR (organization_id = public.current_user_organization_id() AND public.is_organization_admin(organization_id))
    )
    WITH CHECK (
        public.is_super_admin()
        -- Self-update: cannot escalate privileges or mutate organization_id
        OR (
            id = auth.uid()
            AND is_super_admin = (SELECT p.is_super_admin FROM public.profiles p WHERE p.id = auth.uid())
            AND is_organization_admin = (SELECT p.is_organization_admin FROM public.profiles p WHERE p.id = auth.uid())
            AND (organization_id IS NOT DISTINCT FROM (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()))
        )
        -- Org admin update: cannot escalate anyone to super admin, must remain within organization
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id)
            AND is_super_admin = false
        )
    );

CREATE POLICY profiles_delete_policy ON public.profiles
    FOR DELETE TO authenticated
    USING (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id)
            AND is_super_admin = false
            AND id <> auth.uid()
        )
    );

-- 4.5 ROLES
CREATE POLICY roles_select_policy ON public.roles
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR organization_id IS NULL
        OR organization_id = public.current_user_organization_id()
        OR public.is_organization_member(organization_id)
    );

CREATE POLICY roles_insert_policy ON public.roles
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR (
            organization_id IS NOT NULL 
            AND organization_id = public.current_user_organization_id() 
            AND public.is_organization_admin(organization_id)
            AND role_type = 'CUSTOM'
        )
    );

CREATE POLICY roles_update_policy ON public.roles
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR (
            organization_id IS NOT NULL 
            AND organization_id = public.current_user_organization_id() 
            AND public.is_organization_admin(organization_id)
            AND role_type = 'CUSTOM'
            AND is_mutable = true
        )
    )
    WITH CHECK (
        public.is_super_admin()
        OR (
            organization_id IS NOT NULL 
            AND organization_id = public.current_user_organization_id() 
            AND public.is_organization_admin(organization_id)
            AND role_type = 'CUSTOM'
        )
    );

CREATE POLICY roles_delete_policy ON public.roles
    FOR DELETE TO authenticated
    USING (
        public.is_super_admin()
        OR (
            organization_id IS NOT NULL 
            AND organization_id = public.current_user_organization_id() 
            AND public.is_organization_admin(organization_id)
            AND role_type = 'CUSTOM'
            AND is_mutable = true
        )
    );

-- 4.6 USER_ROLES
CREATE POLICY user_roles_select_policy ON public.user_roles
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR user_id = auth.uid()
        OR organization_id = public.current_user_organization_id()
        OR public.is_organization_member(organization_id)
    );

CREATE POLICY user_roles_insert_policy ON public.user_roles
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id() 
            AND public.is_organization_admin(organization_id)
        )
    );

CREATE POLICY user_roles_update_policy ON public.user_roles
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id() 
            AND public.is_organization_admin(organization_id)
        )
    )
    WITH CHECK (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id() 
            AND public.is_organization_admin(organization_id)
        )
    );

CREATE POLICY user_roles_delete_policy ON public.user_roles
    FOR DELETE TO authenticated
    USING (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id() 
            AND public.is_organization_admin(organization_id)
        )
    );

-- 4.7 ORGANIZATION_MODULES
CREATE POLICY org_modules_select_policy ON public.organization_modules
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR organization_id = public.current_user_organization_id()
        OR public.is_organization_member(organization_id)
    );

CREATE POLICY org_modules_insert_policy ON public.organization_modules
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
    );

CREATE POLICY org_modules_update_policy ON public.organization_modules
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
    )
    WITH CHECK (
        public.is_super_admin()
    );

CREATE POLICY org_modules_delete_policy ON public.organization_modules
    FOR DELETE TO authenticated
    USING (
        public.is_super_admin()
    );

-- 4.8 DEPARTMENT_MODULES
CREATE POLICY dept_modules_select_policy ON public.department_modules
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR organization_id = public.current_user_organization_id()
        OR public.is_organization_member(organization_id)
    );

CREATE POLICY dept_modules_insert_policy ON public.department_modules
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id)
        )
    );

CREATE POLICY dept_modules_update_policy ON public.department_modules
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id)
        )
    )
    WITH CHECK (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id)
        )
    );

CREATE POLICY dept_modules_delete_policy ON public.department_modules
    FOR DELETE TO authenticated
    USING (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id)
        )
    );

-- 4.9 ROLE_PERMISSIONS
CREATE POLICY role_permissions_select_policy ON public.role_permissions
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR organization_id = public.current_user_organization_id()
        OR public.is_organization_member(organization_id)
    );

CREATE POLICY role_permissions_insert_policy ON public.role_permissions
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id)
        )
    );

CREATE POLICY role_permissions_update_policy ON public.role_permissions
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id)
        )
    )
    WITH CHECK (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id)
        )
    );

CREATE POLICY role_permissions_delete_policy ON public.role_permissions
    FOR DELETE TO authenticated
    USING (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id)
        )
    );

-- 4.10 USER_PERMISSIONS
CREATE POLICY user_permissions_select_policy ON public.user_permissions
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR user_id = auth.uid()
        OR organization_id = public.current_user_organization_id()
        OR public.is_organization_member(organization_id)
    );

CREATE POLICY user_permissions_insert_policy ON public.user_permissions
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id)
        )
    );

CREATE POLICY user_permissions_update_policy ON public.user_permissions
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id)
        )
    )
    WITH CHECK (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id)
        )
    );

CREATE POLICY user_permissions_delete_policy ON public.user_permissions
    FOR DELETE TO authenticated
    USING (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id)
        )
    );

-- 4.11 PAYROLL_RUNS (ISOLATION FOR SENSITIVE TRANSACTION TABLE)
CREATE POLICY payroll_runs_select_policy ON public.payroll_runs
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR (organization_id = public.current_user_organization_id() AND public.is_organization_admin(organization_id))
    );

CREATE POLICY payroll_runs_insert_policy ON public.payroll_runs
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR (organization_id = public.current_user_organization_id() AND public.is_organization_admin(organization_id))
    );

CREATE POLICY payroll_runs_update_policy ON public.payroll_runs
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR (organization_id = public.current_user_organization_id() AND public.is_organization_admin(organization_id))
    )
    WITH CHECK (
        public.is_super_admin()
        OR (organization_id = public.current_user_organization_id() AND public.is_organization_admin(organization_id))
    );

CREATE POLICY payroll_runs_delete_policy ON public.payroll_runs
    FOR DELETE TO authenticated
    USING (
        public.is_super_admin()
        OR (organization_id = public.current_user_organization_id() AND public.is_organization_admin(organization_id))
    );

-- 4.12 CATALOG TABLES (MODULES & ACTIONS) MUTATION LOCKDOWN
CREATE POLICY modules_mutate_policy ON public.modules
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY module_actions_mutate_policy ON public.module_actions
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 5. PERMISSIONS & ROLE GRANTS
-- ------------------------------------------------------------------------------

-- Ensure schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Revoke all table mutations from anonymous public
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Grant standard CRUD privileges to authenticated role (governed strictly by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
