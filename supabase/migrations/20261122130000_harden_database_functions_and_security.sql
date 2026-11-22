-- ==============================================================================
-- JK-PAYROLL (PAYPULSE) — MIGRATION: FUNCTION SECURITY HARDENING & LEAST PRIVILEGE
-- Migration: 20261122130000_harden_database_functions_and_security.sql
--
-- Findings Addressed:
-- 1. Mutable Search Paths:
--    - public.fn_sync_department_hierarchy()
--    - public.safe_cast_uuid()
--    Remediation: Set explicit search_path on both functions and harden references.
--
-- 2. Anonymous SECURITY DEFINER execution:
--    - Revoke EXECUTE from PUBLIC and anon across all security-critical functions.
--
-- 3. Authenticated SECURITY DEFINER execution:
--    - Trigger functions (enforce_audit_log_immutability, fn_sync_department_hierarchy,
--      fn_sync_organization_active_status, record_audit_log): Revoke from authenticated.
--    - Internal calculation helpers (get_ancestor_department_ids, get_sub_department_ids):
--      Revoke from authenticated.
--    - RLS evaluation helpers (current_user_organization_id, is_organization_admin,
--      is_organization_member, is_super_admin, get_profile_by_id, is_assignable_organization_role,
--      is_existing_trusted_tenant_admin_membership, is_existing_trusted_tenant_admin_user_role):
--      Retain authenticated execution strictly for RLS policy evaluation, with search_path hardened
--      and identity bound strictly to auth.uid().
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. MUTABLE SEARCH PATH HARDENING
-- ------------------------------------------------------------------------------

-- 1.1 safe_cast_uuid: Immutable parser utility
CREATE OR REPLACE FUNCTION public.safe_cast_uuid(p_val TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
    IF p_val IS NULL OR p_val !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN NULL;
    END IF;
    RETURN p_val::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- 1.2 fn_sync_department_hierarchy: Trigger function
CREATE OR REPLACE FUNCTION public.fn_sync_department_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_parent_depth INTEGER;
    v_parent_path  TEXT;
BEGIN
    IF NEW.parent_department_id IS NULL THEN
        NEW.depth := 0;
        NEW.tree_path := lower(NEW.code);
    ELSE
        SELECT depth, tree_path
          INTO v_parent_depth, v_parent_path
          FROM public.departments
         WHERE id = NEW.parent_department_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent department % does not exist', NEW.parent_department_id;
        END IF;

        NEW.depth := COALESCE(v_parent_depth, 0) + 1;
        NEW.tree_path := COALESCE(v_parent_path, '') || '/' || lower(NEW.code);
    END IF;

    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$$;

-- 1.3 Harden search paths on other functions with partial path configs
CREATE OR REPLACE FUNCTION public.fn_sync_organization_active_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.is_active := (NEW.status = 'Active');
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
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

CREATE OR REPLACE FUNCTION public.is_organization_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT (
        public.is_super_admin()
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

CREATE OR REPLACE FUNCTION public.get_ancestor_department_ids(p_organization_id UUID, p_dept_id UUID)
RETURNS TABLE(department_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    WITH RECURSIVE ancestors AS (
        SELECT d.id, d.parent_department_id
        FROM public.departments d
        WHERE d.id = p_dept_id
          AND d.organization_id = p_organization_id
        UNION ALL
        SELECT parent.id, parent.parent_department_id
        FROM public.departments parent
        INNER JOIN ancestors a ON a.parent_department_id = parent.id
        WHERE parent.organization_id = p_organization_id
    )
    SELECT a.id FROM ancestors a;
$$;

CREATE OR REPLACE FUNCTION public.get_sub_department_ids(p_organization_id UUID, p_root_dept_id UUID)
RETURNS TABLE(department_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    WITH RECURSIVE dept_tree AS (
        SELECT d.id
        FROM public.departments d
        WHERE d.id = p_root_dept_id
          AND d.organization_id = p_organization_id
        UNION ALL
        SELECT child.id
        FROM public.departments child
        INNER JOIN dept_tree dt ON dt.id = child.parent_department_id
        WHERE child.organization_id = p_organization_id
    )
    SELECT dt.id FROM dept_tree dt;
$$;

-- ------------------------------------------------------------------------------
-- 2. PRIVILEGE RESTRICTION: TRIGGER FUNCTIONS (No RPC / Direct Call Access)
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.enforce_audit_log_immutability() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_sync_department_hierarchy() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_sync_organization_active_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_audit_log() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_enforce_profile_security_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_protect_profile_audit_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_validate_organization_permission_module() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 3. PRIVILEGE RESTRICTION: INTERNAL CALCULATION HELPERS
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_ancestor_department_ids(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ancestor_department_ids(UUID, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.get_sub_department_ids(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_sub_department_ids(UUID, UUID) TO service_role;

-- ------------------------------------------------------------------------------
-- 4. PRIVILEGE RESTRICTION: RLS HELPER FUNCTIONS (Revoke Anonymous, Retain Authenticated)
-- ------------------------------------------------------------------------------

-- 4.1 current_user_organization_id
REVOKE ALL ON FUNCTION public.current_user_organization_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_organization_id() TO authenticated, service_role;

-- 4.2 is_super_admin
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

-- 4.3 is_organization_member
REVOKE ALL ON FUNCTION public.is_organization_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_organization_member(UUID) TO authenticated, service_role;

-- 4.4 is_organization_admin
REVOKE ALL ON FUNCTION public.is_organization_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_organization_admin(UUID) TO authenticated, service_role;

-- 4.5 get_profile_by_id
REVOKE ALL ON FUNCTION public.get_profile_by_id(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_by_id(UUID) TO authenticated, service_role;

-- 4.6 is_assignable_organization_role
REVOKE ALL ON FUNCTION public.is_assignable_organization_role(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_assignable_organization_role(UUID, UUID) TO authenticated, service_role;

-- 4.7 is_existing_trusted_tenant_admin_membership
REVOKE ALL ON FUNCTION public.is_existing_trusted_tenant_admin_membership(UUID, UUID, UUID, UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_existing_trusted_tenant_admin_membership(UUID, UUID, UUID, UUID, BOOLEAN) TO authenticated, service_role;

-- 4.8 is_existing_trusted_tenant_admin_user_role
REVOKE ALL ON FUNCTION public.is_existing_trusted_tenant_admin_user_role(UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_existing_trusted_tenant_admin_user_role(UUID, UUID, UUID) TO authenticated, service_role;
