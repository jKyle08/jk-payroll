-- ==============================================================================
-- JK-PAYROLL: SEED SCRIPT (20261101000001_seed_catalog.sql)
-- Cleans database, seeds core administrative & RBAC modules, and provisions Super Admin
-- Modules: Tenant, Department, Profile, UserRole, TenantModule, DepartmentModule,
--          RolePermission, UserPermission
-- Credentials: superadmin@jkpayroll.com / SuperAdmin123!
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. CLEAN DATABASE (Truncate business & tenant entities)
-- ------------------------------------------------------------------------------
TRUNCATE TABLE 
    public.leave_requests,
    public.leave_types,
    public.user_permissions,
    public.role_permissions,
    public.department_modules,
    public.tenant_modules,
    public.user_roles,
    public.roles,
    public.profiles,
    public.departments,
    public.tenants
RESTART IDENTITY CASCADE;

-- Remove non-superadmin auth users
DELETE FROM auth.users WHERE email != 'superadmin@jkpayroll.com';

-- ------------------------------------------------------------------------------
-- 1. SEED ADMINISTRATIVE & RBAC SYSTEM MODULES
-- ------------------------------------------------------------------------------
INSERT INTO public.modules (id, code, name, category, is_active)
VALUES
    ('a0000000-0000-0000-0000-000000000011', 'Tenant', 'Tenants & Organizations', 'Administration', true),
    ('a0000000-0000-0000-0000-000000000012', 'Department', 'Department Hierarchy', 'Administration', true),
    ('a0000000-0000-0000-0000-000000000013', 'Profile', 'Staff & User Profiles', 'Administration', true),
    ('a0000000-0000-0000-0000-000000000014', 'UserRole', 'User Role Assignment', 'Administration', true),
    ('a0000000-0000-0000-0000-000000000015', 'TenantModule', 'Tenant Module Allocation', 'Administration', true),
    ('a0000000-0000-0000-0000-000000000016', 'DepartmentModule', 'Department Module Allocation', 'Administration', true),
    ('a0000000-0000-0000-0000-000000000017', 'RolePermission', 'Role Permission Template', 'Administration', true),
    ('a0000000-0000-0000-0000-000000000018', 'UserPermission', 'User Direct Permission Overrides', 'Administration', true)
ON CONFLICT (code) DO UPDATE 
SET 
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    is_active = EXCLUDED.is_active;

-- ------------------------------------------------------------------------------
-- 2. SEED MODULE ACTIONS FOR ADMINISTRATIVE & RBAC MODULES
-- ------------------------------------------------------------------------------

-- Administrative Actions: Tenant
INSERT INTO public.module_actions (id, module_id, action, full_key)
VALUES
    ('b0000000-0000-0000-0000-000000000111', 'a0000000-0000-0000-0000-000000000011', 'View', 'Tenant.View'),
    ('b0000000-0000-0000-0000-000000000112', 'a0000000-0000-0000-0000-000000000011', 'Add', 'Tenant.Add'),
    ('b0000000-0000-0000-0000-000000000113', 'a0000000-0000-0000-0000-000000000011', 'Edit', 'Tenant.Edit'),
    ('b0000000-0000-0000-0000-000000000114', 'a0000000-0000-0000-0000-000000000011', 'Delete', 'Tenant.Delete')
ON CONFLICT (full_key) DO UPDATE SET action = EXCLUDED.action, module_id = EXCLUDED.module_id;

-- Administrative Actions: Department
INSERT INTO public.module_actions (id, module_id, action, full_key)
VALUES
    ('b0000000-0000-0000-0000-000000000121', 'a0000000-0000-0000-0000-000000000012', 'View', 'Department.View'),
    ('b0000000-0000-0000-0000-000000000122', 'a0000000-0000-0000-0000-000000000012', 'Add', 'Department.Add'),
    ('b0000000-0000-0000-0000-000000000123', 'a0000000-0000-0000-0000-000000000012', 'Edit', 'Department.Edit'),
    ('b0000000-0000-0000-0000-000000000124', 'a0000000-0000-0000-0000-000000000012', 'Delete', 'Department.Delete')
ON CONFLICT (full_key) DO UPDATE SET action = EXCLUDED.action, module_id = EXCLUDED.module_id;

-- Administrative Actions: Profile
INSERT INTO public.module_actions (id, module_id, action, full_key)
VALUES
    ('b0000000-0000-0000-0000-000000000131', 'a0000000-0000-0000-0000-000000000013', 'View', 'Profile.View'),
    ('b0000000-0000-0000-0000-000000000132', 'a0000000-0000-0000-0000-000000000013', 'Add', 'Profile.Add'),
    ('b0000000-0000-0000-0000-000000000133', 'a0000000-0000-0000-0000-000000000013', 'Edit', 'Profile.Edit'),
    ('b0000000-0000-0000-0000-000000000134', 'a0000000-0000-0000-0000-000000000013', 'Delete', 'Profile.Delete')
ON CONFLICT (full_key) DO UPDATE SET action = EXCLUDED.action, module_id = EXCLUDED.module_id;

