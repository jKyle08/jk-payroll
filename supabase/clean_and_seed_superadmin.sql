-- ==============================================================================
-- JK-PAYROLL / PAYPULSE: DETERMINISTIC CLEAN & SEED SCRIPT
-- Scope: Root Platform Organization, Apex Health Systems, RBAC Catalog,
--        Departments, Modules, Roles, Entitlements & Login Credentials
-- Target: Supabase SQL Editor / CLI Manual Seeder
-- Credentials:
--   Super Admin (Platform):  superadmin@paypulse.internal / SuperAdmin2026!
--   Super Admin (Canonical): superadmin@jkpayroll.com     / SuperAdmin2026!
--   Sample Org Admin (Apex): admin@apexcorp.com           / ApexAdmin2026!
--   Sample Org Admin (Alt):  admin@apexhealth.com         / ApexAdmin2026!
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. CLEAN DATABASE (Truncate in relational dependency order)
-- ------------------------------------------------------------------------------
TRUNCATE TABLE 
    public.audit_logs,
    public.user_permissions,
    public.role_permissions,
    public.department_modules,
    public.organization_modules,
    public.user_roles,
    public.organization_members,
    public.roles,
    public.profiles,
    public.departments,
    public.organizations
RESTART IDENTITY CASCADE;

-- Delete seeded / test users from auth.users (cascades to auth.identities)
DELETE FROM auth.users WHERE email IN (
    'superadmin@paypulse.internal',
    'superadmin@jkpayroll.com',
    'admin@apexcorp.com',
    'admin@apexhealth.com',
    'dchen@apexhealth.com',
    'mgarcia@apexhealth.com'
);

-- ------------------------------------------------------------------------------
-- 1. SEED RBAC SYSTEM MODULES
-- ------------------------------------------------------------------------------
INSERT INTO public.modules (id, code, name, category, description, is_active)
VALUES
    -- Administrative Modules
    ('a0000000-0000-0000-0000-000000000011', 'Organization', 'Organizations & Companies', 'Administration', 'Multi-tenant organization management and isolation settings', true),
    ('a0000000-0000-0000-0000-000000000012', 'Department', 'Department Hierarchy', 'Administration', 'Organizational chart and hierarchical department structure', true),
    ('a0000000-0000-0000-0000-000000000013', 'Profile', 'Staff & User Profiles', 'Administration', 'Employee profile master records and organizational assignments', true),
    ('a0000000-0000-0000-0000-000000000019', 'Role', 'Role Management', 'Administration', 'Security role definitions and access profile management', true),
    ('a0000000-0000-0000-0000-000000000014', 'UserRole', 'User Role Assignment', 'Administration', 'Assignment of security roles and access scopes to users', true),
    ('a0000000-0000-0000-0000-000000000015', 'OrganizationModule', 'Organization Module Allocation', 'Administration', 'Organization subscription and feature entitlement allocations', true),
    ('a0000000-0000-0000-0000-000000000016', 'DepartmentModule', 'Department Module Allocation', 'Administration', 'Departmental feature enablement cascading from tenant allocations', true),
    ('a0000000-0000-0000-0000-000000000017', 'RolePermission', 'Role Permission Template', 'Administration', 'Role-based default permission templates and matrices', true),
    ('a0000000-0000-0000-0000-000000000018', 'UserPermission', 'User Direct Permission Overrides', 'Administration', 'Per-user explicit grant and revoke overrides', true),

    -- Business Modules
    ('10000000-0000-0000-0000-000000000001', 'TypeOfLeave', 'Type Of Leave', 'Settings', 'Leave type policies and entitlement configurations', true),
    ('10000000-0000-0000-0000-000000000002', 'RequestForLeave', 'Request For Leave', 'Transactions', 'Employee leave applications and approvals', true),
    ('10000000-0000-0000-0000-000000000003', 'PayrollProcessing', 'Payroll Processing', 'Payroll', 'Monthly payroll runs, computations, and payouts', true),
    ('10000000-0000-0000-0000-000000000004', 'EmployeeProfile', 'Employee Profile', 'Administration', 'Employee master data and organizational assignments', true),
    ('10000000-0000-0000-0000-000000000005', 'TaxSettings', 'Tax & Statutory Settings', 'Settings', 'Withholding tax tables and statutory contributions', true)
