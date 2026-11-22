# PayPulse: Consolidated Database Architecture & Migration Guide

**Document Version:** 3.0.0 (Authoritative Database Reference)  
**Status:** Implemented, Deployed, and Verified (27/27 Migrations on Supabase `fsnfqnbixitmmjmeogml`)  
**Scope:** PostgreSQL Schema, Entities, Relationships, Triggers, RLS, and Stored Procedures

---

## 1. Migration Ledger & Applied History

The database schema is constructed through 27 forward-only, strictly immutable SQL migrations:

| Migration File | Name / Purpose | Applied Timestamp (UTC) | Status |
| :--- | :--- | :--- | :---: |
| `20261104000001_core_schema.sql` | Core tables (`organizations`, `departments`, `profiles`, `roles`, etc.) | 2026-11-04 00:00:01 | **DEPLOYED** |
| `20261104000002_functions_and_rls.sql` | Recursive CTE functions and initial RLS policies | 2026-11-04 00:00:02 | **DEPLOYED** |
| `20261104000003_audit_logs.sql` | `audit_logs` table, immutability trigger, and tracking triggers | 2026-11-04 00:00:03 | **DEPLOYED** |
| `20261104000004_attach_audit_triggers.sql` | Binds audit logging triggers to operational tables | 2026-11-04 00:00:04 | **DEPLOYED** |
| `20261104000005_seed_default_user_roles.sql` | Initial system roles seed data | 2026-11-04 00:00:05 | **DEPLOYED** |
| `20261104000006_fix_auth_users_null_tokens.sql` | Supabase auth user token compatibility fix | 2026-11-04 00:00:06 | **DEPLOYED** |
| `20261104000007_audit_logs_superadmin_policy.sql` | SuperAdmin read policy for platform audit logs | 2026-11-04 00:00:07 | **DEPLOYED** |
| `20261104000008_align_organizations_schema.sql` | Organization schema alignment (sector, tier, settings) | 2026-11-04 00:00:08 | **DEPLOYED** |
| `20261104000009_expand_organizations_sector_settings.sql` | Sector enum types and localization settings | 2026-11-04 00:00:09 | **DEPLOYED** |
| `20261119000010_remediate_database_rls.sql` | Hardening of RLS policies for multi-tenant isolation | 2026-11-19 00:00:10 | **DEPLOYED** |
| `20261119000011_harden_audit_attribution_and_integrity.sql` | Audit attribution enforcement and actor validation | 2026-11-19 00:00:11 | **DEPLOYED** |
| `20261121000012_remediate_critical_containment.sql` | Containment remediation for privileged service functions | 2026-11-21 00:00:12 | **DEPLOYED** |
| `20261121000013_security_correction_phase1_1.sql` | Phase 1.1 authentication and session corrections | 2026-11-21 00:00:13 | **DEPLOYED** |
| `20261121000014_security_corrections_phase1_1_1.sql` | Additive permission resolution and fail-closed fixes | 2026-11-21 00:00:14 | **DEPLOYED** |
| `20261121000015_align_organization_locale_defaults.sql` | Organization locale defaults (PHP, Asia/Manila, PH) | 2026-11-21 00:00:15 | **DEPLOYED** |
| `20261121000016_require_organization_leaves_settings.sql` | Mandatory leave settings structure | 2026-11-21 00:00:16 | **DEPLOYED** |
| `20261121000017_protect_profile_audit_fields.sql` | Immutability trigger for profile audit fields | 2026-11-21 00:00:17 | **DEPLOYED** |
| `20261121000018_superadmin_onboarding_invitations.sql` | Organization onboarding invitations table and RPCs | 2026-11-21 00:00:18 | **DEPLOYED** |
| `20261121000019_authorized_member_invitations.sql` | Member invitations table and redemption RPCs | 2026-11-21 00:00:19 | **DEPLOYED** |
| `20261121000020_separate_superadmin_role_authority.sql` | Privilege escalation containment on SuperAdmin roles | 2026-11-21 00:00:20 | **DEPLOYED** |
| `20261121153500_phase_3_1b_database_role_authorization_boundary.sql` | Hardening of database role boundary triggers | 2026-11-21 15:35:00 | **DEPLOYED** |
| `20261122100001_phase_3_0a_organization_permission_entitlements.sql` | Organization module entitlements catalog | 2026-11-22 10:00:01 | **DEPLOYED** |
| `20261122100002_phase_3_0b_single_role_per_organization_user.sql` | Single-role PK and composite FKs with `ON DELETE NO ACTION` | 2026-11-22 10:00:02 | **DEPLOYED** |
| `20261122100004_phase_3_0c_onboarding_role_compatibility.sql` | Decision P-01 Option C: Template role instantiation | 2026-11-22 10:00:04 | **DEPLOYED** |
| `20261122100005_seed_canonical_module_catalog.sql` | Idempotent seed of 14 modules and 36 actions | 2026-11-22 10:00:05 | **DEPLOYED** |
| `20261122100006_fix_provision_organization_module_columns.sql` | Aligns `organization_modules` column names (`allocated_at`) | 2026-11-22 10:00:06 | **DEPLOYED** |
| `20261122100007_align_invitation_error_message.sql` | Standardizes invitation error strings (`Invalid onboarding invitation`) | 2026-11-22 10:00:07 | **DEPLOYED** |

