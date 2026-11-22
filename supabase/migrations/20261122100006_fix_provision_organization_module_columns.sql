-- ==============================================================================
-- JK-PAYROLL / PAYPULSE: FORWARD MIGRATION
-- Migration: 20261122100006_fix_provision_organization_module_columns.sql
-- Description: Corrects column references for organization_modules in
--              provision_organization_from_onboarding_invitation.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.provision_organization_from_onboarding_invitation(
    p_token_hash TEXT,
    p_user_id UUID,
    p_organization JSONB,
    p_department_name TEXT DEFAULT 'General',
    p_department_code TEXT DEFAULT 'GEN'
)
RETURNS TABLE (
    organization_id UUID,
    department_id UUID,
    user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
    v_inv RECORD;
    v_email TEXT;
    v_code TEXT;
    v_org_id UUID;
    v_dept_id UUID;
    v_mod_id UUID;
    v_custom_role_id UUID;
BEGIN
    IF nullif(trim(p_token_hash), '') IS NULL THEN
        RAISE EXCEPTION 'Invitation token hash is required' USING ERRCODE = '22023';
    END IF;

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'Authenticated user id is required' USING ERRCODE = '22023';
    END IF;

    -- Concurrency-safe atomic invitation lock
    SELECT * INTO v_inv
    FROM public.organization_onboarding_invitations
    WHERE token_hash = trim(p_token_hash)
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid onboarding invitation' USING ERRCODE = '42501';
    END IF;

    IF v_inv.redeemed_at IS NOT NULL THEN
        IF v_inv.redeemed_by = p_user_id AND v_inv.organization_id IS NOT NULL THEN
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

    -- 4. Tier 1: Initialize Organization Modules (Phase 3.0A Prerequisite)
    FOR v_mod_id IN
        SELECT m.id FROM public.modules m
        WHERE m.code IN ('Department', 'EmployeeProfile', 'RolePermission')
    LOOP
        INSERT INTO public.organization_modules (organization_id, module_id, allocated_at)
        VALUES (v_org_id, v_mod_id, clock_timestamp())
        ON CONFLICT (organization_id, module_id) DO NOTHING;

        -- Tier 2: Allocate modules to the root HR department
        INSERT INTO public.department_modules (organization_id, department_id, module_id, allocated_at)
        VALUES (v_org_id, v_dept_id, v_mod_id, clock_timestamp())
        ON CONFLICT (organization_id, department_id, module_id) DO NOTHING;
    END LOOP;

    -- 5. Tier 3: Instantiate Standard Role Template Catalog (Decision P-01 Option C)
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
