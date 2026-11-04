-- ==============================================================================
-- JK-PAYROLL: SEED CANONICAL DEFAULT SYSTEM USER ROLES
-- Migration: 20261104000005_seed_default_user_roles.sql
-- ==============================================================================

-- 1. SUPER_ADMIN
INSERT INTO public.roles (id, organization_id, code, name, description, role_type, is_default, is_mutable, is_active)
VALUES (
    'f0000000-0000-0000-0000-000000000001',
    NULL,
    'SUPER_ADMIN',
    'Platform Super Administrator',
    'Full platform-level infrastructure control. Manages system roles, global permission definitions, and tenant provisioning. No access to sensitive tenant payroll data.',
    'SYSTEM',
    true,
    false,
    true
)
ON CONFLICT (id) DO UPDATE SET
    code = 'SUPER_ADMIN',
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    role_type = 'SYSTEM',
    is_default = true,
    is_mutable = false,
    is_active = true,
    updated_at = clock_timestamp();

-- 2. TENANT_ADMIN (Replaces legacy ADMIN id f...02 or creates new)
INSERT INTO public.roles (id, organization_id, code, name, description, role_type, is_default, is_mutable, is_active)
VALUES (
    'f0000000-0000-0000-0000-000000000002',
    NULL,
    'TENANT_ADMIN',
    'Organization Administrator',
    'Administrative authority within the organization. Configures departments, cost centers, positions, shifts, and manages tenant user invitations and role assignments.',
    'SYSTEM',
    true,
    false,
    true
)
ON CONFLICT (id) DO UPDATE SET
    code = 'TENANT_ADMIN',
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    role_type = 'SYSTEM',
    is_default = true,
    is_mutable = false,
    is_active = true,
    updated_at = clock_timestamp();

-- 3. EMPLOYEE (Replaces/updates legacy EMPLOYEE id f...03)
INSERT INTO public.roles (id, organization_id, code, name, description, role_type, is_default, is_mutable, is_active)
VALUES (
    'f0000000-0000-0000-0000-000000000003',
    NULL,
    'EMPLOYEE',
    'Employee (Self-Service)',
    'Standard self-service access. Restricted strictly to personal records: viewing and downloading payslips, BIR Form 2316, personal DTR logs, and filing leave requests.',
    'SYSTEM',
    true,
    false,
    true
)
ON CONFLICT (id) DO UPDATE SET
    code = 'EMPLOYEE',
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    role_type = 'SYSTEM',
    is_default = true,
    is_mutable = false,
    is_active = true,
    updated_at = clock_timestamp();

-- 4. TIMEKEEPER
INSERT INTO public.roles (id, organization_id, code, name, description, role_type, is_default, is_mutable, is_active)
VALUES (
    'f0000000-0000-0000-0000-000000000008',
    NULL,
    'TIMEKEEPER',
    'HR / Timekeeper',
    'Manages time and attendance operations, biometric punch sync, DTR corrections, shift assignments, and cutoff timesheet locks. Restricted from viewing compensation rates.',
    'SYSTEM',
    true,
    false,
    true
)
ON CONFLICT (id) DO UPDATE SET
    code = 'TIMEKEEPER',
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    role_type = 'SYSTEM',
    is_default = true,
    is_mutable = false,
    is_active = true,
    updated_at = clock_timestamp();

-- 5. PAYROLL_OFFICER (Global System Role)
INSERT INTO public.roles (id, organization_id, code, name, description, role_type, is_default, is_mutable, is_active)
VALUES (
    'f0000000-0000-0000-0000-000000000009',
    NULL,
    'PAYROLL_OFFICER',
    'Payroll Specialist',
    'Prepares and executes payroll calculations. Manages earnings, recurring allowances, loan ledgers, statutory contributions, and generates draft payroll registers.',
    'SYSTEM',
    true,
    false,
    true
)
ON CONFLICT (id) DO UPDATE SET
    code = 'PAYROLL_OFFICER',
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    role_type = 'SYSTEM',
    is_default = true,
    is_mutable = false,
    is_active = true,
    updated_at = clock_timestamp();

-- 6. PAYROLL_APPROVER
INSERT INTO public.roles (id, organization_id, code, name, description, role_type, is_default, is_mutable, is_active)
VALUES (
    'f0000000-0000-0000-0000-00000000000a',
    NULL,
    'PAYROLL_APPROVER',
    'Certifying Officer / Approver',
    'Reviews computed payroll registers, variance audits, and statutory summaries. Authorizes or rejects payroll runs. Cannot compute runs or generate payout files.',
    'SYSTEM',
    true,
    false,
    true
)
ON CONFLICT (id) DO UPDATE SET
    code = 'PAYROLL_APPROVER',
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    role_type = 'SYSTEM',
    is_default = true,
    is_mutable = false,
    is_active = true,
    updated_at = clock_timestamp();

-- 7. DISBURSING_OFFICER
INSERT INTO public.roles (id, organization_id, code, name, description, role_type, is_default, is_mutable, is_active)
VALUES (
    'f0000000-0000-0000-0000-00000000000b',
    NULL,
    'DISBURSING_OFFICER',
    'Disbursing Officer / Cashier',
    'Handles payout realization for approved payroll runs. Generates bank electronic advice files (e.g., LandBank, DBP, BDO Network Bank), e-wallet batches, and cash vouchers.',
    'SYSTEM',
    true,
    false,
    true
)
ON CONFLICT (id) DO UPDATE SET
    code = 'DISBURSING_OFFICER',
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    role_type = 'SYSTEM',
    is_default = true,
    is_mutable = false,
    is_active = true,
    updated_at = clock_timestamp();
