-- ==============================================================================
-- JK-PAYROLL: DETERMINISTIC CLEAN & SEED SCRIPT (SUPERADMIN INITIALIZATION)
-- Scope: Root Platform Organization, Core RBAC Catalog & Super Admin Credentials
-- Super Admin: superadmin@jkpayroll.com / SuperAdmin123!
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. CLEAN DATABASE (Truncate in relational dependency order)
-- ------------------------------------------------------------------------------
TRUNCATE TABLE 
    public.user_permissions,
    public.role_permissions,
    public.department_modules,
    public.organization_modules,
    public.user_roles,
    public.roles,
    public.profiles,
    public.departments,
    public.organizations
RESTART IDENTITY CASCADE;

-- Delete non-superadmin users from auth.users
DELETE FROM auth.users WHERE email != 'superadmin@jkpayroll.com';

-- ------------------------------------------------------------------------------
-- 1. SEED RBAC SYSTEM MODULES
-- ------------------------------------------------------------------------------
INSERT INTO public.modules (id, code, name, category, description, is_active)
VALUES
    -- Administrative Modules
    ('a0000000-0000-0000-0000-000000000011', 'Organization', 'Organizations & Companies', 'Administration', 'Multi-tenant organization management and isolation settings', true),
    ('a0000000-0000-0000-0000-000000000012', 'Department', 'Department Hierarchy', 'Administration', 'Organizational chart and hierarchical department structure', true),
    ('a0000000-0000-0000-0000-000000000013', 'Profile', 'Staff & User Profiles', 'Administration', 'Employee profile master records and organizational assignments', true),
    ('a0000000-0000-0000-0000-000000000019', 'Role', 'Security Roles', 'Administration', 'Security role definitions and access profile management', true),
    ('a0000000-0000-0000-0000-000000000014', 'UserRole', 'User Role Assignment', 'Administration', 'Assignment of security roles and access scopes to users', true),
    ('a0000000-0000-0000-0000-000000000015', 'OrganizationModule', 'Organization Module Allocation', 'Administration', 'Assignment of licensed modules to organizations', true),
    ('a0000000-0000-0000-0000-000000000016', 'DepartmentModule', 'Department Module Allocation', 'Administration', 'Cascading module entitlements down department tree', true),
    ('a0000000-0000-0000-0000-000000000017', 'RolePermission', 'Role Permission Template', 'Administration', 'Fine-grained permissions mapped to security roles', true),
    ('a0000000-0000-0000-0000-000000000018', 'UserPermission', 'User Direct Permission Overrides', 'Administration', 'Direct action-level overrides per user', true),

    -- Business Modules
    ('10000000-0000-0000-0000-000000000001', 'TypeOfLeave', 'Type Of Leave', 'Settings', 'Leave policies, annual entitlement configurations and statutory caps', true),
    ('10000000-0000-0000-0000-000000000002', 'RequestForLeave', 'Leave Applications & Approvals', 'Transactions', 'Employee leave applications, status workflows and manager approvals', true),
    ('10000000-0000-0000-0000-000000000003', 'PayrollProcessing', 'Payroll Run & Computations', 'Payroll', 'Salary batch computation, tax deductions and disbursements', true)
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
    ('b0000000-0000-0000-0000-000000000201', '10000000-0000-0000-0000-000000000001', 'View', 'TypeOfLeave.View'),
    ('b0000000-0000-0000-0000-000000000202', '10000000-0000-0000-0000-000000000001', 'Add', 'TypeOfLeave.Add'),
    ('b0000000-0000-0000-0000-000000000203', '10000000-0000-0000-0000-000000000001', 'Edit', 'TypeOfLeave.Edit'),
    ('b0000000-0000-0000-0000-000000000204', '10000000-0000-0000-0000-000000000001', 'Delete', 'TypeOfLeave.Delete'),

    -- RequestForLeave Actions
    ('b0000000-0000-0000-0000-000000000211', '10000000-0000-0000-0000-000000000002', 'View', 'RequestForLeave.View'),
    ('b0000000-0000-0000-0000-000000000212', '10000000-0000-0000-0000-000000000002', 'Add', 'RequestForLeave.Add'),
    ('b0000000-0000-0000-0000-000000000213', '10000000-0000-0000-0000-000000000002', 'Edit', 'RequestForLeave.Edit'),
    ('b0000000-0000-0000-0000-000000000214', '10000000-0000-0000-0000-000000000002', 'Delete', 'RequestForLeave.Delete'),
    ('b0000000-0000-0000-0000-000000000215', '10000000-0000-0000-0000-000000000002', 'Approval.Create', 'RequestForLeave.Approval.Create'),

    -- PayrollProcessing Actions
    ('b0000000-0000-0000-0000-000000000221', '10000000-0000-0000-0000-000000000003', 'View', 'PayrollProcessing.View'),
    ('b0000000-0000-0000-0000-000000000222', '10000000-0000-0000-0000-000000000003', 'Add', 'PayrollProcessing.Add'),
    ('b0000000-0000-0000-0000-000000000223', '10000000-0000-0000-0000-000000000003', 'Edit', 'PayrollProcessing.Edit'),
    ('b0000000-0000-0000-0000-000000000224', '10000000-0000-0000-0000-000000000003', 'Delete', 'PayrollProcessing.Delete')