ON CONFLICT (code) DO UPDATE 
SET 
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- ------------------------------------------------------------------------------
-- 2. SEED MODULE ACTIONS
-- ------------------------------------------------------------------------------
INSERT INTO public.module_actions (id, module_id, action, full_key)
VALUES
    -- Organization Actions
    ('b0000000-0000-0000-0000-000000000111', 'a0000000-0000-0000-0000-000000000011', 'View', 'Organization.View'),
    ('b0000000-0000-0000-0000-000000000112', 'a0000000-0000-0000-0000-000000000011', 'Add', 'Organization.Add'),
    ('b0000000-0000-0000-0000-000000000113', 'a0000000-0000-0000-0000-000000000011', 'Edit', 'Organization.Edit'),
    ('b0000000-0000-0000-0000-000000000114', 'a0000000-0000-0000-0000-000000000011', 'Delete', 'Organization.Delete'),
    -- Backward-compatibility Tenant actions
    ('b0000000-0000-0000-0000-000000000115', 'a0000000-0000-0000-0000-000000000011', 'View', 'Tenant.View'),
    ('b0000000-0000-0000-0000-000000000116', 'a0000000-0000-0000-0000-000000000011', 'Add', 'Tenant.Add'),
    ('b0000000-0000-0000-0000-000000000117', 'a0000000-0000-0000-0000-000000000011', 'Edit', 'Tenant.Edit'),
    ('b0000000-0000-0000-0000-000000000118', 'a0000000-0000-0000-0000-000000000011', 'Delete', 'Tenant.Delete'),

    -- Department Actions
    ('b0000000-0000-0000-0000-000000000121', 'a0000000-0000-0000-0000-000000000012', 'View', 'Department.View'),
    ('b0000000-0000-0000-0000-000000000122', 'a0000000-0000-0000-0000-000000000012', 'Add', 'Department.Add'),
    ('b0000000-0000-0000-0000-000000000123', 'a0000000-0000-0000-0000-000000000012', 'Edit', 'Department.Edit'),
    ('b0000000-0000-0000-0000-000000000124', 'a0000000-0000-0000-0000-000000000012', 'Delete', 'Department.Delete'),

    -- Profile Actions
    ('b0000000-0000-0000-0000-000000000131', 'a0000000-0000-0000-0000-000000000013', 'View', 'Profile.View'),
    ('b0000000-0000-0000-0000-000000000132', 'a0000000-0000-0000-0000-000000000013', 'Add', 'Profile.Add'),
    ('b0000000-0000-0000-0000-000000000133', 'a0000000-0000-0000-0000-000000000013', 'Edit', 'Profile.Edit'),
    ('b0000000-0000-0000-0000-000000000134', 'a0000000-0000-0000-0000-000000000013', 'Delete', 'Profile.Delete'),

    -- Role Actions
    ('b0000000-0000-0000-0000-000000000191', 'a0000000-0000-0000-0000-000000000019', 'View', 'Role.View'),
    ('b0000000-0000-0000-0000-000000000192', 'a0000000-0000-0000-0000-000000000019', 'Add', 'Role.Add'),
    ('b0000000-0000-0000-0000-000000000193', 'a0000000-0000-0000-0000-000000000019', 'Edit', 'Role.Edit'),
    ('b0000000-0000-0000-0000-000000000194', 'a0000000-0000-0000-0000-000000000019', 'Delete', 'Role.Delete'),

    -- UserRole Actions
    ('b0000000-0000-0000-0000-000000000141', 'a0000000-0000-0000-0000-000000000014', 'View', 'UserRole.View'),
    ('b0000000-0000-0000-0000-000000000142', 'a0000000-0000-0000-0000-000000000014', 'Add', 'UserRole.Add'),
    ('b0000000-0000-0000-0000-000000000143', 'a0000000-0000-0000-0000-000000000014', 'Edit', 'UserRole.Edit'),
    ('b0000000-0000-0000-0000-000000000144', 'a0000000-0000-0000-0000-000000000014', 'Delete', 'UserRole.Delete'),

    -- OrganizationModule Actions
    ('b0000000-0000-0000-0000-000000000151', 'a0000000-0000-0000-0000-000000000015', 'View', 'OrganizationModule.View'),
    ('b0000000-0000-0000-0000-000000000152', 'a0000000-0000-0000-0000-000000000015', 'Add', 'OrganizationModule.Add'),
    ('b0000000-0000-0000-0000-000000000153', 'a0000000-0000-0000-0000-000000000015', 'Edit', 'OrganizationModule.Edit'),
    ('b0000000-0000-0000-0000-000000000154', 'a0000000-0000-0000-0000-000000000015', 'Delete', 'OrganizationModule.Delete'),
    -- Backward-compatibility TenantModule actions
    ('b0000000-0000-0000-0000-000000000155', 'a0000000-0000-0000-0000-000000000015', 'View', 'TenantModule.View'),
    ('b0000000-0000-0000-0000-000000000156', 'a0000000-0000-0000-0000-000000000015', 'Add', 'TenantModule.Add'),
    ('b0000000-0000-0000-0000-000000000157', 'a0000000-0000-0000-0000-000000000015', 'Edit', 'TenantModule.Edit'),
    ('b0000000-0000-0000-0000-000000000158', 'a0000000-0000-0000-0000-000000000015', 'Delete', 'TenantModule.Delete'),

    -- DepartmentModule Actions
    ('b0000000-0000-0000-0000-000000000161', 'a0000000-0000-0000-0000-000000000016', 'View', 'DepartmentModule.View'),
    ('b0000000-0000-0000-0000-000000000162', 'a0000000-0000-0000-0000-000000000016', 'Add', 'DepartmentModule.Add'),
    ('b0000000-0000-0000-0000-000000000163', 'a0000000-0000-0000-0000-000000000016', 'Edit', 'DepartmentModule.Edit'),
    ('b0000000-0000-0000-0000-000000000164', 'a0000000-0000-0000-0000-000000000016', 'Delete', 'DepartmentModule.Delete'),

    -- RolePermission Actions
    ('b0000000-0000-0000-0000-000000000171', 'a0000000-0000-0000-0000-000000000017', 'View', 'RolePermission.View'),
    ('b0000000-0000-0000-0000-000000000172', 'a0000000-0000-0000-0000-000000000017', 'Add', 'RolePermission.Add'),
    ('b0000000-0000-0000-0000-000000000173', 'a0000000-0000-0000-0000-000000000017', 'Edit', 'RolePermission.Edit'),
    ('b0000000-0000-0000-0000-000000000174', 'a0000000-0000-0000-0000-000000000017', 'Delete', 'RolePermission.Delete'),

    -- UserPermission Actions
    ('b0000000-0000-0000-0000-000000000181', 'a0000000-0000-0000-0000-000000000018', 'View', 'UserPermission.View'),
    ('b0000000-0000-0000-0000-000000000182', 'a0000000-0000-0000-0000-000000000018', 'Add', 'UserPermission.Add'),
    ('b0000000-0000-0000-0000-000000000183', 'a0000000-0000-0000-0000-000000000018', 'Edit', 'UserPermission.Edit'),
    ('b0000000-0000-0000-0000-000000000184', 'a0000000-0000-0000-0000-000000000018', 'Delete', 'UserPermission.Delete'),

    -- TypeOfLeave Actions
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'View', 'TypeOfLeave.View'),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Add', 'TypeOfLeave.Add'),
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Edit', 'TypeOfLeave.Edit'),
    ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Delete', 'TypeOfLeave.Delete'),

    -- RequestForLeave Actions
    ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000002', 'View', 'RequestForLeave.View'),
    ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000002', 'Add', 'RequestForLeave.Add'),
    ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000002', 'Edit', 'RequestForLeave.Edit'),
    ('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000002', 'Delete', 'RequestForLeave.Delete'),
    ('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000002', 'Approval.Create', 'RequestForLeave.Approval.Create'),

    -- PayrollProcessing Actions
    ('20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000003', 'View', 'PayrollProcessing.View'),
    ('20000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000003', 'Add', 'PayrollProcessing.Add'),
    ('20000000-0000-0000-0000-000000000023', '10000000-0000-0000-0000-000000000003', 'Edit', 'PayrollProcessing.Edit'),
    ('20000000-0000-0000-0000-000000000024', '10000000-0000-0000-0000-000000000003', 'Delete', 'PayrollProcessing.Delete'),

    -- EmployeeProfile Actions
    ('20000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000004', 'View', 'EmployeeProfile.View'),
    ('20000000-0000-0000-0000-000000000032', '10000000-0000-0000-0000-000000000004', 'Add', 'EmployeeProfile.Add'),
    ('20000000-0000-0000-0000-000000000033', '10000000-0000-0000-0000-000000000004', 'Edit', 'EmployeeProfile.Edit'),
    ('20000000-0000-0000-0000-000000000034', '10000000-0000-0000-0000-000000000004', 'Delete', 'EmployeeProfile.Delete')
