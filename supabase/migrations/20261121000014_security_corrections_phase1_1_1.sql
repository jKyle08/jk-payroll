-- ==============================================================================
-- JK-PAYROLL: PHASE 1.1.1 — FINAL SECURITY CORRECTIONS
-- Migration: 20261121000014_security_corrections_phase1_1_1.sql
-- (Sequential; migrations 12 and 13 are NOT edited.)
--
-- Defects corrected
--   P111-01 (CRITICAL) fn_enforce_profile_security_fields() was SECURITY DEFINER and tested
--           current_user IN ('postgres','service_role'). Inside a DEFINER function current_user is
--           the function OWNER (postgres), so the trusted-caller branch was ALWAYS taken and the
--           trigger never enforced anything. Now SECURITY INVOKER; auth.uid() IS NULL handled.
--   P111-02 (HIGH)     get_user_effective_permissions used direct XOR role permissions. Now
--                      RoleActions UNION DirectActions.
--   P111-03 (HIGH)     Department resolved from profiles.department_id. Now from the active
--                      organization_members row for the requested organization, validated.
--   P111-04 (HIGH)     Self-registration allowed organization_id when a membership existed and the
--                      org-admin insert branch did not require membership. Now strict.
--   P111-05 (HIGH)     is_organization_admin(): custom (tenant-created) roles whose CODE looked like
--                      an admin code conferred admin authority. Now only SYSTEM roles do.
--   P111-06 (MEDIUM)   current_user_organization_id() picked an arbitrary "first" membership for
--                      multi-org users. Now: validated claim, else the single eligible membership,
--                      else NULL (fail closed). Token hook no longer treats profiles.organization_id
--                      as membership and omits ambiguous org claims for multi-org users.
--
-- Signatures and parameter NAMES of all replaced functions are unchanged
-- (CREATE OR REPLACE cannot rename parameters).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. PRE-FLIGHT DIAGNOSTICS (non-blocking; visible in migration logs)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_custom_admin_roles   INTEGER;
    v_null_dept_members    INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_custom_admin_roles
    FROM public.roles r
    WHERE r.organization_id IS NOT NULL
      AND UPPER(r.code) IN ('ADMIN', 'ORGANIZATION_ADMIN', 'ORG_ADMIN', 'TENANT_ADMIN');
    IF v_custom_admin_roles > 0 THEN
        RAISE WARNING 'Phase 1.1.1: % custom (tenant-scoped) role(s) carry an admin-looking code and will NO LONGER confer organization-admin authority. Review before relying on them.', v_custom_admin_roles;
    END IF;

    SELECT COUNT(*) INTO v_null_dept_members
    FROM public.organization_members om
    JOIN public.profiles p ON p.id = om.user_id AND p.organization_id = om.organization_id
    WHERE om.department_id IS NULL AND p.department_id IS NOT NULL;
    IF v_null_dept_members > 0 THEN
        RAISE NOTICE 'Phase 1.1.1: backfilling department_id on % organization_members row(s) from the legacy profile.', v_null_dept_members;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 1. DATA BACKFILL (idempotent, preserves existing behaviour for single-org users)
--    The permission resolver now reads the department from organization_members only.
--    Copy the legacy profile department into the matching membership when it is missing
--    and the department genuinely belongs to that organization.
-- ------------------------------------------------------------------------------
UPDATE public.organization_members om
SET department_id = p.department_id,
    updated_at    = timezone('utc'::text, now())
FROM public.profiles p
JOIN public.departments d ON d.id = p.department_id
WHERE om.user_id = p.id
  AND om.organization_id = p.organization_id
  AND d.organization_id = om.organization_id
  AND om.department_id IS NULL
  AND p.department_id IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 2. P111-01: PROFILE SECURITY-FIELD TRIGGER (SECURITY INVOKER)