ON CONFLICT (full_key) DO UPDATE SET action = EXCLUDED.action, module_id = EXCLUDED.module_id;

-- ------------------------------------------------------------------------------
-- 3. SEED ROOT PLATFORM ORGANIZATION
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
        'superadmin@jkpayroll.com',
        'superadmin',
        'Chief Systems Architect',
        1,
        '2024-01-01 00:00:00Z',
        NULL,
        '["Organization", "Department", "Profile", "Role", "UserRole", "OrganizationModule", "DepartmentModule", "RolePermission", "UserPermission", "TypeOfLeave", "RequestForLeave", "PayrollProcessing"]'::jsonb
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
-- 4. SEED SUPER ADMIN AUTH USER & PROFILE
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'superadmin@jkpayroll.com',
    extensions.crypt('SuperAdmin123!', extensions.gen_salt('bf')),
    clock_timestamp(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Super Administrator"}'::jsonb,
    clock_timestamp(),
    clock_timestamp(),
    '',
    ''
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = clock_timestamp();

-- Super Admin Auth Identity
INSERT INTO auth.identities (
    id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '{"sub":"00000000-0000-0000-0000-000000000001","email":"superadmin@jkpayroll.com"}'::jsonb,
    'email',
    clock_timestamp(),
    clock_timestamp(),
    clock_timestamp()
)
ON CONFLICT (provider, id) DO NOTHING;

-- Super Admin Profile
INSERT INTO public.profiles (
    id, organization_id, department_id, full_name, email, username, title,
    is_organization_admin, is_super_admin, is_active
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    NULL,
    'Super Administrator',
    'superadmin@jkpayroll.com',
    'superadmin',
    'Chief Systems Architect',
    false,
    true,
    true
)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    is_super_admin = true,
    is_active = true,
    updated_at = clock_timestamp();

-- ------------------------------------------------------------------------------
-- 5. SEED SYSTEM ROLES
-- ------------------------------------------------------------------------------
INSERT INTO public.roles (
    id, organization_id, code, name, description, role_type, is_default, is_mutable, is_active
)
VALUES
    (
        'r0000000-0000-0000-0000-000000000001',
        NULL,
        'SUPER_ADMIN',
        'Super Administrator',
        'Global platform administrator with unrestricted cross-organization authority',
        'SYSTEM',
        false,
        false,
        true
    ),
    (
        'r0000000-0000-0000-0000-000000000002',
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
        'r0000000-0000-0000-0000-000000000003',
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

-- ------------------------------------------------------------------------------
-- 6. ASSIGN SUPER ADMIN ROLE
-- ------------------------------------------------------------------------------
INSERT INTO public.user_roles (organization_id, user_id, role_id)
VALUES
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000001',
        'r0000000-0000-0000-0000-000000000001'
    )
ON CONFLICT (organization_id, user_id, role_id) DO NOTHING;
