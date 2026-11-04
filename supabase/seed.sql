-- ==============================================================================
-- JK-PAYROLL: ROOT SEED SCRIPT (ENTRYPOINT FOR SUPABASE CLI & FRESH SEEDING)
-- Focus: Organizations, Departments Hierarchy, Roles, User Roles & Profiles
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
    ('a0000000-0000-0000-0000-000000000011', 'Organization', 'Organizations & Companies', 'Administration', 'Multi-tenant organization management and isolation settings', true),
    ('a0000000-0000-0000-0000-000000000012', 'Department', 'Department Hierarchy', 'Administration', 'Organizational chart and hierarchical department structure', true),
    ('a0000000-0000-0000-0000-000000000013', 'Profile', 'Staff & User Profiles', 'Administration', 'Employee profile master records and organizational assignments', true),
    ('a0000000-0000-0000-0000-000000000014', 'UserRole', 'User Role Assignment', 'Administration', 'Assignment of security roles and access scopes to users', true),
    ('a0000000-0000-0000-0000-000000000015', 'OrganizationModule', 'Organization Module Allocation', 'Administration', 'Assignment of licensed modules to organizations', true),
    ('a0000000-0000-0000-0000-000000000016', 'DepartmentModule', 'Department Module Allocation', 'Administration', 'Cascading module entitlements down department tree', true),
    ('a0000000-0000-0000-0000-000000000017', 'RolePermission', 'Role Permission Template', 'Administration', 'Fine-grained permissions mapped to security roles', true),
    ('a0000000-0000-0000-0000-000000000018', 'UserPermission', 'User Direct Permission Overrides', 'Administration', 'Direct action-level overrides per user', true)
ON CONFLICT (code) DO UPDATE 
SET 
    name = EXCLUDED.name,
    category = EXCLUDED.category,
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

    -- UserRole Actions
    ('b0000000-0000-0000-0000-000000000141', 'a0000000-0000-0000-0000-000000000014', 'View', 'UserRole.View'),
    ('b0000000-0000-0000-0000-000000000142', 'a0000000-0000-0000-0000-000000000014', 'Add', 'UserRole.Add'),
    ('b0000000-0000-0000-0000-000000000143', 'a0000000-0000-0000-0000-000000000014', 'Edit', 'UserRole.Edit'),
    ('b0000000-0000-0000-0000-000000000144', 'a0000000-0000-0000-0000-000000000014', 'Delete', 'UserRole.Delete')
ON CONFLICT (full_key) DO UPDATE SET action = EXCLUDED.action, module_id = EXCLUDED.module_id;

-- ------------------------------------------------------------------------------
-- 3. SEED ORGANIZATIONS
-- ------------------------------------------------------------------------------
INSERT INTO public.organizations (
    id, code, name, description, industry, tier, domain, status, is_active,
    admin_name, admin_email, admin_username, admin_title, employee_count, start_date, end_date
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
        NULL
    ),
    (
        '00000000-0000-0000-0000-000000000001',
        'APEX-HLTH',
        'Apex Health Systems',
        'Integrated regional healthcare network & clinical centers',
        'Healthcare & Life Sciences',
        'Enterprise',
        'apexhealth.com',
        'Active',
        true,
        'Dr. Aris Thorne',
        'admin@apexhealth.com',
        'athorne',
        'Chief Operating Officer',
        248,
        '2024-01-15 00:00:00Z',
        '2029-12-31 23:59:59Z'
    ),
    (
        '00000000-0000-0000-0000-000000000002',
        'TECH-SOL',
        'TechSol Dynamics',
        'Cloud infrastructure, microservices, and AI products',
        'Technology & Software',
        'Growth',
        'techsol.io',
        'Active',
        true,
        'Sarah Vance',
        'svance@techsol.io',
        'svance',
        'VP of Engineering',
        114,
        '2024-03-01 00:00:00Z',
        '2028-12-31 23:59:59Z'
    ),
    (
        '00000000-0000-0000-0000-000000000003',
        'FIN-EDGE',
        'FinEdge Global',
        'Global settlement routing, algorithmic treasury & asset management',
        'Financial Services & Banking',
        'Enterprise',
        'finedge.com',
        'Active',
        true,
        'Marcus Sterling',
        'msterling@finedge.com',
        'msterling',
        'Chief Financial Officer',
        380,
        '2024-02-01 00:00:00Z',
        '2030-06-30 23:59:59Z'
    ),
    (
        '00000000-0000-0000-0000-000000000004',
        'LOGI-CORP',
        'LogiCorp Freight',
        'Cross-border freight forwarding & multi-modal transport',
        'Manufacturing & Logistics',
        'Growth',
        'logicorp.net',
        'Active',
        true,
        'Elena Rossi',
        'erossi@logicorp.net',
        'erossi',
        'Director of Operations',
        85,
        '2024-04-10 00:00:00Z',
        '2027-12-31 23:59:59Z'
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
-- 5. SEED SAMPLE USERS & PROFILES FOR ORGANIZATIONS
-- ------------------------------------------------------------------------------
-- 1) Dr. Aris Thorne (Org Admin for Apex Health)
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
    'u0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'admin@apexhealth.com', extensions.crypt('Admin123!', extensions.gen_salt('bf')), clock_timestamp(),
    '{"provider":"email"}'::jsonb, '{"full_name":"Dr. Aris Thorne"}'::jsonb, clock_timestamp(), clock_timestamp()
) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

