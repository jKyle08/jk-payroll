-- ==============================================================================
-- JK-PAYROLL: CANONICAL FUNCTIONS & ROW-LEVEL SECURITY (RLS)
-- Migration: 20261104000002_functions_and_rls.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HELPER FUNCTIONS
-- ------------------------------------------------------------------------------

-- Get current authenticated user's organization ID
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

-- Check if current user is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() AND is_active = true),
        false
    );
$$;

-- Check if current user is Organization Admin
CREATE OR REPLACE FUNCTION public.is_organization_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT is_organization_admin FROM public.profiles 
          WHERE id = auth.uid() AND organization_id = p_org_id AND is_active = true),
        false
    );
$$;

-- Subtree department retrieval
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

-- Ancestor department retrieval
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

-- Cascading Effective Permissions Calculation
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
-- 2. ENABLE ROW-LEVEL SECURITY (RLS)
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

-- ------------------------------------------------------------------------------
-- 3. RLS POLICIES
-- ------------------------------------------------------------------------------

-- Organizations: Super admin has full access; members can view their own active organization
CREATE POLICY organizations_access_policy ON public.organizations
    FOR ALL
    USING (
        public.is_super_admin()
        OR (id = public.current_user_organization_id() AND is_active = true)
    );

-- Departments: Super admin has full access; members can view/manage within their organization
CREATE POLICY departments_access_policy ON public.departments
    FOR ALL
    USING (
        public.is_super_admin()
        OR (organization_id = public.current_user_organization_id() AND is_active = true)
    );

-- Profiles: Super admin can access all; users can read their org profiles; org admins can edit
CREATE POLICY profiles_access_policy ON public.profiles
    FOR ALL
    USING (
        public.is_super_admin()
        OR organization_id = public.current_user_organization_id()
    );

-- Roles: Global SYSTEM roles are readable by everyone; Custom roles scoped to organization
CREATE POLICY roles_access_policy ON public.roles
    FOR ALL
    USING (
        public.is_super_admin()
        OR organization_id IS NULL
        OR organization_id = public.current_user_organization_id()
    );

-- User Roles: Organization-scoped assignment
CREATE POLICY user_roles_access_policy ON public.user_roles
    FOR ALL
    USING (
        public.is_super_admin()
        OR organization_id = public.current_user_organization_id()
    );

-- Modules & Actions: Public read for authenticated users
CREATE POLICY modules_read_policy ON public.modules
    FOR SELECT TO authenticated USING (true);

CREATE POLICY module_actions_read_policy ON public.module_actions
    FOR SELECT TO authenticated USING (true);

-- Organization Modules: Organization-scoped
CREATE POLICY org_modules_access_policy ON public.organization_modules
    FOR ALL
    USING (
        public.is_super_admin()
        OR organization_id = public.current_user_organization_id()
    );

-- Department Modules: Organization-scoped
CREATE POLICY dept_modules_access_policy ON public.department_modules
    FOR ALL
    USING (
        public.is_super_admin()
        OR organization_id = public.current_user_organization_id()
    );

-- Role Permissions: Organization-scoped
CREATE POLICY role_permissions_access_policy ON public.role_permissions
    FOR ALL
    USING (
        public.is_super_admin()
        OR organization_id = public.current_user_organization_id()
    );

-- User Permissions: Organization-scoped
CREATE POLICY user_permissions_access_policy ON public.user_permissions
    FOR ALL
    USING (
        public.is_super_admin()
        OR organization_id = public.current_user_organization_id()
    );
