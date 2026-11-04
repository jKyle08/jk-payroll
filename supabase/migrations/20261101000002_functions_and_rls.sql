-- ==============================================================================
-- JK-PAYROLL: RECURSIVE CTE FUNCTIONS, TRIGGERS & ROW LEVEL SECURITY (RLS) POLICIES
-- Migration: 20261101000002_functions_and_rls.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HELPER FUNCTION: AUTOMATIC UPDATED_AT TRIGGER
-- Sets updated_at to the current timestamp on record updates
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 2. ATTACH UPDATED_AT TRIGGERS
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_tenants_updated_at ON public.tenants;
CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_departments_updated_at ON public.departments;
CREATE TRIGGER trg_departments_updated_at
    BEFORE UPDATE ON public.departments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_roles_updated_at ON public.roles;
CREATE TRIGGER trg_roles_updated_at
    BEFORE UPDATE ON public.roles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_modules_updated_at ON public.modules;
CREATE TRIGGER trg_modules_updated_at
    BEFORE UPDATE ON public.modules
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_leave_types_updated_at ON public.leave_types;
CREATE TRIGGER trg_leave_types_updated_at
    BEFORE UPDATE ON public.leave_types
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_leave_requests_updated_at ON public.leave_requests;
CREATE TRIGGER trg_leave_requests_updated_at
    BEFORE UPDATE ON public.leave_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 3. HELPER FUNCTION: CURRENT USER TENANT IDENTIFIER
-- Extracts the tenant_id of the authenticated user from public.profiles
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT tenant_id 
    FROM public.profiles 
    WHERE id = auth.uid() 
      AND is_active = true 
    LIMIT 1;
$$;