--    Trusted callers are identified by the REAL executing role (current_user), which is only
--    meaningful for SECURITY INVOKER. Trusted: postgres / supabase_admin (migrations and
--    SECURITY DEFINER functions owned by them), and service_role (Express backend).
--    'authenticated' and 'anon' are never trusted.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_enforce_profile_security_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid           UUID := auth.uid();
    v_actor_active  BOOLEAN;
BEGIN
    -- Trusted database principals (real executing role; NOT the owner of a DEFINER wrapper,
    -- because this function is deliberately SECURITY INVOKER).
    IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
        RETURN NEW;
    END IF;

    -- Any other role must carry an authenticated identity.
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Security violation: profile modification requires an authenticated caller'
            USING ERRCODE = '42501';
    END IF;

    -- Platform super admin (profiles.is_super_admin is the sole authority; requires is_active).
    IF public.is_super_admin() THEN
        RETURN NEW;
    END IF;

    -- Inactive (or invisible) actors can modify nothing.
    SELECT p.is_active INTO v_actor_active FROM public.profiles p WHERE p.id = v_uid;
    IF COALESCE(v_actor_active, false) = false THEN
        RAISE EXCEPTION 'Security violation: inactive accounts cannot modify profiles'
            USING ERRCODE = '42501';
    END IF;

    -- Primary key is immutable for non-trusted callers.
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Security violation: profile id is immutable' USING ERRCODE = '42501';
    END IF;

    IF v_uid = OLD.id THEN
        -- Ordinary self-service: may not touch any security/provisioning field.
        IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
            RAISE EXCEPTION 'Security violation: Users cannot alter their own account active status' USING ERRCODE = '42501';
        END IF;
        IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin THEN
            RAISE EXCEPTION 'Security violation: Users cannot modify their super admin status' USING ERRCODE = '42501';
        END IF;
        IF NEW.is_organization_admin IS DISTINCT FROM OLD.is_organization_admin THEN
            RAISE EXCEPTION 'Security violation: Users cannot modify their organization admin status' USING ERRCODE = '42501';
        END IF;
        IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
            RAISE EXCEPTION 'Security violation: Users cannot reassign their organization' USING ERRCODE = '42501';
        END IF;
        IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
            RAISE EXCEPTION 'Security violation: Users cannot reassign their department' USING ERRCODE = '42501';
        END IF;
    ELSE
        -- Another user's profile (organization administration).
        IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin THEN
            RAISE EXCEPTION 'Security violation: Organization administrators cannot change super admin status' USING ERRCODE = '42501';
        END IF;
        IF NEW.is_organization_admin IS DISTINCT FROM OLD.is_organization_admin THEN
            RAISE EXCEPTION 'Security violation: Organization administrators cannot change organization admin status via profile' USING ERRCODE = '42501';
        END IF;
        IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
            RAISE EXCEPTION 'Security violation: Cannot reassign user to another organization' USING ERRCODE = '42501';
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
-- 3. P111-06: EXPLICIT / UNAMBIGUOUS ORGANIZATION SELECTION
--    Neither profiles.organization_id nor a JWT claim is membership proof. A claim only
--    SELECTS among organizations where an ACTIVE membership in an ACTIVE, unexpired
--    organization exists. With no valid claim, the answer exists only if exactly one
--    eligible membership exists; ambiguity returns NULL (fail closed).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_organization_id()
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

