-- ==============================================================================
-- ROLLBACK for 20261121000014_security_corrections_phase1_1_1.sql
-- Restores the Phase 1.1 (migration 13) / Phase 1 (migration 12) definitions.
-- NOT a migration (kept outside supabase/migrations so the CLI never applies it automatically).
--
-- !! WARNING — rolling back REINTRODUCES these known defects:
--    * fn_enforce_profile_security_fields becomes SECURITY DEFINER again => trigger bypass (P111-01)
--    * direct-XOR-role permission semantics (P111-02), profile department source (P111-03)
--    * self-registration may carry organization_id (P111-04)
--    * custom roles coded ADMIN grant org-admin (P111-05); arbitrary first-membership org (P111-06)
-- Limitations: (a) the department backfill in migration 14 is NOT reverted (it only copies
-- legitimate legacy profile departments into memberships; reverting would delete data);
-- (b) the pre-flight WARNINGs are not undone (they changed nothing);
-- (c) migration 14 is recorded in supabase_migrations.schema_migrations; delete that row
--     (DELETE FROM supabase_migrations.schema_migrations WHERE version='20261121000014';)
--     only if the file is also removed, otherwise 'supabase db push' will not re-apply it.
-- Apply inside one transaction.
-- ==============================================================================
BEGIN;

-- 1. helper functions as of migration 13
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

-- 2. profile insert policy as of migration 13
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

-- 3. profile trigger function as of migration 13 (SECURITY DEFINER; known bypass)
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

-- 4. effective permissions as of migration 13
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

-- 5. token hook as of migration 12
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_claims JSONB;
    v_role_code TEXT;
    v_department_name TEXT;
    v_org_id UUID;
    v_is_super BOOLEAN;
BEGIN
    v_user_id := (event->>'user_id')::UUID;
    v_claims := COALESCE(event->'claims', '{}'::jsonb);

    -- Check if user is an authentic platform super admin
    SELECT is_super_admin INTO v_is_super
    FROM public.profiles
    WHERE id = v_user_id AND is_active = true;

    IF v_is_super = true THEN
        v_claims := jsonb_set(v_claims, '{app_metadata,role}', to_jsonb('SUPER_ADMIN'::text), true);
    END IF;

    -- Fetch active tenant role code (NOT arbitrary display name) and department from organization_members
    SELECT 
        r.code,
        d.name,
        om.organization_id
    INTO 
        v_role_code,
        v_department_name,
        v_org_id
    FROM public.organization_members om
    LEFT JOIN public.roles r ON om.role_id = r.id
    LEFT JOIN public.departments d ON om.department_id = d.id
    WHERE om.user_id = v_user_id
      AND om.is_active = true
    ORDER BY om.is_owner DESC, om.created_at ASC
    LIMIT 1;

    -- Fallback to profile primary organization if no explicit membership
    IF v_org_id IS NULL THEN
        SELECT organization_id INTO v_org_id
        FROM public.profiles
        WHERE id = v_user_id AND is_active = true
        LIMIT 1;
    END IF;

    -- Inject verified role code and organization into claims safely
    IF v_role_code IS NOT NULL AND v_role_code <> 'SUPER_ADMIN' THEN
        v_claims := jsonb_set(v_claims, '{app_metadata,role_code}', to_jsonb(v_role_code), true);
    END IF;

    IF v_department_name IS NOT NULL THEN
        v_claims := jsonb_set(v_claims, '{app_metadata,department_name}', to_jsonb(v_department_name), true);
    END IF;

    IF v_org_id IS NOT NULL THEN
        v_claims := jsonb_set(v_claims, '{app_metadata,organization_id}', to_jsonb(v_org_id), true);
    END IF;

    event := jsonb_set(event, '{claims}', v_claims, true);
    RETURN event;
END;
$$;

-- 6. re-assert Model B grants and hook grants
REVOKE ALL ON FUNCTION public.get_user_effective_permissions(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_effective_permissions(UUID, UUID) TO service_role;
REVOKE ALL ON FUNCTION public.custom_access_token_hook(JSONB) FROM PUBLIC, anon, authenticated;

COMMIT;