-- ------------------------------------------------------------------------------
-- 4. RECURSIVE CTE: GET SUB-DEPARTMENT IDS (Downward Tree)
-- Traverses downward and returns all descendant department IDs starting from p_root_dept_id
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_sub_department_ids(
    p_tenant_id UUID,
    p_root_dept_id UUID
)
RETURNS TABLE (
    department_id UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH RECURSIVE dept_tree AS (
        -- Anchor: Target root department
        SELECT 
            d.id AS department_id,
            ARRAY[d.id] AS visited
        FROM public.departments d
        WHERE d.tenant_id = p_tenant_id 
          AND d.id = p_root_dept_id
          AND d.is_active = true

        UNION ALL

        -- Recursive member: Descendant child sub-departments
        SELECT 
            child.id AS department_id,
            parent.visited || child.id AS visited
        FROM public.departments child
        INNER JOIN dept_tree parent ON child.parent_department_id = parent.department_id
        WHERE child.tenant_id = p_tenant_id
          AND child.is_active = true
          AND NOT (child.id = ANY(parent.visited)) -- Prevent cycle infinite loops
    )
    SELECT department_id FROM dept_tree;
$$;

-- ------------------------------------------------------------------------------
-- 5. RECURSIVE CTE: GET ANCESTOR DEPARTMENT IDS (Upward Chain)
-- Traverses upward and returns all ancestor department IDs up to the root
-- Used for module inheritance: child departments inherit modules from parent departments
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_ancestor_department_ids(
    p_tenant_id UUID,
    p_dept_id UUID
)
RETURNS TABLE (
    department_id UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH RECURSIVE dept_ancestors AS (
        -- Anchor: User's assigned department
        SELECT 
            d.id AS department_id,
            d.parent_department_id,
            ARRAY[d.id] AS visited
        FROM public.departments d
        WHERE d.tenant_id = p_tenant_id 
          AND d.id = p_dept_id
          AND d.is_active = true

        UNION ALL

        -- Recursive member: Parent department in the hierarchy
        SELECT 
            parent.id AS department_id,
            parent.parent_department_id,
            curr.visited || parent.id AS visited
        FROM public.departments parent
        INNER JOIN dept_ancestors curr ON curr.parent_department_id = parent.id
        WHERE parent.tenant_id = p_tenant_id
          AND parent.is_active = true
          AND NOT (parent.id = ANY(curr.visited))
    )
    SELECT department_id FROM dept_ancestors;
$$;

-- ------------------------------------------------------------------------------
-- 6. RESOLUTION FUNCTION: GET USER EFFECTIVE PERMISSIONS
-- Logic:
-- 1. Evaluates user active status, tenant active status, and user department.
-- 2. Resolves department ancestor tree (sub-departments inherit parent modules).
-- 3. Filters modules active in tenant_modules AND department_modules along ancestor tree.
-- 4. Direct user_permissions take priority; if empty, fallback to role_permissions.
-- 5. Implicit Permission Expansion:
--    Any mutating action (.Add, .Edit, .Delete, .Approval.Create) automatically
--    grants the corresponding module's .View action without explicit entry.
-- Returns distinct array of full_key strings (e.g. ['TypeOfLeave.View', 'TypeOfLeave.Add'])
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(
    p_tenant_id UUID,
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
    v_tenant_active BOOLEAN;
    v_effective_keys TEXT[];
BEGIN
    -- 1. Check user and tenant active status
    SELECT 
        p.department_id, 
        p.is_active, 
        t.is_active
    INTO 
        v_dept_id, 
        v_user_active, 
        v_tenant_active
    FROM public.profiles p
    INNER JOIN public.tenants t ON t.id = p.tenant_id
    WHERE p.id = p_user_id 
      AND p.tenant_id = p_tenant_id;

    IF NOT FOUND OR NOT v_user_active OR NOT v_tenant_active THEN
        RETURN ARRAY[]::TEXT[];
    END IF;

    -- If user has no department assigned, no departmental permissions apply
    IF v_dept_id IS NULL THEN
        RETURN ARRAY[]::TEXT[];
    END IF;

    -- 2. Determine eligible modules:
    -- Modules enabled for the tenant in tenant_modules
    -- AND allocated in department_modules to user's department OR any ancestor department
    -- 3. Resolve permissions: user_permissions take priority; fallback to role_permissions
    -- 4. Automatically expand implicit .View grant
    WITH eligible_modules AS (
        SELECT DISTINCT dm.module_id
        FROM public.department_modules dm
        INNER JOIN public.tenant_modules tm 
            ON tm.tenant_id = p_tenant_id 
           AND tm.module_id = dm.module_id
        INNER JOIN public.get_ancestor_department_ids(p_tenant_id, v_dept_id) anc 
            ON anc.department_id = dm.department_id
        WHERE dm.tenant_id = p_tenant_id
    ),
    direct_user_actions AS (
        SELECT ma.id AS action_id, ma.module_id, ma.action, ma.full_key
        FROM public.user_permissions up
        INNER JOIN public.module_actions ma ON ma.id = up.module_action_id
        INNER JOIN eligible_modules em ON em.module_id = ma.module_id
        WHERE up.tenant_id = p_tenant_id 
          AND up.user_id = p_user_id
    ),
    role_user_actions AS (
        SELECT ma.id AS action_id, ma.module_id, ma.action, ma.full_key
        FROM public.user_roles ur
        INNER JOIN public.role_permissions rp 
            ON rp.role_id = ur.role_id 
           AND rp.tenant_id = p_tenant_id
        INNER JOIN public.module_actions ma ON ma.id = rp.module_action_id
        INNER JOIN eligible_modules em ON em.module_id = ma.module_id
        INNER JOIN public.roles r 
            ON r.id = ur.role_id 
           AND r.tenant_id = p_tenant_id 
           AND r.is_active = true
        WHERE ur.tenant_id = p_tenant_id 
          AND ur.user_id = p_user_id
    ),
    candidate_actions AS (
        -- If direct user_permissions exist, use direct actions only.
        -- Otherwise fallback to role-assigned actions.
        SELECT * FROM direct_user_actions
        WHERE EXISTS (SELECT 1 FROM direct_user_actions)

        UNION ALL

        SELECT * FROM role_user_actions
        WHERE NOT EXISTS (SELECT 1 FROM direct_user_actions)
    ),
    expanded_keys AS (
        -- Directly evaluated keys
        SELECT full_key FROM candidate_actions

        UNION

        -- Implicit Permission Expansion:
        -- Any mutating action (Add, Edit, Delete, Approval.Create)
        -- automatically grants the corresponding module's .View action!
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
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS on all tenant tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Global catalog tables (Readable by all authenticated users)
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS modules_read_policy ON public.modules;
CREATE POLICY modules_read_policy ON public.modules
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS module_actions_read_policy ON public.module_actions;
CREATE POLICY module_actions_read_policy ON public.module_actions
    FOR SELECT TO authenticated USING (true);

-- Tenants Policies
DROP POLICY IF EXISTS tenants_tenant_boundary ON public.tenants;
CREATE POLICY tenants_tenant_boundary ON public.tenants
    FOR SELECT TO authenticated
    USING (id = public.current_user_tenant_id());

-- Departments Policies
DROP POLICY IF EXISTS departments_tenant_boundary ON public.departments;
CREATE POLICY departments_tenant_boundary ON public.departments
    FOR ALL TO authenticated
    USING (tenant_id = public.current_user_tenant_id())
    WITH CHECK (tenant_id = public.current_user_tenant_id());

-- Profiles Policies
DROP POLICY IF EXISTS profiles_tenant_boundary ON public.profiles;
CREATE POLICY profiles_tenant_boundary ON public.profiles
    FOR ALL TO authenticated
    USING (tenant_id = public.current_user_tenant_id() OR id = auth.uid())
    WITH CHECK (tenant_id = public.current_user_tenant_id() OR id = auth.uid());

-- Roles Policies
DROP POLICY IF EXISTS roles_tenant_boundary ON public.roles;
CREATE POLICY roles_tenant_boundary ON public.roles
    FOR ALL TO authenticated
    USING (tenant_id = public.current_user_tenant_id())
    WITH CHECK (tenant_id = public.current_user_tenant_id());

-- User Roles Policies
DROP POLICY IF EXISTS user_roles_tenant_boundary ON public.user_roles;
CREATE POLICY user_roles_tenant_boundary ON public.user_roles
    FOR ALL TO authenticated
    USING (tenant_id = public.current_user_tenant_id())
    WITH CHECK (tenant_id = public.current_user_tenant_id());

-- Tenant Modules Policies
DROP POLICY IF EXISTS tenant_modules_tenant_boundary ON public.tenant_modules;
CREATE POLICY tenant_modules_tenant_boundary ON public.tenant_modules
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

-- Department Modules Policies
DROP POLICY IF EXISTS department_modules_tenant_boundary ON public.department_modules;
CREATE POLICY department_modules_tenant_boundary ON public.department_modules
    FOR ALL TO authenticated
    USING (tenant_id = public.current_user_tenant_id())
    WITH CHECK (tenant_id = public.current_user_tenant_id());

-- Role Permissions Policies
DROP POLICY IF EXISTS role_permissions_tenant_boundary ON public.role_permissions;
CREATE POLICY role_permissions_tenant_boundary ON public.role_permissions
    FOR ALL TO authenticated
    USING (tenant_id = public.current_user_tenant_id())
    WITH CHECK (tenant_id = public.current_user_tenant_id());

-- User Permissions Policies
DROP POLICY IF EXISTS user_permissions_tenant_boundary ON public.user_permissions;
CREATE POLICY user_permissions_tenant_boundary ON public.user_permissions
    FOR ALL TO authenticated
    USING (tenant_id = public.current_user_tenant_id())
    WITH CHECK (tenant_id = public.current_user_tenant_id());

-- Leave Types Policies
DROP POLICY IF EXISTS leave_types_tenant_boundary ON public.leave_types;
CREATE POLICY leave_types_tenant_boundary ON public.leave_types
    FOR ALL TO authenticated
    USING (tenant_id = public.current_user_tenant_id())
    WITH CHECK (tenant_id = public.current_user_tenant_id());

-- Leave Requests Policies
DROP POLICY IF EXISTS leave_requests_tenant_boundary ON public.leave_requests;
CREATE POLICY leave_requests_tenant_boundary ON public.leave_requests
    FOR ALL TO authenticated
    USING (tenant_id = public.current_user_tenant_id())
    WITH CHECK (tenant_id = public.current_user_tenant_id());