---

## 2. Core Entity Definitions & Schemas

### 2.1 `organizations`
Represents the root tenant entity.
```sql
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    legal_name TEXT,
    tax_id TEXT,
    industry TEXT DEFAULT 'Technology & Software',
    domain TEXT,
    sector public.organization_sector DEFAULT 'Private' NOT NULL,
    tier public.organization_tier DEFAULT 'Enterprise' NOT NULL,
    status public.organization_status DEFAULT 'Active' NOT NULL,
    start_date TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    end_date TIMESTAMPTZ,
    currency TEXT DEFAULT 'PHP' NOT NULL,
    timezone TEXT DEFAULT 'Asia/Manila' NOT NULL,
    country_code TEXT DEFAULT 'PH' NOT NULL,
    default_pay_frequency public.pay_frequency DEFAULT 'Semi-Monthly' NOT NULL,
    supported_work_modes JSONB DEFAULT '["OnSite","Remote","Hybrid"]'::jsonb NOT NULL,
    statutory_ids JSONB DEFAULT '{}'::jsonb NOT NULL,
    settings JSONB DEFAULT '{}'::jsonb NOT NULL,
    modules JSONB DEFAULT '["Department","EmployeeProfile","RolePermission"]'::jsonb NOT NULL,
    primary_contact_id UUID,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL
);
```

### 2.2 `departments`
Supports hierarchical departmental trees.
```sql
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    parent_department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT uq_departments_org_code UNIQUE (organization_id, code)
);
```

### 2.3 `roles`
Organization-scoped roles (and global system roles for SuperAdmin).
```sql
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    role_type public.role_type DEFAULT 'CUSTOM' NOT NULL,
    is_default BOOLEAN DEFAULT false NOT NULL,
    is_mutable BOOLEAN DEFAULT true NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT uq_roles_org_code UNIQUE (organization_id, code),
    CONSTRAINT uq_roles_org_id UNIQUE (organization_id, id)
);
```

### 2.4 `user_roles`
Strictly binds each user to at most one role per organization.
```sql
CREATE TABLE public.user_roles (
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL,
    assigned_by UUID,
    assigned_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    PRIMARY KEY (organization_id, user_id),
    CONSTRAINT fk_user_roles_org_role 
      FOREIGN KEY (organization_id, role_id) 
      REFERENCES public.roles(organization_id, id) 
      ON DELETE NO ACTION
);
```

### 2.5 `organization_onboarding_invitations`
Cryptographic single-use onboarding tokens.
```sql
CREATE TABLE public.organization_onboarding_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL UNIQUE,
    invited_email TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    expires_at TIMESTAMPTZ NOT NULL,
    redeemed_at TIMESTAMPTZ,
    redeemed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL
);
```

