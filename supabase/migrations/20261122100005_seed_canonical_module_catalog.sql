-- ==============================================================================
-- JK-PAYROLL / PAYPULSE: FORWARD MIGRATION (Phase 3.0A Prerequisite)
-- Migration: 20261122100005_seed_canonical_module_catalog.sql
-- Description: Idempotently seeds canonical platform modules and module actions
--              into public.modules and public.module_actions for live environments.
-- ==============================================================================

INSERT INTO public.modules (id, code, name, category, description, is_active)
VALUES
    ('a0000000-0000-0000-0000-000000000011', 'Organization', 'Organizations & Companies', 'Administration', 'Multi-tenant organization management and isolation settings', true),
    ('a0000000-0000-0000-0000-000000000012', 'Department', 'Department Hierarchy', 'Administration', 'Organizational chart and hierarchical department structure', true),
    ('a0000000-0000-0000-0000-000000000013', 'Profile', 'Staff & User Profiles', 'Administration', 'Employee profile master records and organizational assignments', true),
    ('a0000000-0000-0000-0000-000000000019', 'Role', 'Role Management', 'Administration', 'Security role definitions and access profile management', true),
    ('a0000000-0000-0000-0000-000000000014', 'UserRole', 'User Role Assignment', 'Administration', 'Assignment of security roles and access scopes to users', true),
    ('a0000000-0000-0000-0000-000000000015', 'OrganizationModule', 'Organization Module Allocation', 'Administration', 'Organization subscription and feature entitlement allocations', true),
    ('a0000000-0000-0000-0000-000000000016', 'DepartmentModule', 'Department Module Allocation', 'Administration', 'Departmental feature enablement cascading from tenant allocations', true),
    ('a0000000-0000-0000-0000-000000000017', 'RolePermission', 'Role Permission Template', 'Administration', 'Role-based default permission templates and matrices', true),
    ('a0000000-0000-0000-0000-000000000018', 'UserPermission', 'User Direct Permission Overrides', 'Administration', 'Per-user explicit grant and revoke overrides', true),
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