INSERT INTO public.profiles (id, organization_id, full_name, email, username, title, is_organization_admin, is_super_admin, is_active)
VALUES (
    'u0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
    'Dr. Aris Thorne', 'admin@apexhealth.com', 'athorne', 'Chief Operating Officer', true, false, true
) ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, organization_id = EXCLUDED.organization_id;

-- 2) David Chen (Department Head: IT)
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
    'u0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'dchen@apexhealth.com', extensions.crypt('User123!', extensions.gen_salt('bf')), clock_timestamp(),
    '{"provider":"email"}'::jsonb, '{"full_name":"David Chen"}'::jsonb, clock_timestamp(), clock_timestamp()
) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

INSERT INTO public.profiles (id, organization_id, full_name, email, username, title, is_organization_admin, is_super_admin, is_active)
VALUES (
    'u0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
    'David Chen', 'dchen@apexhealth.com', 'dchen', 'Director of Information Technology', false, false, true
) ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, organization_id = EXCLUDED.organization_id;

-- 3) Maria Garcia (Department Head: HR)
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
    'u0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'mgarcia@apexhealth.com', extensions.crypt('User123!', extensions.gen_salt('bf')), clock_timestamp(),
    '{"provider":"email"}'::jsonb, '{"full_name":"Maria Garcia"}'::jsonb, clock_timestamp(), clock_timestamp()
) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

INSERT INTO public.profiles (id, organization_id, full_name, email, username, title, is_organization_admin, is_super_admin, is_active)
VALUES (
    'u0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
    'Maria Garcia', 'mgarcia@apexhealth.com', 'mgarcia', 'Head of Human Resources', false, false, true
) ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, organization_id = EXCLUDED.organization_id;

-- ------------------------------------------------------------------------------
-- 6. SEED DEPARTMENTS HIERARCHY FOR APEX HEALTH SYSTEMS
-- ------------------------------------------------------------------------------
INSERT INTO public.departments (
    id, organization_id, parent_department_id, code, name, description,
    head_user_id, depth, tree_path, is_active
)
VALUES
    -- Depth 0 (Top-Level Head Departments)
    (
        'd0000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        NULL,
        'OPG',
        'Office of the Provincial Governor',
        'Executive governance, administrative oversight and strategic cabinet',
        'u0000000-0000-0000-0000-000000000001',
        0,
        'opg',
        true
    ),
    (
        'd0000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000001',
        NULL,
        'HR',
        'Human Resources & Talent Management',
        'Workforce planning, talent acquisition, total rewards and employee welfare',
        'u0000000-0000-0000-0000-000000000003',
        0,
        'hr',
        true
    ),
    (
        'd0000000-0000-0000-0000-000000000007',
        '00000000-0000-0000-0000-000000000001',
        NULL,
        'FIN',
        'Finance & Accounting Department',
        'Fiscal compliance, corporate budget planning, auditing and financial statements',
        NULL,
        0,
        'fin',
        true
    ),
    (
        'd0000000-0000-0000-0000-000000000009',
        '00000000-0000-0000-0000-000000000001',
        NULL,
        'MED-CLINIC',
        'Clinical Services & Inpatient Wing',
        'Hospital operations, inpatient emergency wards and patient care services',
        NULL,
        0,
        'med-clinic',
        true
    ),

    -- Depth 1 (Sub-Departments)
    (
        'd0000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000001',
        'OPG-ITD',
        'IT Division',
        'IT infrastructure, software development, cloud systems and digital services',
        'u0000000-0000-0000-0000-000000000002',
        1,
        'opg/opg-itd',
        true
    ),
    (
        'd0000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000001',
        'OPG-PIO',
        'Public Information Office',
        'Media releases, citizen communications and public broadcast relations',
        NULL,
        1,
        'opg/opg-pio',
        true
    ),
    (
        'd0000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000004',
        'HR-PAYROLL',
        'Compensation & Payroll Administration',
        'Bi-monthly payroll execution, deductions, and statutory reporting',
        NULL,
        1,
        'hr/hr-payroll',
        true
    ),
    (
        'd0000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000004',
        'HR-RECRUIT',
        'Talent Acquisition & Sourcing',
        'Recruiting pipelines, interviews, background checks and onboarding',
        NULL,
        1,
        'hr/hr-recruit',
        true
    ),
    (
        'd0000000-0000-0000-0000-000000000008',
        '00000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000007',
        'FIN-AUDIT',
        'Internal Audit & Compliance Division',
        'Quarterly revenue audits, tax reconciliation and anti-fraud monitoring',
        NULL,
        1,
        'fin/fin-audit',
        true
    ),

    -- Depth 2 (Operational Units)
    (
        'd0000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000002',
        'ITD-SEC',
        'Cybersecurity & Infrastructure Unit',
        'Zero trust security, network hardening, firewall and server operations',
        NULL,
        2,
        'opg/opg-itd/itd-sec',
        true
    ),
    (
        'd0000000-0000-0000-0000-000000000011',
        '00000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000002',
        'ITD-DEV',
        'Software Engineering & Cloud Unit',
        'Core payroll APIs, microservices maintenance and DevOps pipelines',
        NULL,
        2,
        'opg/opg-itd/itd-dev',
        true
    ),
    (
        'd0000000-0000-0000-0000-000000000012',
        '00000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000005',
        'PAY-TAX',
        'Statutory Taxes & Deductions Unit',
        'BIR tax withholding calculation, SSS, PhilHealth and Pag-IBIG remittances',
        NULL,
        2,
        'hr/hr-payroll/pay-tax',
        true
    )