-- Administrative Actions: UserRole
INSERT INTO public.module_actions (id, module_id, action, full_key)
VALUES
    ('b0000000-0000-0000-0000-000000000141', 'a0000000-0000-0000-0000-000000000014', 'View', 'UserRole.View'),
    ('b0000000-0000-0000-0000-000000000142', 'a0000000-0000-0000-0000-000000000014', 'Add', 'UserRole.Add'),
    ('b0000000-0000-0000-0000-000000000143', 'a0000000-0000-0000-0000-000000000014', 'Edit', 'UserRole.Edit'),
    ('b0000000-0000-0000-0000-000000000144', 'a0000000-0000-0000-0000-000000000014', 'Delete', 'UserRole.Delete')
ON CONFLICT (full_key) DO UPDATE SET action = EXCLUDED.action, module_id = EXCLUDED.module_id;

-- Administrative Actions: TenantModule (Tenant Permissions)
INSERT INTO public.module_actions (id, module_id, action, full_key)
VALUES
    ('b0000000-0000-0000-0000-000000000151', 'a0000000-0000-0000-0000-000000000015', 'View', 'TenantModule.View'),
    ('b0000000-0000-0000-0000-000000000152', 'a0000000-0000-0000-0000-000000000015', 'Add', 'TenantModule.Add'),
    ('b0000000-0000-0000-0000-000000000153', 'a0000000-0000-0000-0000-000000000015', 'Edit', 'TenantModule.Edit'),
    ('b0000000-0000-0000-0000-000000000154', 'a0000000-0000-0000-0000-000000000015', 'Delete', 'TenantModule.Delete')
ON CONFLICT (full_key) DO UPDATE SET action = EXCLUDED.action, module_id = EXCLUDED.module_id;

-- Administrative Actions: DepartmentModule (Department Permissions)
INSERT INTO public.module_actions (id, module_id, action, full_key)
VALUES
    ('b0000000-0000-0000-0000-000000000161', 'a0000000-0000-0000-0000-000000000016', 'View', 'DepartmentModule.View'),
    ('b0000000-0000-0000-0000-000000000162', 'a0000000-0000-0000-0000-000000000016', 'Add', 'DepartmentModule.Add'),
    ('b0000000-0000-0000-0000-000000000163', 'a0000000-0000-0000-0000-000000000016', 'Edit', 'DepartmentModule.Edit'),
    ('b0000000-0000-0000-0000-000000000164', 'a0000000-0000-0000-0000-000000000016', 'Delete', 'DepartmentModule.Delete')
ON CONFLICT (full_key) DO UPDATE SET action = EXCLUDED.action, module_id = EXCLUDED.module_id;

-- Administrative Actions: RolePermission (Role Permissions)
INSERT INTO public.module_actions (id, module_id, action, full_key)
VALUES
    ('b0000000-0000-0000-0000-000000000171', 'a0000000-0000-0000-0000-000000000017', 'View', 'RolePermission.View'),
    ('b0000000-0000-0000-0000-000000000172', 'a0000000-0000-0000-0000-000000000017', 'Add', 'RolePermission.Add'),
    ('b0000000-0000-0000-0000-000000000173', 'a0000000-0000-0000-0000-000000000017', 'Edit', 'RolePermission.Edit'),
    ('b0000000-0000-0000-0000-000000000174', 'a0000000-0000-0000-0000-000000000017', 'Delete', 'RolePermission.Delete')
ON CONFLICT (full_key) DO UPDATE SET action = EXCLUDED.action, module_id = EXCLUDED.module_id;

-- Administrative Actions: UserPermission (User Permissions)
INSERT INTO public.module_actions (id, module_id, action, full_key)
VALUES
    ('b0000000-0000-0000-0000-000000000181', 'a0000000-0000-0000-0000-000000000018', 'View', 'UserPermission.View'),
    ('b0000000-0000-0000-0000-000000000182', 'a0000000-0000-0000-0000-000000000018', 'Add', 'UserPermission.Add'),
    ('b0000000-0000-0000-0000-000000000183', 'a0000000-0000-0000-0000-000000000018', 'Edit', 'UserPermission.Edit'),
    ('b0000000-0000-0000-0000-000000000184', 'a0000000-0000-0000-0000-000000000018', 'Delete', 'UserPermission.Delete')
ON CONFLICT (full_key) DO UPDATE SET action = EXCLUDED.action, module_id = EXCLUDED.module_id;

-- ------------------------------------------------------------------------------
-- 3. SEED SYSTEM ROOT TENANT
-- ------------------------------------------------------------------------------
INSERT INTO public.tenants (id, name, code, is_active)
VALUES ('00000000-0000-0000-0000-000000000000', 'System Root', 'ROOT', true)
ON CONFLICT (code) DO UPDATE SET is_active = true;

-- ------------------------------------------------------------------------------
-- 4. SEED SUPER ADMIN USER
-- Email: superadmin@jkpayroll.com
-- Password: SuperAdmin123!
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
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

-- Supabase GoTrue Auth Identity
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
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

-- Super Admin Profile in public.profiles
INSERT INTO public.profiles (
    id,
    tenant_id,
    department_id,
    full_name,
    email,
    is_tenant_admin,
    is_super_admin,
    is_active
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    NULL,
    'Super Administrator',
    'superadmin@jkpayroll.com',
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
