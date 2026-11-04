-- ==============================================================================
-- JK-PAYROLL: INSERT SCRIPT FOR USER ROLES & SYSTEM DEFAULT ROLES
-- Seeds default roles and user role assignments for SuperAdmin and Admin
-- ==============================================================================

-- 1. Ensure Root & Default Organizations Exist
INSERT INTO public.tenants (id, code, name, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000000', 'ROOT', 'SuperAdmin Platform', true),
    ('00000000-0000-0000-0000-000000000001', 'APEX-HLTH', 'Apex Health Systems', true)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    code = EXCLUDED.code;

-- 2. Insert Default Roles for SuperAdmin and Admin Organizations
INSERT INTO public.roles (id, tenant_id, code, name, description, is_active)
VALUES
    -- SuperAdmin Role under Root Organization
    (
        'c0000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000000',
        'SUPER_ADMIN',
        'Super Administrator',
        'Full unrestricted platform-wide administrative control across all organizations and modules',
        true
    ),
    -- Organization Administrator Role under Default Client Organization
    (
        'c0000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        'ADMIN',
        'Administrator',
        'Organization-level administrator with full departmental and policy configuration control',
        true
    ),
    -- Supporting Roles
    (
        'c0000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000001',
        'PAYROLL_OFFICER',
        'Payroll Officer',
        'Manages monthly payroll batches, statutory contributions, and payslip distribution',
        true
    ),
    (
        'c0000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000001',
        'HR_MANAGER',
        'HR Manager',
        'Personnel management, leave policy approvals, and staff profile administration',
        true
    )
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- 3. Ensure Default Users exist in profiles
INSERT INTO public.profiles (id, tenant_id, full_name, email, is_active, is_tenant_admin, is_super_admin)
VALUES
    (
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000000',
        'Super Administrator',
        'superadmin@paypulse.internal',
        true,
        false,
        true
    ),
    (
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        'Alexander Wright',
        'admin@apexcorp.com',
        true,
        true,
        false
    )
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;

-- 4. Insert Default User Roles
INSERT INTO public.user_roles (tenant_id, user_id, role_id, assigned_at)
VALUES
    -- SuperAdmin User -> SuperAdmin Role
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001',
        clock_timestamp()
    ),
    -- Admin User -> Admin Role
    (
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        'c0000000-0000-0000-0000-000000000002',
        clock_timestamp()
    )
ON CONFLICT (user_id, role_id) DO NOTHING;
