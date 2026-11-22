-- ==============================================================================
-- JK-PAYROLL: PHASE 3.0C FORWARD MIGRATION (DECISION P-01 OPTION C IMPLEMENTED)
-- Migration: 20261122100004_phase_3_0c_onboarding_role_compatibility.sql
-- Resolves Finding: F-30B-07 (SYSTEM TENANT_ADMIN Role Incompatibility with Composite FKs)
-- Related Findings: F-30B-08 (Concurrency & Deadlocks), F-30B-10 (Referential Actions)
--
-- STATUS: FULLY EXECUTABLE — Option C (Template Catalog Instantiation) Adopted Baseline
-- Authority: PAYPULSE_DECISION_P01_RBAC_GOVERNANCE_COMPARISON.md
-- Target Function: public.provision_organization_from_onboarding_invitation()
-- Safety: Transactional; Fails closed; Preserves SECURITY DEFINER & explicit search_path.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 0. DECISION P-01 OPTION C BASELINE RECORD
-- ------------------------------------------------------------------------------
-- Option C (Template Catalog Instantiation) is adopted as the formal baseline.
-- Standard tenant role templates are cloned transactionally for each provisioned
-- organization, ensuring structural multi-tenant isolation and composite FK harmony.
DO $$
BEGIN
    RAISE NOTICE 'Decision P-01 Option C (Template Catalog Instantiation) baseline active.';
END;
$$;

-- ------------------------------------------------------------------------------
-- 1. PREFLIGHT ASSERTIONS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.organizations') IS NULL
       OR to_regclass('public.organization_members') IS NULL
       OR to_regclass('public.user_roles') IS NULL
       OR to_regclass('public.profiles') IS NULL
       OR to_regclass('public.departments') IS NULL
       OR to_regclass('public.roles') IS NULL
       OR to_regclass('public.organization_modules') IS NULL
       OR to_regclass('public.department_modules') IS NULL
       OR to_regclass('public.role_permissions') IS NULL THEN
        RAISE EXCEPTION 'Phase 3.0C preflight failed: required multi-tenant RBAC tables are missing'
            USING ERRCODE = '42P01';
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. UPDATE TRIGGER: ENFORCE_ORGANIZATION_ROLE_ASSIGNMENT (Phase 3.1b alignment)
-- ------------------------------------------------------------------------------
-- Harmonize enforce_organization_role_assignment() so that trusted onboarding
-- executed by service_role can provision and assign the tenant-owned 'ORG_ADMIN' role.
CREATE OR REPLACE FUNCTION public.enforce_organization_role_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $$
#variable_conflict use_column
DECLARE
    v_role public.roles%ROWTYPE;
    v_code TEXT;
    v_actor_role TEXT := coalesce(auth.role(), 'anon');
    v_is_first_owner_admin BOOLEAN := false;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.organization_id IS DISTINCT FROM OLD.organization_id
       AND v_actor_role <> 'service_role' AND NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Organization administrators cannot move assignments across organizations'
            USING ERRCODE = '42501';
    END IF;

    IF TG_TABLE_NAME = 'organization_members' THEN
        IF TG_OP = 'INSERT' AND NEW.is_owner AND v_actor_role <> 'service_role' THEN
            RAISE EXCEPTION 'Only trusted onboarding may create an organization owner membership'
                USING ERRCODE = '42501';
        END IF;
        IF TG_OP = 'UPDATE' AND NEW.is_owner IS DISTINCT FROM OLD.is_owner
           AND v_actor_role <> 'service_role' THEN
            RAISE EXCEPTION 'Only trusted provisioning may change organization owner status'
                USING ERRCODE = '42501';
        END IF;
        IF NEW.role_id IS NULL THEN
            RETURN NEW;
        END IF;
    END IF;

    SELECT r.* INTO v_role
    FROM public.roles r
    WHERE r.id = NEW.role_id
    FOR SHARE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Assigned role does not exist' USING ERRCODE = '23503';
    END IF;

    v_code := public.normalize_organization_role_code(v_role.code);

    -- Phase 3.0C: Authorized first-owner administrator role check.
    -- Allows service_role onboarding to assign a tenant-scoped CUSTOM 'ORG_ADMIN' or legacy SYSTEM 'TENANTADMIN'
    IF v_code IN ('ORGADMIN', 'ORGANIZATIONADMIN', 'TENANTADMIN')
       AND v_actor_role = 'service_role'
       AND (v_role.organization_id = NEW.organization_id OR (v_role.organization_id IS NULL AND v_role.role_type = 'SYSTEM'))
       AND v_role.is_active = true THEN
        IF TG_TABLE_NAME = 'organization_members' THEN
            v_is_first_owner_admin := NEW.is_owner;
        ELSE
            SELECT EXISTS (
                SELECT 1 FROM public.organization_members om
                WHERE om.organization_id = NEW.organization_id
                  AND om.user_id = NEW.user_id
                  AND om.role_id = NEW.role_id
                  AND om.is_owner = true
                  AND om.is_active = true
            ) INTO v_is_first_owner_admin;
        END IF;

        IF v_is_first_owner_admin
           AND EXISTS (
               SELECT 1 FROM public.profiles p
               WHERE p.id = NEW.user_id
                 AND p.is_active = true
                 AND p.is_super_admin = false
           ) THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Block general users from manipulating protected role codes
    IF v_code IN (
        'SUPERADMIN', 'PLATFORMSUPERADMIN', 'TENANTADMIN',
        'ORGANIZATIONADMIN', 'ORGADMIN', 'ADMIN'
    ) THEN
        RAISE EXCEPTION 'Protected role codes cannot be assigned through organization role management'
            USING ERRCODE = '42501';
    END IF;

    IF v_role.role_type <> 'CUSTOM'
       OR v_role.organization_id IS DISTINCT FROM NEW.organization_id
       OR NOT v_role.is_active THEN
        RAISE EXCEPTION 'Role must be active, custom, and scoped to the assignment organization'
            USING ERRCODE = '23514';
    END IF;

    IF TG_TABLE_NAME = 'user_roles'
       AND NOT EXISTS (
           SELECT 1 FROM public.organization_members om
           WHERE om.organization_id = NEW.organization_id
             AND om.user_id = NEW.user_id
             AND om.is_active = true
       ) THEN
        RAISE EXCEPTION 'User role assignment requires active membership in the same organization'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. REVISE ONBOARDING PROVISIONING FUNCTION (Resolves Finding F-30B-07)