---

## 3. Referential Constraints & Triggers

### 3.1 Composite Foreign Keys with `ON DELETE NO ACTION` (F-30B-10)
To prevent cross-tenant role leakage while allowing safe deferred statement-level evaluations:
```sql
ALTER TABLE public.user_roles
  ADD CONSTRAINT fk_user_roles_org_role
  FOREIGN KEY (organization_id, role_id)
  REFERENCES public.roles(organization_id, id)
  ON DELETE NO ACTION;
```

### 3.2 Lock Acquisition Hierarchy (F-30B-08)
To avoid deadlocks under concurrent operations, all migrations and triggers lock tables in a standardized order:
```sql
LOCK TABLE public.user_roles, public.organization_members, public.roles IN ACCESS EXCLUSIVE MODE;
```

### 3.3 SuperAdmin Privilege Escalation Protection
`trg_enforce_organization_role_assignment` executes before any insert or update on `public.user_roles`:
- Blocks any assignment of the platform SuperAdmin role (`f0000000-0000-0000-0000-000000000001`).
- Blocks assignment of protected role codes (`SUPERADMIN`, `SUPER_ADMIN`) through user writes.
- Permits service-role onboarding to assign tenant-owned `ORG_ADMIN` to the initial owner.

### 3.4 Audit Immutability Trigger
`trg_audit_log_immutability` executes on `public.audit_logs`:
- Rejects any `UPDATE`, `DELETE`, or `TRUNCATE` operations on audit logs from all database roles.

---

## 4. Security Definer Stored Procedures

### 4.1 `provision_organization_from_onboarding_invitation`
Executes in an atomic transaction:
1. Locks the invitation row with `FOR UPDATE`.
2. Validates expiration (`expires_at > clock_timestamp()`) and single-use status.
3. Checks invitee email against `auth.users`.
4. Inserts `organizations` record.
5. Inserts root `departments` record (e.g. `HR`).
6. Inserts `profiles` record with `is_organization_admin = false, is_super_admin = false`.
7. Populates Tier 1 (`organization_modules`) and Tier 2 (`department_modules`).
8. Instantiates Option C template roles (`ORG_ADMIN` and `EMPLOYEE`).
9. Allocates administrative actions to `ORG_ADMIN` in `role_permissions`.
10. Inserts `organization_members` (`is_owner = true`, `role_id = ORG_ADMIN`).
11. Inserts `user_roles` (`role_id = ORG_ADMIN`).
12. Marks invitation as redeemed (`redeemed_at = clock_timestamp()`).

### 4.2 `get_user_effective_permissions`
Recursive CTE resolving 3-tier cascade:
```sql
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(
    p_organization_id UUID,
    p_user_id UUID
)
RETURNS TABLE (permission_key TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE dept_tree AS (
        SELECT d.id, d.parent_department_id
        FROM public.departments d
        JOIN public.profiles p ON p.department_id = d.id
        WHERE p.id = p_user_id AND p.organization_id = p_organization_id
        UNION ALL
        SELECT parent.id, parent.parent_department_id
        FROM public.departments parent
        JOIN dept_tree dt ON dt.parent_department_id = parent.id
    )
    SELECT DISTINCT ma.code
    FROM public.user_roles ur
    JOIN public.role_permissions rp 
      ON rp.role_id = ur.role_id AND rp.organization_id = ur.organization_id
    JOIN public.module_actions ma ON ma.id = rp.module_action_id
    JOIN public.modules m ON m.id = ma.module_id
    JOIN public.organization_modules om 
      ON om.module_id = m.id AND om.organization_id = p_organization_id
    JOIN public.department_modules dm 
      ON dm.module_id = m.id AND dm.organization_id = p_organization_id
    JOIN dept_tree dt ON dt.id = dm.department_id
    WHERE ur.organization_id = p_organization_id AND ur.user_id = p_user_id;
END;
$$;
```