-- ------------------------------------------------------------------------------
-- 4. P111-05: ORGANIZATION ADMIN RESOLUTION (documented transitional sources)
--
--    Every active source below REQUIRES: active membership in organization_members,
--    and an active, unexpired organization.
--
--      A. organization_members.is_owner = true                       (target-authoritative)
--      B. user_roles -> roles  (SYSTEM role, active, admin code)     (target-authoritative)
--      C. organization_members.role_id -> roles (SYSTEM, active)     (TRANSITIONAL, compat)
--      D. profiles.is_organization_admin (profile org = target org)  (TRANSITIONAL, compat)
--
--    NOTE: there is NOT yet a single authoritative role-assignment source. B, C and D are
--    all still capable of granting admin until the RBAC consolidation phase.
--    user_roles has no per-assignment status column, so assignment status cannot be verified.
--    Custom (organization-scoped) roles never confer admin by code.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_organization_admin(p_org_id UUID)
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
                  AND (
                      -- A. owner flag
                      om.is_owner = true
                      -- B. user_roles assignment of an active SYSTEM admin role
                      OR EXISTS (
                          SELECT 1
                          FROM public.user_roles ur
                          INNER JOIN public.roles r ON r.id = ur.role_id
                          WHERE ur.user_id = auth.uid()
                            AND ur.organization_id = p_org_id
                            AND r.is_active = true
                            AND r.role_type = 'SYSTEM'
                            AND r.organization_id IS NULL
                            AND UPPER(r.code) IN ('TENANT_ADMIN', 'ORGANIZATION_ADMIN', 'ORG_ADMIN', 'ADMIN')
                      )
                      -- C. TRANSITIONAL: organization_members.role_id
                      OR EXISTS (
                          SELECT 1 FROM public.roles r
                          WHERE r.id = om.role_id
                            AND r.is_active = true
                            AND r.role_type = 'SYSTEM'
                            AND r.organization_id IS NULL
                            AND UPPER(r.code) IN ('TENANT_ADMIN', 'ORGANIZATION_ADMIN', 'ORG_ADMIN', 'ADMIN')
                      )
                      -- D. TRANSITIONAL: legacy profile flag scoped to its own organization
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
-- 5. P111-04: STRICT SELF-REGISTRATION; PROVISIONING NEVER MANUFACTURES MEMBERSHIP
--    * Self-insert: unassigned profile only (no org, no department, no admin flags).
--    * Org-admin insert: allowed only for a user who ALREADY has an active
--      organization_members row in the admin's organization (membership precedes profile).
--    * Assigning profiles.organization_id for an unassigned profile is a controlled workflow
--      (service_role / Express or super admin); no authenticated-role path exists.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;
CREATE POLICY profiles_insert_policy ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR (
            id = auth.uid()
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

-- ------------------------------------------------------------------------------
-- 6. TOKEN HOOK: no profile-based organization, no ambiguous multi-org claims
--    The role claim is INFORMATIONAL ONLY. No database function reads it as authority.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id         UUID;
    v_claims          JSONB;
    v_role_code       TEXT;
    v_department_name TEXT;
    v_org_id          UUID;
    v_member_count    INTEGER;
    v_is_super        BOOLEAN;
BEGIN
    v_user_id := (event->>'user_id')::UUID;
    v_claims  := COALESCE(event->'claims', '{}'::jsonb);

    -- Informational label only (authorization always re-reads profiles.is_super_admin).
    SELECT is_super_admin INTO v_is_super
    FROM public.profiles
    WHERE id = v_user_id AND is_active = true;

    IF v_is_super = true THEN
        v_claims := jsonb_set(v_claims, '{app_metadata,role}', to_jsonb('SUPER_ADMIN'::text), true);
    END IF;

    -- Only a SINGLE eligible membership yields an unambiguous tenant context.
    SELECT COUNT(*) INTO v_member_count
    FROM public.organization_members om
    INNER JOIN public.organizations o ON o.id = om.organization_id
    WHERE om.user_id = v_user_id
      AND om.is_active = true
      AND o.status = 'Active'
      AND (o.end_date IS NULL OR o.end_date >= clock_timestamp());

    IF v_member_count = 1 THEN
        SELECT r.code, d.name, om.organization_id
        INTO v_role_code, v_department_name, v_org_id
        FROM public.organization_members om
        INNER JOIN public.organizations o ON o.id = om.organization_id
        LEFT JOIN public.roles r ON om.role_id = r.id AND r.is_active = true
        LEFT JOIN public.departments d ON om.department_id = d.id AND d.organization_id = om.organization_id
        WHERE om.user_id = v_user_id
          AND om.is_active = true
          AND o.status = 'Active'
          AND (o.end_date IS NULL OR o.end_date >= clock_timestamp())
        LIMIT 1;

        IF v_role_code IS NOT NULL AND v_role_code <> 'SUPER_ADMIN' THEN
            v_claims := jsonb_set(v_claims, '{app_metadata,role_code}', to_jsonb(v_role_code), true);
        END IF;
        IF v_department_name IS NOT NULL THEN
            v_claims := jsonb_set(v_claims, '{app_metadata,department_name}', to_jsonb(v_department_name), true);
        END IF;
        IF v_org_id IS NOT NULL THEN
            v_claims := jsonb_set(v_claims, '{app_metadata,organization_id}', to_jsonb(v_org_id), true);
        END IF;
    END IF;
    -- 0 or >1 eligible memberships: no organization claim. The application must select the
    -- organization explicitly (x-organization-id) and validate it against active membership.

    event := jsonb_set(event, '{claims}', v_claims, true);
    RETURN event;
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. P111-02 / P111-03: EFFECTIVE PERMISSIONS
--    * additive:   effective = RoleActions UNION DirectActions
--    * department: from the ACTIVE organization_members row of the requested organization,
--                  validated to belong to that organization
--    * profile org column is NOT consulted (multi-organization users)
--    Signature and parameter names are IDENTICAL to migrations 2/13.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(
    p_organization_id UUID,
    p_user_id UUID
)
RETURNS TEXT[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_dept_id        UUID;
    v_user_active    BOOLEAN;
    v_org_active     BOOLEAN;
    v_effective_keys TEXT[];
BEGIN
    -- Defense in depth (EXECUTE is service_role-only): a client role may only ask about itself.
    IF auth.role() = 'authenticated' AND (auth.uid() IS NULL OR auth.uid() <> p_user_id) THEN
        RETURN ARRAY[]::TEXT[];
    END IF;

    IF p_organization_id IS NULL OR p_user_id IS NULL THEN
        RETURN ARRAY[]::TEXT[];
    END IF;

    SELECT om.department_id,
           p.is_active,
           (o.status = 'Active' AND (o.end_date IS NULL OR o.end_date >= clock_timestamp()))
    INTO v_dept_id, v_user_active, v_org_active
    FROM public.organizations o
    INNER JOIN public.organization_members om
            ON om.organization_id = o.id
           AND om.user_id = p_user_id
           AND om.is_active = true
    INNER JOIN public.profiles p ON p.id = p_user_id
    WHERE o.id = p_organization_id;

    IF NOT FOUND OR NOT COALESCE(v_user_active, false) OR NOT COALESCE(v_org_active, false) THEN
        RETURN ARRAY[]::TEXT[];
    END IF;

    IF v_dept_id IS NULL THEN
        RETURN ARRAY[]::TEXT[];
    END IF;

    -- Department must belong to the requested organization and be active.
    IF NOT EXISTS (
        SELECT 1 FROM public.departments d
        WHERE d.id = v_dept_id
          AND d.organization_id = p_organization_id
          AND d.is_active = true
    ) THEN
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
        SELECT action_id, module_id, action, full_key FROM role_user_actions
        UNION
        SELECT action_id, module_id, action, full_key FROM direct_user_actions
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

-- Re-assert Model B grants (idempotent; CREATE OR REPLACE preserves ACLs, this is belt-and-braces).
REVOKE ALL ON FUNCTION public.get_user_effective_permissions(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_effective_permissions(UUID, UUID) TO service_role;

-- The token hook stays callable only by Supabase Auth.
REVOKE ALL ON FUNCTION public.custom_access_token_hook(JSONB) FROM PUBLIC, anon, authenticated;