-- ------------------------------------------------------------------------------
-- Preserves verified signature:
-- public.provision_organization_from_onboarding_invitation(TEXT, UUID, JSONB, TEXT, TEXT)
CREATE OR REPLACE FUNCTION public.provision_organization_from_onboarding_invitation(
    p_token_hash TEXT,
    p_user_id UUID,
    p_organization JSONB,
    p_department_name TEXT DEFAULT 'Human Resources',
    p_department_code TEXT DEFAULT 'HR'
)
RETURNS TABLE (organization_id UUID, department_id UUID, user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
    v_inv public.organization_onboarding_invitations%ROWTYPE;
    v_email TEXT;
    v_org_id UUID;
    v_dept_id UUID;
    v_custom_role_id UUID;
    v_code TEXT;
    v_mod_id UUID;
BEGIN
    IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' OR p_user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid onboarding credentials' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_inv
    FROM public.organization_onboarding_invitations i
    WHERE i.token_hash = p_token_hash
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid onboarding invitation' USING ERRCODE = '42501';
    END IF;

    -- Idempotent replay by the same identity returns already-provisioned result
    IF v_inv.redeemed_at IS NOT NULL THEN
        IF v_inv.redeemed_by = p_user_id THEN
            SELECT d.id INTO v_dept_id
            FROM public.departments d
            WHERE d.organization_id = v_inv.organization_id
            ORDER BY d.created_at ASC LIMIT 1;
            RETURN QUERY SELECT v_inv.organization_id, v_dept_id, p_user_id;
            RETURN;
        END IF;
        RAISE EXCEPTION 'Onboarding invitation has already been used' USING ERRCODE = '42501';
    END IF;

    IF v_inv.expires_at <= clock_timestamp() THEN
        RAISE EXCEPTION 'Onboarding invitation has expired' USING ERRCODE = '42501';
    END IF;

    SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = p_user_id;
    IF v_email IS NULL OR v_email <> lower(v_inv.invited_email) THEN
        RAISE EXCEPTION 'Authenticated account does not match the invited email' USING ERRCODE = '42501';
    END IF;

    IF p_organization IS NULL OR nullif(trim(p_organization->>'name'), '') IS NULL
       OR nullif(trim(p_organization->>'code'), '') IS NULL THEN
        RAISE EXCEPTION 'Organization name and code are required' USING ERRCODE = '22023';
    END IF;

    v_code := upper(trim(p_organization->>'code'));

    -- 1. Insert Organization
    INSERT INTO public.organizations (
        name, code, slug, legal_name, tax_id, industry, domain, sector, tier,
        status, start_date, end_date, currency, timezone, country_code,
        default_pay_frequency, supported_work_modes, statutory_ids, settings, modules,
        primary_contact_id, created_by
    ) VALUES (
        trim(p_organization->>'name'), v_code,
        coalesce(nullif(trim(p_organization->>'slug'), ''), lower(regexp_replace(v_code, '[^a-z0-9]+', '-', 'g'))),
        nullif(p_organization->>'legalName', ''), nullif(p_organization->>'taxId', ''),
        coalesce(nullif(p_organization->>'industry', ''), 'Technology & Software'),
        nullif(p_organization->>'domain', ''),
        coalesce(nullif(p_organization->>'sector', ''), 'Private')::public.organization_sector,
        coalesce(nullif(p_organization->>'tier', ''), 'Enterprise')::public.organization_tier,
        'Active'::public.organization_status,
        coalesce(nullif(p_organization->>'startDate', '')::timestamptz, clock_timestamp()),
        nullif(p_organization->>'endDate', '')::timestamptz,
        coalesce(nullif(p_organization->>'currency', ''), 'PHP'),
        coalesce(nullif(p_organization->>'timezone', ''), 'Asia/Manila'),
        coalesce(nullif(p_organization->>'countryCode', ''), 'PH'),
        coalesce(nullif(p_organization->>'defaultPayFrequency', ''), 'Semi-Monthly')::public.pay_frequency,
        coalesce(p_organization->'supportedWorkModes', '["OnSite","Remote","Hybrid"]'::jsonb),
        coalesce(p_organization->'statutoryIds', '{}'::jsonb),
        coalesce(p_organization->'settings', '{}'::jsonb),
        coalesce(p_organization->'modules', '["Department","EmployeeProfile","RolePermission"]'::jsonb),
        p_user_id, v_inv.created_by
    ) RETURNING id INTO v_org_id;

    -- 2. Insert Root Department
    INSERT INTO public.departments (organization_id, code, name, created_by)
    VALUES (v_org_id, upper(trim(p_department_code)), trim(p_department_name), v_inv.created_by)
    RETURNING id INTO v_dept_id;

    -- 3. Insert Profile
    INSERT INTO public.profiles (
        id, organization_id, department_id, full_name, email, username, title,
        is_organization_admin, is_super_admin, is_active, created_by
    ) VALUES (
        p_user_id, v_org_id, v_dept_id,
        coalesce(nullif(trim(p_organization #>> '{admin,fullName}'), ''), split_part(v_email, '@', 1)),
        v_email, nullif(p_organization #>> '{admin,username}', ''),
        nullif(p_organization #>> '{admin,title}', ''), false, false, true, v_inv.created_by
    );

    -- 4. Tier 1: Initialize Organization Modules & Entitlements (Phase 3.0A Prerequisite)
    FOR v_mod_id IN
        SELECT m.id FROM public.modules m
        WHERE m.code IN ('Department', 'EmployeeProfile', 'RolePermission')
    LOOP
        INSERT INTO public.organization_modules (organization_id, module_id, is_active, created_at)
        VALUES (v_org_id, v_mod_id, true, clock_timestamp())
        ON CONFLICT (organization_id, module_id) DO NOTHING;

        -- Tier 2: Allocate modules to the root HR department
        INSERT INTO public.department_modules (organization_id, department_id, module_id, allocated_at)
        VALUES (v_org_id, v_dept_id, v_mod_id, clock_timestamp())
        ON CONFLICT (organization_id, department_id, module_id) DO NOTHING;

        -- Populate Phase 3.0A organization_permissions
        INSERT INTO public.organization_permissions (organization_id, module_id, module_action_id, is_active, created_at)
        SELECT v_org_id, v_mod_id, ma.id, true, clock_timestamp()
        FROM public.module_actions ma
        WHERE ma.module_id = v_mod_id
        ON CONFLICT (organization_id, module_action_id) DO NOTHING;
    END LOOP;

    -- 5. Tier 3: Instantiate Standard Role Template Catalog (Decision P-01 Option C)
    -- This resolves Finding F-30B-07: roles belong strictly to v_org_id
    -- Role A: ORG_ADMIN (Organization Administrator)
    INSERT INTO public.roles (
        organization_id, code, name, description, role_type, is_default, is_mutable, is_active
    ) VALUES (
        v_org_id, 'ORG_ADMIN', 'Organization Administrator',
        'Administrative authority for this organization. Manages departments, invitations, and roles.',
        'CUSTOM', true, true, true
    ) RETURNING id INTO v_custom_role_id;

    -- Allocate administrative module actions to the ORG_ADMIN role
    INSERT INTO public.role_permissions (organization_id, role_id, module_action_id, allocated_at)
    SELECT v_org_id, v_custom_role_id, ma.id, clock_timestamp()
    FROM public.module_actions ma
    JOIN public.modules m ON m.id = ma.module_id
    WHERE m.code IN ('Department', 'EmployeeProfile', 'RolePermission')
    ON CONFLICT (organization_id, role_id, module_action_id) DO NOTHING;

    -- Role B: EMPLOYEE (Standard Employee Self-Service)
    INSERT INTO public.roles (
        organization_id, code, name, description, role_type, is_default, is_mutable, is_active
    ) VALUES (
        v_org_id, 'EMPLOYEE', 'Employee (Self-Service)',
        'Standard employee self-service access.',
        'CUSTOM', true, false, true
    );

    -- 6. Insert Organization Membership (satisfies fk_organization_members_org_role)
    INSERT INTO public.organization_members (
        organization_id, user_id, role_id, department_id, is_owner, is_active
    ) VALUES (v_org_id, p_user_id, v_custom_role_id, v_dept_id, true, true);

    -- 7. Insert User Role Assignment (satisfies fk_user_roles_org_role)
    INSERT INTO public.user_roles (organization_id, user_id, role_id, assigned_by)
    VALUES (v_org_id, p_user_id, v_custom_role_id, v_inv.created_by);

    -- 8. Mark Invitation as Redeemed
    UPDATE public.organization_onboarding_invitations
    SET redeemed_at = clock_timestamp(), redeemed_by = p_user_id, organization_id = v_org_id
    WHERE id = v_inv.id;

    RETURN QUERY SELECT v_org_id, v_dept_id, p_user_id;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3B. UPDATE HELPER: IS_ORGANIZATION_ADMIN (Recognize Tenant-Owned Admin Roles)
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
                      -- B. user_roles assignment of an active admin role (SYSTEM or tenant-owned CUSTOM)
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
                      -- C. TRANSITIONAL: organization_members.role_id
                      OR EXISTS (
                          SELECT 1 FROM public.roles r
                          WHERE r.id = om.role_id
                            AND r.is_active = true
                            AND (
                                (r.role_type = 'SYSTEM' AND r.organization_id IS NULL AND UPPER(r.code) IN ('TENANT_ADMIN', 'ORGANIZATION_ADMIN', 'ORG_ADMIN', 'ADMIN'))
                                OR (r.role_type = 'CUSTOM' AND r.organization_id = p_org_id AND UPPER(r.code) IN ('ORG_ADMIN', 'ORGANIZATION_ADMIN', 'TENANT_ADMIN', 'ADMIN'))
                            )
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

REVOKE ALL ON FUNCTION public.is_organization_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_organization_admin(UUID) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. FUNCTION PERMISSION HARDENING
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.provision_organization_from_onboarding_invitation(TEXT, UUID, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_organization_from_onboarding_invitation(TEXT, UUID, JSONB, TEXT, TEXT) TO service_role;

COMMIT;
