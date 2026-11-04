-- ==============================================================================
-- JK-PAYROLL: RENAME TENANTS -> ORGANIZATIONS & ROLES TABLE v2
-- Migration: 20261104000002_organizations_rename_and_roles_v2.sql
--
-- 1. Renames public.tenants            -> public.organizations
--    Renames public.tenant_modules     -> public.organization_modules
--    Renames every tenant_id column    -> organization_id
--    Renames profiles.is_tenant_admin  -> is_organization_admin
-- 2. Recreates RLS policies / functions that referenced the old names
-- 3. Upgrades public.roles: role_type enum, is_default, is_mutable,
--    nullable organization_id (NULL = global SYSTEM role)
-- Requires PostgreSQL 15+ (UNIQUE NULLS NOT DISTINCT).
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. TABLE & COLUMN RENAMES
-- ------------------------------------------------------------------------------
ALTER TABLE public.tenants        RENAME TO organizations;
ALTER TABLE public.tenant_modules RENAME TO organization_modules;

ALTER TABLE public.departments            RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE public.profiles               RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE public.roles                  RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE public.user_roles             RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE public.organization_modules   RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE public.department_modules     RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE public.role_permissions       RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE public.user_permissions       RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE public.leave_types            RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE public.leave_requests         RENAME COLUMN tenant_id TO organization_id;

ALTER TABLE public.profiles RENAME COLUMN is_tenant_admin TO is_organization_admin;

-- Constraint / index / trigger names (cosmetic but keeps the catalog consistent)
ALTER INDEX IF EXISTS idx_tenants_code             RENAME TO idx_organizations_code;
ALTER INDEX IF EXISTS idx_tenants_is_active        RENAME TO idx_organizations_is_active;
ALTER INDEX IF EXISTS idx_departments_tenant       RENAME TO idx_departments_organization;
ALTER INDEX IF EXISTS idx_departments_active       RENAME TO idx_departments_org_active;
ALTER INDEX IF EXISTS idx_profiles_tenant          RENAME TO idx_profiles_organization;
ALTER INDEX IF EXISTS idx_roles_tenant             RENAME TO idx_roles_organization;
ALTER INDEX IF EXISTS idx_user_roles_tenant_user   RENAME TO idx_user_roles_org_user;

ALTER TABLE public.departments RENAME CONSTRAINT uq_departments_tenant_code TO uq_departments_organization_code;
ALTER TRIGGER trg_tenants_updated_at ON public.organizations RENAME TO trg_organizations_updated_at;

