# Database Schema & Entity Catalog

Status: `IMPLEMENTED`

## 1. Core Tables

### 1.1 `public.organizations`
Root entity representing an isolated tenant company.
- `id` (UUID, Primary Key, default `gen_random_uuid()`)
- `name` (VARCHAR(255), Not Null)
- `code` (VARCHAR(32), Unique, Not Null)
- `slug` (VARCHAR(64), Unique, Not Null)
- `legal_name` (VARCHAR(255))
- `tax_id` (VARCHAR(64))
- `status` (`organization_status` ENUM: `'Onboarding'`, `'Active'`, `'Suspended'`)
- `tier` (`organization_tier` ENUM: `'Starter'`, `'Standard'`, `'Enterprise'`)
- `sector` (`organization_sector` ENUM: `'Private'`, `'Public'`, `'NonProfit'`)
- `currency` (CHAR(3), default `'USD'`)
- `timezone` (VARCHAR(64), default `'UTC'`)
- `country_code` (CHAR(2), default `'US'`)
- `default_pay_frequency` (`pay_frequency` ENUM: `'Weekly'`, `'Bi-Weekly'`, `'Semi-Monthly'`, `'Monthly'`)
- `statutory_ids` (JSONB)
- `supported_work_modes` (JSONB: `["OnSite", "Remote", "Hybrid"]`)
- `settings` (JSONB: payroll divisors, grace periods, payslip password rules)
- `modules` (JSONB: licensed module codes)
- `start_date` (DATE)
- `end_date` (DATE): Expiration date for subscription. If past, access is blocked.
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 1.2 `public.departments`
Hierarchical departmental organizational units.
- `id` (UUID, Primary Key)
- `organization_id` (UUID, Foreign Key -> `organizations.id` ON DELETE CASCADE)
- `parent_department_id` (UUID, Self-referencing Foreign Key -> `departments.id` ON DELETE CASCADE)
- `code` (VARCHAR(32), Not Null)
- `name` (VARCHAR(128), Not Null)
- `description` (TEXT)
- `head_user_id` (UUID, References `auth.users(id)`)
- `depth` (INTEGER, default 0)
- `is_active` (BOOLEAN, default true)

### 1.3 `public.profiles`
User identity metadata bound to Supabase Auth.
- `id` (UUID, Primary Key, References `auth.users(id)` ON DELETE CASCADE)
- `organization_id` (UUID, Foreign Key -> `organizations.id` ON DELETE CASCADE)
- `department_id` (UUID, Foreign Key -> `departments.id` ON DELETE SET NULL)
- `full_name` (VARCHAR(255), Not Null)
- `is_tenant_admin` (BOOLEAN, default false)
- `is_super_admin` (BOOLEAN, default false)
- `is_active` (BOOLEAN, default true)

### 1.4 `public.roles` & `public.user_roles`
- `roles`: `id`, `organization_id` (NULL implies global system role), `code`, `name`, `role_type` (`'SYSTEM'`, `'CUSTOM'`), `is_default`, `is_mutable`.
- `user_roles`: `id`, `organization_id`, `user_id`, `role_id`, `is_active`.

### 1.5 `public.modules` & `public.module_actions`
Catalog of system capabilities:
- `modules`: `id`, `code`, `name`, `category` (`'Settings'`, `'Transactions'`, `'Reports'`, `'Payroll'`, `'Administration'`).
- `module_actions`: `id`, `module_id`, `action`, `full_key` (e.g. `'TypeOfLeave.Add'`).

### 1.6 Cascading Module Entitlement Tables
- `public.organization_modules`: Organization-level activation (`organization_id`, `module_id`, `is_active`).
- `public.department_modules`: Department-level allocation (`organization_id`, `department_id`, `module_id`).
- `public.role_permissions`: Role permission mappings (`role_id`, `action_id`).
- `public.user_permissions`: Direct user permission grants (`organization_id`, `user_id`, `module_action_id`).

### 1.7 `public.payroll_runs`
Immutable payroll calculation records with settings snapshot:
- `id`, `organization_id`, `period_start`, `period_end`, `payout_date`, `pay_frequency`, `status`.
- `calculation_snapshot` (JSONB): Captures historical rules snapshot at the moment payroll is calculated.
- `total_gross`, `total_deductions`, `total_net`.