ON CONFLICT (full_key) DO UPDATE SET action = EXCLUDED.action, module_id = EXCLUDED.module_id;

-- ------------------------------------------------------------------------------
-- 3. SEED ORGANIZATIONS
-- ------------------------------------------------------------------------------
INSERT INTO public.organizations (
    id, code, name, description, industry, tier, domain, status, is_active,
    admin_name, admin_email, admin_username, admin_title, employee_count, start_date, end_date,
    modules
)
VALUES
    (
        '00000000-0000-0000-0000-000000000000',
        'ROOT',
        'SuperAdmin Platform',
        'Platform administration and root governance scope',
        'Technology & Software',
        'Enterprise',
        'jkpayroll.com',
        'Active',
        true,
        'Super Administrator',
        'superadmin@paypulse.internal',
        'superadmin',
        'Chief Systems Architect',
        1,
        '2024-01-01 00:00:00Z',
        NULL,
        '["Organization", "Department", "Profile", "Role", "UserRole", "OrganizationModule", "DepartmentModule", "RolePermission", "UserPermission", "TypeOfLeave", "RequestForLeave", "PayrollProcessing", "EmployeeProfile", "TaxSettings"]'::jsonb
    ),
    (
        '00000000-0000-0000-0000-000000000001',
        'APEX-HLTH',
        'Apex Health Systems',
        'Integrated regional healthcare network & clinical centers',
        'Healthcare & Life Sciences',
        'Enterprise',
        'apexcorp.com',
        'Active',
        true,
        'Alexander Wright',
        'admin@apexcorp.com',
        'awright',
        'Administrator',
        248,
        '2024-01-15 00:00:00Z',
        '2029-12-31 23:59:59Z',
        '["Organization", "Department", "Profile", "Role", "UserRole", "OrganizationModule", "DepartmentModule", "RolePermission", "UserPermission", "TypeOfLeave", "RequestForLeave", "PayrollProcessing", "EmployeeProfile", "TaxSettings"]'::jsonb
    )
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    industry = EXCLUDED.industry,
    tier = EXCLUDED.tier,
    domain = EXCLUDED.domain,
    status = EXCLUDED.status,
    is_active = EXCLUDED.is_active,
    admin_name = EXCLUDED.admin_name,
    admin_email = EXCLUDED.admin_email,
    employee_count = EXCLUDED.employee_count,
    modules = EXCLUDED.modules,
    updated_at = clock_timestamp();