-- ------------------------------------------------------------------------------
-- 2. FUNCTIONS (parameter / column names changed -> must be dropped & recreated)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.current_user_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_sub_department_ids(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_ancestor_department_ids(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_user_effective_permissions(UUID, UUID);

CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organization_id
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_sub_department_ids(
    p_organization_id UUID,
    p_root_dept_id UUID
)
RETURNS TABLE (department_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH RECURSIVE dept_tree AS (
        SELECT d.id AS department_id, ARRAY[d.id] AS visited
        FROM public.departments d
        WHERE d.organization_id = p_organization_id
          AND d.id = p_root_dept_id
          AND d.is_active = true

        UNION ALL

        SELECT child.id AS department_id, parent.visited || child.id AS visited
        FROM public.departments child
        INNER JOIN dept_tree parent ON child.parent_department_id = parent.department_id
        WHERE child.organization_id = p_organization_id
          AND child.is_active = true
          AND NOT (child.id = ANY(parent.visited))
    )
    SELECT department_id FROM dept_tree;
$$;

CREATE OR REPLACE FUNCTION public.get_ancestor_department_ids(
    p_organization_id UUID,
    p_dept_id UUID
)
RETURNS TABLE (department_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH RECURSIVE dept_ancestors AS (
        SELECT d.id AS department_id, d.parent_department_id, ARRAY[d.id] AS visited
        FROM public.departments d
        WHERE d.organization_id = p_organization_id
          AND d.id = p_dept_id
          AND d.is_active = true

        UNION ALL

        SELECT parent.id AS department_id, parent.parent_department_id, curr.visited || parent.id AS visited
        FROM public.departments parent
        INNER JOIN dept_ancestors curr ON curr.parent_department_id = parent.id
        WHERE parent.organization_id = p_organization_id
          AND parent.is_active = true
          AND NOT (parent.id = ANY(curr.visited))
    )
    SELECT department_id FROM dept_ancestors;
$$;

CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(
    p_organization_id UUID,
    p_user_id UUID
)
RETURNS TEXT[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_dept_id UUID;
    v_user_active BOOLEAN;
    v_org_active BOOLEAN;
    v_effective_keys TEXT[];
BEGIN
    SELECT p.department_id, p.is_active, o.is_active
    INTO v_dept_id, v_user_active, v_org_active
    FROM public.profiles p
    INNER JOIN public.organizations o ON o.id = p.organization_id
    WHERE p.id = p_user_id
      AND p.organization_id = p_organization_id;

    IF NOT FOUND OR NOT v_user_active OR NOT v_org_active THEN
        RETURN ARRAY[]::TEXT[];
    END IF;

    IF v_dept_id IS NULL THEN
        RETURN ARRAY[]::TEXT[];
    END IF;

    WITH eligible_modules AS (
        SELECT DISTINCT dm.module_id
        FROM public.department_modules dm
        INNER JOIN public.organization_modules om
            ON om.organization_id = p_organization_id
           AND om.module_id = dm.module_id
        INNER JOIN public.get_ancestor_department_ids(p_organization_id, v_dept_id) anc
            ON anc.department_id = dm.department_id
        WHERE dm.organization_id = p_organization_id
    ),
    direct_user_actions AS (
        SELECT ma.id AS action_id, ma.module_id, ma.action, ma.full_key
        FROM public.user_permissions up
        INNER JOIN public.module_actions ma ON ma.id = up.module_action_id
        INNER JOIN eligible_modules em ON em.module_id = ma.module_id
        WHERE up.organization_id = p_organization_id
          AND up.user_id = p_user_id
    ),
    role_user_actions AS (
        SELECT ma.id AS action_id, ma.module_id, ma.action, ma.full_key
        FROM public.user_roles ur
        INNER JOIN public.role_permissions rp
            ON rp.role_id = ur.role_id
           AND rp.organization_id = p_organization_id
        INNER JOIN public.module_actions ma ON ma.id = rp.module_action_id
        INNER JOIN eligible_modules em ON em.module_id = ma.module_id
        INNER JOIN public.roles r
            ON r.id = ur.role_id
           AND (r.organization_id = p_organization_id OR r.organization_id IS NULL)
           AND r.is_active = true
        WHERE ur.organization_id = p_organization_id
          AND ur.user_id = p_user_id
    ),
    candidate_actions AS (
        SELECT * FROM direct_user_actions
        WHERE EXISTS (SELECT 1 FROM direct_user_actions)

        UNION ALL

        SELECT * FROM role_user_actions
        WHERE NOT EXISTS (SELECT 1 FROM direct_user_actions)
    ),
    expanded_keys AS (
        SELECT full_key FROM candidate_actions

        UNION

        SELECT view_ma.full_key
        FROM candidate_actions ca
        INNER JOIN public.module_actions view_ma
            ON view_ma.module_id = ca.module_id
           AND view_ma.action = 'View'
        WHERE ca.action IN ('Add', 'Edit', 'Delete', 'Approval.Create')
    )
    SELECT COALESCE(array_agg(DISTINCT full_key), ARRAY[]::TEXT[])
    INTO v_effective_keys
    FROM expanded_keys;

    RETURN v_effective_keys;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. ROLES v2
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
        CREATE TYPE role_type AS ENUM (
            'SYSTEM',     -- Managed by the platform, read-only for organizations
            'CUSTOM'      -- Created and modified by organization admins
        );
    END IF;
END $$;

-- Global SYSTEM roles have no owning organization
ALTER TABLE public.roles ALTER COLUMN organization_id DROP NOT NULL;

ALTER TABLE public.roles
    ADD COLUMN IF NOT EXISTS role_type  role_type NOT NULL DEFAULT 'SYSTEM',
    ADD COLUMN IF NOT EXISTS is_default BOOLEAN   NOT NULL DEFAULT FALSE,  -- Auto-assigned to new invites
    ADD COLUMN IF NOT EXISTS is_mutable BOOLEAN   NOT NULL DEFAULT TRUE;   -- FALSE for root roles to prevent lockout

-- Prevent duplicate codes within an organization AND among global system roles
ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS uq_roles_tenant_code;
ALTER TABLE public.roles
    ADD CONSTRAINT uq_organization_role_code UNIQUE NULLS NOT DISTINCT (organization_id, code);

-- A SYSTEM role is global; a CUSTOM role always belongs to an organization
ALTER TABLE public.roles
    ADD CONSTRAINT chk_role_type_scope CHECK (
        (role_type = 'SYSTEM' AND organization_id IS NULL)
        OR (role_type = 'CUSTOM' AND organization_id IS NOT NULL)
    ) NOT VALID;

-- Re-classify the seeded roles from 20261104000001_seed_user_roles.sql
UPDATE public.roles
   SET organization_id = NULL, role_type = 'SYSTEM', is_mutable = FALSE
 WHERE code IN ('SUPER_ADMIN', 'ADMIN');

UPDATE public.roles
   SET role_type = 'CUSTOM', is_mutable = TRUE
 WHERE code IN ('PAYROLL_OFFICER', 'HR_MANAGER');

ALTER TABLE public.roles VALIDATE CONSTRAINT chk_role_type_scope;

CREATE INDEX IF NOT EXISTS idx_roles_type ON public.roles(role_type);

-- ------------------------------------------------------------------------------
-- 4. RLS POLICIES (rebuilt with organization naming)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS tenants_tenant_boundary          ON public.organizations;
DROP POLICY IF EXISTS departments_tenant_boundary      ON public.departments;
DROP POLICY IF EXISTS profiles_tenant_boundary         ON public.profiles;
DROP POLICY IF EXISTS roles_tenant_boundary            ON public.roles;
DROP POLICY IF EXISTS user_roles_tenant_boundary       ON public.user_roles;
DROP POLICY IF EXISTS tenant_modules_tenant_boundary   ON public.organization_modules;
DROP POLICY IF EXISTS department_modules_tenant_boundary ON public.department_modules;
DROP POLICY IF EXISTS role_permissions_tenant_boundary ON public.role_permissions;
DROP POLICY IF EXISTS user_permissions_tenant_boundary ON public.user_permissions;
DROP POLICY IF EXISTS leave_types_tenant_boundary      ON public.leave_types;
DROP POLICY IF EXISTS leave_requests_tenant_boundary   ON public.leave_requests;

CREATE POLICY organizations_boundary ON public.organizations
    FOR SELECT TO authenticated
    USING (id = public.current_user_organization_id());

CREATE POLICY departments_organization_boundary ON public.departments
    FOR ALL TO authenticated
    USING (organization_id = public.current_user_organization_id())
    WITH CHECK (organization_id = public.current_user_organization_id());

CREATE POLICY profiles_organization_boundary ON public.profiles
    FOR ALL TO authenticated
    USING (organization_id = public.current_user_organization_id() OR id = auth.uid())
    WITH CHECK (organization_id = public.current_user_organization_id() OR id = auth.uid());

-- Roles: global SYSTEM roles are readable by everyone; only own CUSTOM roles are writable
CREATE POLICY roles_read_boundary ON public.roles
    FOR SELECT TO authenticated
    USING (organization_id IS NULL OR organization_id = public.current_user_organization_id());

CREATE POLICY roles_write_boundary ON public.roles
    FOR ALL TO authenticated
    USING (
        role_type = 'CUSTOM'
        AND is_mutable = TRUE
        AND organization_id = public.current_user_organization_id()
    )
    WITH CHECK (
        role_type = 'CUSTOM'
        AND organization_id = public.current_user_organization_id()
    );

CREATE POLICY user_roles_organization_boundary ON public.user_roles
    FOR ALL TO authenticated
    USING (organization_id = public.current_user_organization_id())
    WITH CHECK (organization_id = public.current_user_organization_id());

CREATE POLICY organization_modules_boundary ON public.organization_modules
    FOR SELECT TO authenticated
    USING (organization_id = public.current_user_organization_id());

CREATE POLICY department_modules_organization_boundary ON public.department_modules
    FOR ALL TO authenticated
    USING (organization_id = public.current_user_organization_id())
    WITH CHECK (organization_id = public.current_user_organization_id());

CREATE POLICY role_permissions_organization_boundary ON public.role_permissions
    FOR ALL TO authenticated
    USING (organization_id = public.current_user_organization_id())
    WITH CHECK (organization_id = public.current_user_organization_id());

CREATE POLICY user_permissions_organization_boundary ON public.user_permissions
    FOR ALL TO authenticated
    USING (organization_id = public.current_user_organization_id())
    WITH CHECK (organization_id = public.current_user_organization_id());

CREATE POLICY leave_types_organization_boundary ON public.leave_types
    FOR ALL TO authenticated
    USING (organization_id = public.current_user_organization_id())
    WITH CHECK (organization_id = public.current_user_organization_id());

CREATE POLICY leave_requests_organization_boundary ON public.leave_requests
    FOR ALL TO authenticated
    USING (organization_id = public.current_user_organization_id())
    WITH CHECK (organization_id = public.current_user_organization_id());

COMMIT;