-- Module Actions
INSERT INTO public.module_actions (id, module_id, action, full_key)
VALUES
    -- Organization
    ('b0000000-0000-0000-0000-000000000111', 'a0000000-0000-0000-0000-000000000011', 'View', 'Organization.View'),
    ('b0000000-0000-0000-0000-000000000112', 'a0000000-0000-0000-0000-000000000011', 'Add', 'Organization.Add'),
    ('b0000000-0000-0000-0000-000000000113', 'a0000000-0000-0000-0000-000000000011', 'Edit', 'Organization.Edit'),
    ('b0000000-0000-0000-0000-000000000114', 'a0000000-0000-0000-0000-000000000011', 'Delete', 'Organization.Delete'),
    -- Backward-compatibility Tenant actions mapped to Organization module
    ('b0000000-0000-0000-0000-000000000115', 'a0000000-0000-0000-0000-000000000011', 'View', 'Tenant.View'),
    ('b0000000-0000-0000-0000-000000000116', 'a0000000-0000-0000-0000-000000000011', 'Add', 'Tenant.Add'),
    ('b0000000-0000-0000-0000-000000000117', 'a0000000-0000-0000-0000-000000000011', 'Edit', 'Tenant.Edit'),
    ('b0000000-0000-0000-0000-000000000118', 'a0000000-0000-0000-0000-000000000011', 'Delete', 'Tenant.Delete'),

    -- Department
    ('b0000000-0000-0000-0000-000000000121', 'a0000000-0000-0000-0000-000000000012', 'View', 'Department.View'),
    ('b0000000-0000-0000-0000-000000000122', 'a0000000-0000-0000-0000-000000000012', 'Add', 'Department.Add'),
    ('b0000000-0000-0000-0000-000000000123', 'a0000000-0000-0000-0000-000000000012', 'Edit', 'Department.Edit'),
    ('b0000000-0000-0000-0000-000000000124', 'a0000000-0000-0000-0000-000000000012', 'Delete', 'Department.Delete'),

    -- Profile
    ('b0000000-0000-0000-0000-000000000131', 'a0000000-0000-0000-0000-000000000013', 'View', 'Profile.View'),
    ('b0000000-0000-0000-0000-000000000132', 'a0000000-0000-0000-0000-000000000013', 'Add', 'Profile.Add'),
    ('b0000000-0000-0000-0000-000000000133', 'a0000000-0000-0000-0000-000000000013', 'Edit', 'Profile.Edit'),
    ('b0000000-0000-0000-0000-000000000134', 'a0000000-0000-0000-0000-000000000013', 'Delete', 'Profile.Delete'),

    -- Role
    ('b0000000-0000-0000-0000-000000000191', 'a0000000-0000-0000-0000-000000000019', 'View', 'Role.View'),
    ('b0000000-0000-0000-0000-000000000192', 'a0000000-0000-0000-0000-000000000019', 'Add', 'Role.Add'),
    ('b0000000-0000-0000-0000-000000000193', 'a0000000-0000-0000-0000-000000000019', 'Edit', 'Role.Edit'),
    ('b0000000-0000-0000-0000-000000000194', 'a0000000-0000-0000-0000-000000000019', 'Delete', 'Role.Delete'),

    -- UserRole
    ('b0000000-0000-0000-0000-000000000141', 'a0000000-0000-0000-0000-000000000014', 'View', 'UserRole.View'),
    ('b0000000-0000-0000-0000-000000000142', 'a0000000-0000-0000-0000-000000000014', 'Add', 'UserRole.Add'),
    ('b0000000-0000-0000-0000-000000000143', 'a0000000-0000-0000-0000-000000000014', 'Edit', 'UserRole.Edit'),
    ('b0000000-0000-0000-0000-000000000144', 'a0000000-0000-0000-0000-000000000014', 'Delete', 'UserRole.Delete'),

    -- OrganizationModule
    ('b0000000-0000-0000-0000-000000000151', 'a0000000-0000-0000-0000-000000000015', 'View', 'OrganizationModule.View'),
    ('b0000000-0000-0000-0000-000000000152', 'a0000000-0000-0000-0000-000000000015', 'Add', 'OrganizationModule.Add'),
    ('b0000000-0000-0000-0000-000000000153', 'a0000000-0000-0000-0000-000000000015', 'Edit', 'OrganizationModule.Edit'),
    ('b0000000-0000-0000-0000-000000000154', 'a0000000-0000-0000-0000-000000000015', 'Delete', 'OrganizationModule.Delete'),
    -- Backward-compatibility TenantModule actions
    ('b0000000-0000-0000-0000-000000000155', 'a0000000-0000-0000-0000-000000000015', 'View', 'TenantModule.View'),
    ('b0000000-0000-0000-0000-000000000156', 'a0000000-0000-0000-0000-000000000015', 'Add', 'TenantModule.Add'),
    ('b0000000-0000-0000-0000-000000000157', 'a0000000-0000-0000-0000-000000000015', 'Edit', 'TenantModule.Edit'),
    ('b0000000-0000-0000-0000-000000000158', 'a0000000-0000-0000-0000-000000000015', 'Delete', 'TenantModule.Delete'),

    -- DepartmentModule
    ('b0000000-0000-0000-0000-000000000161', 'a0000000-0000-0000-0000-000000000016', 'View', 'DepartmentModule.View'),
    ('b0000000-0000-0000-0000-000000000162', 'a0000000-0000-0000-0000-000000000016', 'Add', 'DepartmentModule.Add'),
    ('b0000000-0000-0000-0000-000000000163', 'a0000000-0000-0000-0000-000000000016', 'Edit', 'DepartmentModule.Edit'),
    ('b0000000-0000-0000-0000-000000000164', 'a0000000-0000-0000-0000-000000000016', 'Delete', 'DepartmentModule.Delete'),

    -- RolePermission
    ('b0000000-0000-0000-0000-000000000171', 'a0000000-0000-0000-0000-000000000017', 'View', 'RolePermission.View'),
    ('b0000000-0000-0000-0000-000000000172', 'a0000000-0000-0000-0000-000000000017', 'Add', 'RolePermission.Add'),
    ('b0000000-0000-0000-0000-000000000173', 'a0000000-0000-0000-0000-000000000017', 'Edit', 'RolePermission.Edit'),
    ('b0000000-0000-0000-0000-000000000174', 'a0000000-0000-0000-0000-000000000017', 'Delete', 'RolePermission.Delete'),

    -- UserPermission
    ('b0000000-0000-0000-0000-000000000181', 'a0000000-0000-0000-0000-000000000018', 'View', 'UserPermission.View'),
    ('b0000000-0000-0000-0000-000000000182', 'a0000000-0000-0000-0000-000000000018', 'Add', 'UserPermission.Add'),
    ('b0000000-0000-0000-0000-000000000183', 'a0000000-0000-0000-0000-000000000018', 'Edit', 'UserPermission.Edit'),
    ('b0000000-0000-0000-0000-000000000184', 'a0000000-0000-0000-0000-000000000018', 'Delete', 'UserPermission.Delete'),

    -- TypeOfLeave
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'View', 'TypeOfLeave.View'),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Add', 'TypeOfLeave.Add'),
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Edit', 'TypeOfLeave.Edit'),
    ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Delete', 'TypeOfLeave.Delete'),

    -- RequestForLeave
    ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000002', 'View', 'RequestForLeave.View'),
    ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000002', 'Add', 'RequestForLeave.Add'),
    ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000002', 'Edit', 'RequestForLeave.Edit'),
    ('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000002', 'Delete', 'RequestForLeave.Delete'),
    ('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000002', 'Approval.Create', 'RequestForLeave.Approval.Create'),

    -- PayrollProcessing
    ('20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000003', 'View', 'PayrollProcessing.View'),
    ('20000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000003', 'Add', 'PayrollProcessing.Add'),
    ('20000000-0000-0000-0000-000000000023', '10000000-0000-0000-0000-000000000003', 'Edit', 'PayrollProcessing.Edit'),
    ('20000000-0000-0000-0000-000000000024', '10000000-0000-0000-0000-000000000003', 'Delete', 'PayrollProcessing.Delete'),

    -- EmployeeProfile
    ('20000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000004', 'View', 'EmployeeProfile.View'),
    ('20000000-0000-0000-0000-000000000032', '10000000-0000-0000-0000-000000000004', 'Add', 'EmployeeProfile.Add'),
    ('20000000-0000-0000-0000-000000000033', '10000000-0000-0000-0000-000000000004', 'Edit', 'EmployeeProfile.Edit'),
    ('20000000-0000-0000-0000-000000000034', '10000000-0000-0000-0000-000000000004', 'Delete', 'EmployeeProfile.Delete')
ON CONFLICT (full_key) DO UPDATE 
SET 
    action = EXCLUDED.action,
    module_id = EXCLUDED.module_id;