ON CONFLICT (organization_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    parent_department_id = EXCLUDED.parent_department_id,
    head_user_id = EXCLUDED.head_user_id,
    is_active = EXCLUDED.is_active,
    updated_at = clock_timestamp();

-- Link profiles to departments
UPDATE public.profiles SET department_id = 'd0000000-0000-0000-0000-000000000002' WHERE id = 'u0000000-0000-0000-0000-000000000002';
UPDATE public.profiles SET department_id = 'd0000000-0000-0000-0000-000000000004' WHERE id = 'u0000000-0000-0000-0000-000000000003';

-- ------------------------------------------------------------------------------
-- 7. SEED SYSTEM & CUSTOM ROLES
-- ------------------------------------------------------------------------------
-- Global SYSTEM roles (organization_id is NULL)
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

-- Custom Organization Roles for Apex Health Systems
INSERT INTO public.roles (
    id, organization_id, code, name, description, role_type, is_default, is_mutable, is_active
)
VALUES
    (
        'r0000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000001',
        'ORG_ADMIN',
        'Organization Administrator',
        'Full administrative management for Apex Health Systems',
        'CUSTOM',
        false,
        true,
        true
    ),
    (
        'r0000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000001',
        'HR_MANAGER',
        'HR & Payroll Manager',
        'Lead human resources manager controlling payroll cycles and benefits',
        'CUSTOM',
        false,
        true,
        true
    ),
    (
        'r0000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000001',
        'DEPT_HEAD',
        'Department Head',
        'Departmental supervisory lead with approval rights over subordinate units',
        'CUSTOM',
        false,
        true,
        true
    ),
    (
        'r0000000-0000-0000-0000-000000000007',
        '00000000-0000-0000-0000-000000000001',
        'PAYROLL_OFFICER',
        'Payroll Officer',
        'Manages compensation cycles, tax statutory deduction calculation, and payslips',
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
-- 8. ASSIGN USER ROLES
-- ------------------------------------------------------------------------------
INSERT INTO public.user_roles (organization_id, user_id, role_id)
VALUES
    -- Super Admin -> SUPER_ADMIN
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000001',
        'r0000000-0000-0000-0000-000000000001'
    ),
    -- Dr. Aris Thorne -> ORG_ADMIN in Apex Health
    (
        '00000000-0000-0000-0000-000000000001',
        'u0000000-0000-0000-0000-000000000001',
        'r0000000-0000-0000-0000-000000000004'
    ),
    -- David Chen -> DEPT_HEAD in Apex Health
    (
        '00000000-0000-0000-0000-000000000001',
        'u0000000-0000-0000-0000-000000000002',
        'r0000000-0000-0000-0000-000000000006'
    ),
    -- Maria Garcia -> HR_MANAGER in Apex Health
    (
        '00000000-0000-0000-0000-000000000001',
        'u0000000-0000-0000-0000-000000000003',
        'r0000000-0000-0000-0000-000000000005'
    )
ON CONFLICT (organization_id, user_id, role_id) DO NOTHING;
