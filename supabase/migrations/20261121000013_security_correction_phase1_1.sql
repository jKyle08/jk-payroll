-- ==============================================================================
-- JK-PAYROLL: PHASE 1.1 — SECURITY CORRECTION & POSTGRESQL VERIFICATION
-- Migration: 20261121000013_security_correction_phase1_1.sql
-- Objectives Addressed:
--   - OBJ-1: Enforce Authoritative Organization Membership (Remove profiles.org_id fallback)
--   - OBJ-2: Harden Profile INSERT and UPDATE (Prevent self-reactivation & self-reassignment)
--   - OBJ-3: Establish Single SuperAdmin Authority (profiles.is_super_admin sole authority)
--   - OBJ-4: Secure get_user_effective_permissions (Model B: service_role only execution)
--   - OBJ-5: Harden Organization Administrator Resolution (Role code & scope validation)
--   - OBJ-6: Correct Organization Lifecycle Synchronization (Full trigger & CHECK constraint)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. UTILITY: SAFE UUID CASTING
-- Prevents unhandled database errors on malformed JWT organization_id claims
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.safe_cast_uuid(p_val TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
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

-- ------------------------------------------------------------------------------
-- 2. HARDENED SUPERADMIN AUTHORITY (OBJ-3)
-- profiles.is_super_admin is the sole authorization authority.
-- Eliminates JWT claim 'SUPER_ADMIN' as an independent grant.
-- Revocation in profiles takes effect immediately for all active tokens.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
          AND is_super_admin = true 
          AND is_active = true
    );
$$;

-- ------------------------------------------------------------------------------
-- 3. HARDENED CURRENT USER ORGANIZATION ID (OBJ-1, OBJ-6)
-- Resolves organization ID strictly from active organization_memberships
-- in organizations that are active and not expired.
-- Eliminates fallback to profiles.organization_id.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        -- 1. Verified JWT tenant context claim if caller has an active membership in an active, unexpired org
        (
            SELECT om.organization_id 
            FROM public.organization_members om 
            INNER JOIN public.organizations o ON o.id = om.organization_id
            WHERE om.user_id = auth.uid() 
              AND om.organization_id = public.safe_cast_uuid(auth.jwt()->'app_metadata'->>'organization_id')
              AND om.is_active = true
              AND o.status = 'Active'
              AND (o.end_date IS NULL OR o.end_date >= clock_timestamp())
            LIMIT 1
        ),
        -- 2. First active owned/primary membership in an active, unexpired organization (deterministic ordering)
        (
            SELECT om.organization_id 
            FROM public.organization_members om 
            INNER JOIN public.organizations o ON o.id = om.organization_id
            WHERE om.user_id = auth.uid() 
              AND om.is_active = true 
              AND o.status = 'Active'
              AND (o.end_date IS NULL OR o.end_date >= clock_timestamp())
            ORDER BY om.is_owner DESC, om.created_at ASC 
            LIMIT 1
        )
    );
$$;

-- ------------------------------------------------------------------------------
-- 4. HARDENED ORGANIZATION MEMBERSHIP VERIFICATION (OBJ-1, OBJ-6)
-- Enforces organization_members as the authoritative source for regular users.
-- Eliminates profiles.organization_id as an alternative authorization source.
-- Requires active organization status and valid lifecycle date window.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_organization_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (
        -- Super Admin universal authority (sole source: profiles)
        public.is_super_admin()
        OR (
            -- Target organization must be valid, active, and not expired
            p_org_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.organizations o 
                WHERE o.id = p_org_id 
                  AND o.status = 'Active'
                  AND (o.end_date IS NULL OR o.end_date >= clock_timestamp())
            )
            -- Authoritative active membership in organization_members ONLY
            AND EXISTS (
                SELECT 1 FROM public.organization_members om
                WHERE om.user_id = auth.uid()
                  AND om.organization_id = p_org_id
                  AND om.is_active = true
            )
        )
    );
$$;