-- ------------------------------------------------------------------------------
-- 4. SEED AUTH USERS & IDENTITIES
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 4.1 SuperAdmin (Primary: superadmin@paypulse.internal / SuperAdmin2026!)
INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'superadmin@paypulse.internal',
    extensions.crypt('SuperAdmin2026!', extensions.gen_salt('bf')),
    clock_timestamp(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Super Administrator"}'::jsonb,
    clock_timestamp(),
    clock_timestamp(),
    '', '', '', '', '', '', '', ''
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = clock_timestamp();

-- 4.2 SuperAdmin (Canonical: superadmin@jkpayroll.com / SuperAdmin2026!)
INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
VALUES (
    '00000000-0000-0000-0000-000000000009',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'superadmin@jkpayroll.com',
    extensions.crypt('SuperAdmin2026!', extensions.gen_salt('bf')),
    clock_timestamp(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Super Administrator (JK)"}'::jsonb,
    clock_timestamp(),
    clock_timestamp(),
    '', '', '', '', '', '', '', ''
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = clock_timestamp();

-- 4.3 Sample Org Admin (Primary: admin@apexcorp.com / ApexAdmin2026!)
INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@apexcorp.com',
    extensions.crypt('ApexAdmin2026!', extensions.gen_salt('bf')),
    clock_timestamp(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Alexander Wright"}'::jsonb,
    clock_timestamp(),
    clock_timestamp(),
    '', '', '', '', '', '', '', ''
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = clock_timestamp();

-- 4.4 Sample Org Admin (Secondary: admin@apexhealth.com / ApexAdmin2026!)
INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
VALUES (
    'e0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@apexhealth.com',
    extensions.crypt('ApexAdmin2026!', extensions.gen_salt('bf')),
    clock_timestamp(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Dr. Aris Thorne"}'::jsonb,
    clock_timestamp(),
    clock_timestamp(),
    '', '', '', '', '', '', '', ''
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = clock_timestamp();

-- 4.5 Supabase GoTrue Auth Identities
INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
SELECT 
    u.id,
    u.id,
    u.id::text,
    jsonb_build_object('sub', u.id::text, 'email', u.email),
    'email',
    clock_timestamp(),
    clock_timestamp(),
    clock_timestamp()
FROM auth.users u
WHERE u.email IN (
    'superadmin@paypulse.internal',
    'superadmin@jkpayroll.com',
    'admin@apexcorp.com',
    'admin@apexhealth.com'
)
ON CONFLICT (provider_id, provider) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    updated_at = clock_timestamp();

-- ------------------------------------------------------------------------------
-- 5. SEED DEPARTMENTS FOR APEX HEALTH SYSTEMS
-- ------------------------------------------------------------------------------
INSERT INTO public.departments (
    id, organization_id, parent_department_id, code, name, description,
    head_user_id, depth, tree_path, is_active
)
VALUES
    (
        'd0000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        NULL,
        'OPG',
        'Office of the Provincial Governor',
        'Executive governance, administrative oversight and strategic cabinet',
        '00000000-0000-0000-0000-000000000002',
        0,
        'opg',
        true
    )
ON CONFLICT (organization_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = clock_timestamp();

-- ------------------------------------------------------------------------------
-- 6. SEED PROFILES
-- ------------------------------------------------------------------------------
INSERT INTO public.profiles (
    id, organization_id, department_id, full_name, email, username, title,
    is_organization_admin, is_super_admin, is_active
)
VALUES
    -- Super Admin (Primary)
    (
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000000',
        NULL,
        'Super Administrator',
        'superadmin@paypulse.internal',
        'superadmin',
        'Chief Systems Architect',
        true,
        true,
        true
    ),
    -- Super Admin (Canonical)
    (
        '00000000-0000-0000-0000-000000000009',
        '00000000-0000-0000-0000-000000000000',
        NULL,
        'Super Administrator (JK)',
        'superadmin@jkpayroll.com',
        'superadmin_jk',
        'Chief Systems Architect',
        true,
        true,
        true
    ),
    -- Sample Org Admin (Alexander Wright)
    (
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000001',
        'Alexander Wright',
        'admin@apexcorp.com',
        'awright',
        'Administrator',
        true,
        false,
        true
    ),
    -- Sample Org Admin (Dr. Aris Thorne)
    (
        'e0000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000001',
        'Dr. Aris Thorne',
        'admin@apexhealth.com',
        'athorne',
        'Chief Operating Officer',
        true,
        false,
        true
    )
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    organization_id = EXCLUDED.organization_id,
    department_id = EXCLUDED.department_id,
    is_organization_admin = EXCLUDED.is_organization_admin,
    is_super_admin = EXCLUDED.is_super_admin,
    is_active = EXCLUDED.is_active,
    updated_at = clock_timestamp();

-- ------------------------------------------------------------------------------
-- 7. SEED SYSTEM & CUSTOM ROLES
-- ------------------------------------------------------------------------------
-- Global SYSTEM roles (organization_id is NULL)
INSERT INTO public.roles (
    id, organization_id, code, name, description, role_type, is_default, is_mutable, is_active
)
VALUES
    (
        'f0000000-0000-0000-0000-000000000001',
        NULL,
        'SUPER_ADMIN',
        'Platform Super Administrator',
        'Full platform-level infrastructure control. Manages system roles, global permission definitions, and tenant provisioning.',
        'SYSTEM',
        true,
        false,
        true
    ),
    (
        'f0000000-0000-0000-0000-000000000002',
        NULL,
        'ADMIN',
        'System Administrator',
        'Platform operator for infrastructure, integrations, and tenant diagnostics',
        'SYSTEM',
        false,
        false,
        true
    ),
    (
        'f0000000-0000-0000-0000-000000000003',
        NULL,
        'EMPLOYEE',
        'Standard Employee',
        'Standard self-service profile for attendance, leave requests, and payslips',
        'SYSTEM',
        true,
        false,
        true
    )
ON CONFLICT (organization_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- Custom Organization Role for Apex Health Systems
INSERT INTO public.roles (
    id, organization_id, code, name, description, role_type, is_default, is_mutable, is_active
)
VALUES
    (
        'f0000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000001',
        'ORG_ADMIN',
        'Organization Administrator',
        'Full administrative management for Apex Health Systems',
        'CUSTOM',
        false,
        true,
        true
    )
ON CONFLICT (organization_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- ------------------------------------------------------------------------------
-- 8. TIER 1: SEED ORGANIZATION MODULES (LICENSED ENTITLEMENTS)
-- ------------------------------------------------------------------------------
INSERT INTO public.organization_modules (organization_id, module_id, allocated_at)
SELECT '00000000-0000-0000-0000-000000000001', id, clock_timestamp()
FROM public.modules
WHERE is_active = true
ON CONFLICT (organization_id, module_id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 9. TIER 2: SEED DEPARTMENT MODULES (DEPARTMENT ALLOCATION CASCADES)
-- ------------------------------------------------------------------------------
INSERT INTO public.department_modules (organization_id, department_id, module_id, allocated_at)
SELECT '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', m.id, clock_timestamp()
FROM public.modules m
WHERE m.is_active = true
ON CONFLICT (organization_id, department_id, module_id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 10. TIER 3: SEED ROLE PERMISSIONS (ORG_ADMIN FULL ACTION TEMPLATE)
-- ------------------------------------------------------------------------------
INSERT INTO public.role_permissions (organization_id, role_id, module_action_id, allocated_at)
SELECT 
    '00000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000004', -- ORG_ADMIN
    ma.id,
    clock_timestamp()
FROM public.module_actions ma
ON CONFLICT (organization_id, role_id, module_action_id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 11. SEED ORGANIZATION MEMBERS (PRIMARY MEMBERSHIP AUTHORITY)
-- ------------------------------------------------------------------------------
INSERT INTO public.organization_members (
    organization_id, user_id, role_id, department_id, is_owner, is_active
)
VALUES
    -- Super Admin (PayPulse Internal)
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000001',
        NULL,
        NULL,
        true,
        true
    ),
    -- Super Admin (Canonical)
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000009',
        NULL,
        NULL,
        true,
        true
    ),
    -- Sample Org Admin (Alexander Wright)
    (
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        'f0000000-0000-0000-0000-000000000004',
        'd0000000-0000-0000-0000-000000000001',
        true,
        true
    ),
    -- Sample Org Admin (Dr. Aris Thorne)
    (
        '00000000-0000-0000-0000-000000000001',
        'e0000000-0000-0000-0000-000000000001',
        'f0000000-0000-0000-0000-000000000004',
        'd0000000-0000-0000-0000-000000000001',
        true,
        true
    )
ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role_id = EXCLUDED.role_id,
    department_id = EXCLUDED.department_id,
    is_owner = EXCLUDED.is_owner,
    is_active = EXCLUDED.is_active,
    updated_at = clock_timestamp();

-- ------------------------------------------------------------------------------
-- 12. SEED USER ROLES (CUSTOM ROLE ASSIGNMENTS)
-- ------------------------------------------------------------------------------
INSERT INTO public.user_roles (organization_id, user_id, role_id)
VALUES
    -- Alexander Wright -> ORG_ADMIN in Apex Health Systems
    (
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        'f0000000-0000-0000-0000-000000000004'
    ),
    -- Dr. Aris Thorne -> ORG_ADMIN in Apex Health Systems
    (
        '00000000-0000-0000-0000-000000000001',
        'e0000000-0000-0000-0000-000000000001',
        'f0000000-0000-0000-0000-000000000004'
    )
ON CONFLICT (organization_id, user_id, role_id) DO NOTHING;