-- ------------------------------------------------------------------------------
-- 5. HARDENED ORGANIZATION ADMINISTRATOR RESOLUTION (OBJ-1, OBJ-5, OBJ-6)
-- Checks active role status and organization scope.
-- Eliminates arbitrary role display names as authorization authority.
-- Primary authoritative assignment via user_roles.
-- Compatibility fallbacks strictly conditioned on active membership in organization_members.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_organization_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (
        -- Platform Super Admin universal authority (sole source: profiles)
        public.is_super_admin()
        OR (
            -- Target organization must be valid, active, and not expired
            p_org_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.organizations o 
                WHERE o.id = p_org_id 
                  AND o.status = 'Active'
                  AND (o.end_date IS NULL OR o.end_date >= clock_timestamp())
            )
            -- User must possess an active membership record in target organization
            AND EXISTS (
                SELECT 1 FROM public.organization_members om
                WHERE om.user_id = auth.uid()
                  AND om.organization_id = p_org_id
                  AND om.is_active = true
                  AND (
                      -- 1. Explicit owner flag
                      om.is_owner = true
                      -- 2. Authoritative role check via user_roles assignment table
                      OR EXISTS (
                          SELECT 1 FROM public.user_roles ur
                          INNER JOIN public.roles r ON ur.role_id = r.id
                          WHERE ur.user_id = auth.uid()
                            AND ur.organization_id = p_org_id
                            AND r.is_active = true
                            AND (r.organization_id = p_org_id OR r.organization_id IS NULL)
                            AND UPPER(r.code) IN ('ADMIN', 'ORGANIZATION_ADMIN', 'ORG_ADMIN', 'TENANT_ADMIN')
                      )
                      -- 3. Temporary compatibility: role assignment on organization_members
                      OR EXISTS (
                          SELECT 1 FROM public.roles r
                          WHERE r.id = om.role_id
                            AND r.is_active = true
                            AND (r.organization_id = p_org_id OR r.organization_id IS NULL)
                            AND UPPER(r.code) IN ('ADMIN', 'ORGANIZATION_ADMIN', 'ORG_ADMIN', 'TENANT_ADMIN')
                      )
                      -- 4. Temporary compatibility: profile flag (strictly scoped to active member)
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

-- ------------------------------------------------------------------------------
-- 6. HARDENED PROFILES RLS POLICIES (OBJ-1, OBJ-2)
-- Strict separation of ordinary self-service updates from administrative provisioning.
-- Prevents self-promotion, self-reactivation, and organization/department reassignment.
-- ------------------------------------------------------------------------------

-- 6.1 Profiles Insert Policy
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;
CREATE POLICY profiles_insert_policy ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        -- Self-registration:
        -- Basic self-registration only: cannot elevate to super admin or org admin.
        -- Cannot self-assign to an organization without an active organization_members record.
        -- Cannot self-assign department.
        OR (
            id = auth.uid() 
            AND is_super_admin = false 
            AND is_organization_admin = false
            AND (
                organization_id IS NULL 
                OR EXISTS (
                    SELECT 1 FROM public.organization_members om
                    WHERE om.user_id = auth.uid() 
                      AND om.organization_id = public.profiles.organization_id
                      AND om.is_active = true
                )
            )
            AND department_id IS NULL
        )
        -- Administrative provisioning by Org Admin:
        -- Org admin may provision profiles only for their own active organization.
        -- Cannot create super admins or other org admins via raw profile insert.
        -- If department is specified, it must belong to the same organization.
        -- Note: Profile insertion does NOT grant membership (requires organization_members).
        OR (
            organization_id = public.current_user_organization_id() 
            AND public.is_organization_admin(organization_id) 
            AND is_super_admin = false
            AND is_organization_admin = false
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

-- 6.2 Profiles Update Policy
DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
CREATE POLICY profiles_update_policy ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        -- Self-update: Caller must be updating their own record AND must currently be ACTIVE
        -- Inactive / disabled accounts cannot update their record (blocks self-reactivation)
        OR (
            id = auth.uid()
            AND (SELECT p.is_active FROM public.profiles p WHERE p.id = auth.uid()) = true
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
            id = auth.uid()
            AND is_super_admin = (SELECT p.is_super_admin FROM public.profiles p WHERE p.id = auth.uid())
            AND is_organization_admin = (SELECT p.is_organization_admin FROM public.profiles p WHERE p.id = auth.uid())
            AND is_active = (SELECT p.is_active FROM public.profiles p WHERE p.id = auth.uid())
            AND (organization_id IS NOT DISTINCT FROM (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()))
            AND (department_id IS NOT DISTINCT FROM (SELECT p.department_id FROM public.profiles p WHERE p.id = auth.uid()))
        )
        -- Org admin update restrictions:
        -- Org admin cannot promote to super admin or to is_organization_admin via profile
        -- Cannot reassign profile to another organization
        -- Department must be within the same organization
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id)
            AND is_super_admin = false
            AND is_organization_admin = (SELECT p.is_organization_admin FROM public.profiles p WHERE p.id = public.profiles.id)
            AND (organization_id IS NOT DISTINCT FROM (SELECT p.organization_id FROM public.profiles p WHERE p.id = public.profiles.id))
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

-- ------------------------------------------------------------------------------
-- 7. DEFENSE-IN-DEPTH TRIGGER: PROFILE SECURITY FIELD IMMUTABILITY (OBJ-2)
-- Enforces field-level security invariants directly in the plpgsql engine
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_enforce_profile_security_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Superusers, service_role, and platform Super Admins bypass field mutation restrictions
    IF current_user IN ('postgres', 'service_role') OR current_role IN ('postgres', 'service_role') OR public.is_super_admin() THEN
        RETURN NEW;
    END IF;

    -- Self-service update checks
    IF auth.uid() = OLD.id THEN
        -- Prevent self-reactivation or deactivation
        IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
            RAISE EXCEPTION 'Security violation: Users cannot alter their own account active status';
        END IF;

        -- Prevent self-promotion to super admin
        IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin THEN
            RAISE EXCEPTION 'Security violation: Users cannot modify their super admin status';
        END IF;

        -- Prevent self-promotion to organization admin
        IF NEW.is_organization_admin IS DISTINCT FROM OLD.is_organization_admin THEN
            RAISE EXCEPTION 'Security violation: Users cannot modify their organization admin status';
        END IF;

        -- Prevent self-reassignment of organization
        IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
            RAISE EXCEPTION 'Security violation: Users cannot reassign their organization';
        END IF;

        -- Prevent self-reassignment of department
        IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
            RAISE EXCEPTION 'Security violation: Users cannot reassign their department';
        END IF;
    END IF;

    -- Org admin update checks (when updating another user's profile)
    IF auth.uid() <> OLD.id THEN
        -- Prevent org admin from elevating target to super admin
        IF NEW.is_super_admin = true AND OLD.is_super_admin = false THEN
            RAISE EXCEPTION 'Security violation: Organization administrators cannot elevate users to super admin';
        END IF;

        -- Prevent org admin from elevating target to organization admin via profile
        IF NEW.is_organization_admin = true AND OLD.is_organization_admin = false THEN
            RAISE EXCEPTION 'Security violation: Organization administrators cannot promote users to organization admin via profile';
        END IF;

        -- Prevent org admin from reassigning profile to another organization
        IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
            RAISE EXCEPTION 'Security violation: Cannot reassign user to another organization';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_profile_security_fields ON public.profiles;
CREATE TRIGGER trg_enforce_profile_security_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_enforce_profile_security_fields();

-- ------------------------------------------------------------------------------
-- 8. COMPREHENSIVE ORGANIZATION LIFECYCLE SYNCHRONIZATION (OBJ-6)
-- Ensures organizations.is_active is strictly synchronized with status on all DML.
-- Adds table CHECK constraint to prevent contradictory states.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_sync_organization_active_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.is_active := (NEW.status = 'Active');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_organization_active_status ON public.organizations;
CREATE TRIGGER trg_sync_organization_active_status
    BEFORE INSERT OR UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_organization_active_status();

-- Ensure all existing rows comply with the check constraint
UPDATE public.organizations 
SET is_active = (status = 'Active')
WHERE is_active IS DISTINCT FROM (status = 'Active');

-- Add CHECK constraint if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
          AND table_name = 'organizations' 
          AND constraint_name = 'chk_organizations_status_active_sync'
    ) THEN
        ALTER TABLE public.organizations 
        ADD CONSTRAINT chk_organizations_status_active_sync 
        CHECK (is_active = (status = 'Active'));
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 9. SECURE GET_USER_EFFECTIVE_PERMISSIONS (OBJ-4: MODEL B)
-- Function execution restricted strictly to service_role.
-- Revoked from PUBLIC, anon, and authenticated roles.
-- Internal guard enforces fail-closed behavior on arbitrary queries.
-- ------------------------------------------------------------------------------

-- Revoke execution from untrusted client roles
REVOKE ALL ON FUNCTION public.get_user_effective_permissions(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_effective_permissions(UUID, UUID) TO service_role;

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
    -- Strict defense-in-depth: If invoked under authenticated role, restrict strictly to caller
    IF auth.role() = 'authenticated' AND (auth.uid() IS NULL OR auth.uid() <> p_user_id) THEN
        RETURN ARRAY[]::TEXT[];
    END IF;

    -- Verify target user is active in profile and organization is active and not expired
    SELECT 
        p.department_id, 
        p.is_active, 
        (o.status = 'Active' AND (o.end_date IS NULL OR o.end_date >= clock_timestamp()))
    INTO 
        v_dept_id, 
        v_user_active, 
        v_org_active
    FROM public.profiles p
    INNER JOIN public.organizations o ON o.id = p.organization_id
    WHERE p.id = p_user_id
      AND p.organization_id = p_organization_id;

    IF NOT FOUND OR NOT COALESCE(v_user_active, false) OR NOT COALESCE(v_org_active, false) THEN
        RETURN ARRAY[]::TEXT[];
    END IF;

    -- Verify user has an active membership record in target organization
    IF NOT EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = p_user_id
          AND om.organization_id = p_organization_id
          AND om.is_active = true
    ) THEN
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
