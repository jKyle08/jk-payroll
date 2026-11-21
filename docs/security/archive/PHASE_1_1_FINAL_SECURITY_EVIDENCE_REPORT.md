# PAYPULSE — PHASE 1.1 FINAL SECURITY EVIDENCE REPORT

> Archived historical report. Its phase statuses and recommendations are not current; use [`SECURITY_REMEDIATION_MASTER_TRACKER.md`](../SECURITY_REMEDIATION_MASTER_TRACKER.md) for authoritative status. Original report content is preserved below.

**Document Version:** 1.0.0  
**Audit Date:** November 21, 2026  
**Auditor Roles:** Principal Application Security Engineer, PostgreSQL Security Specialist, and Supabase Architect  
**Target System:** PayPulse (JK Payroll) — Multi-Tenant SaaS  
**Scope:** Phase 1.1 Security Implementation, Containment Migrations (12, 13, 14, 15, 16), Backend Authorization Layer, Database Security Configuration, and Test Verification Matrix  

---

## 1. Executive Summary

This technical evidence package provides an independent, deep-dive application security and database architecture evaluation of **Phase 1.1** for PayPulse (JK Payroll).

The primary goal of Phase 1.1 was to remediate critical multi-tenant containment vulnerabilities, harden row-level security (RLS) policies, establish authoritative organization membership boundaries, enforce single-authority SuperAdmin privilege controls, and secure the PostgreSQL effective permission Remote Procedure Call (`get_user_effective_permissions`).

### Key Audit Conclusions

1. **Phase 1.1 (Migration 13) Unresolved Critical Vulnerabilities:**
   During source-level and execution inspection of `supabase/migrations/20261121000013_security_correction_phase1_1.sql`, two severe architectural defects were identified:
   - **Critical Vulnerability (P111-01):** The defense-in-depth trigger function `public.fn_enforce_profile_security_fields()` was declared with `SECURITY DEFINER` and checked `current_user IN ('postgres', 'service_role')`. Inside a PostgreSQL `SECURITY DEFINER` function, `current_user` evaluates to the function owner (`postgres`). Consequently, the trusted bypass condition was **always true** for every caller. Any authenticated caller could modify protected profile security fields (`is_super_admin`, `is_organization_admin`, `organization_id`, `department_id`, and `is_active`), completely defeating the trigger.
   - **High Vulnerability (P111-02):** The permission resolution function `public.get_user_effective_permissions()` implemented direct permission evaluation as mutually exclusive with role permissions (`WHERE EXISTS (SELECT 1 FROM direct_user_actions) ... UNION ALL ... WHERE NOT EXISTS (SELECT 1 FROM direct_user_actions)`). This meant that assigning a single direct permission completely revoked all role-derived permissions rather than taking the union (`RoleActions UNION DirectActions`).
   - **High Vulnerability (P111-03):** Department resolution in Migration 13 was queried from `profiles.department_id` instead of the scoped `organization_members.department_id` record, leading to incorrect permission scoping for multi-organization users and cross-tenant department leakage.

2. **Remediation in Phase 1.1.1 (Migration 14):**
   A subsequent migration (`supabase/migrations/20261121000014_security_corrections_phase1_1_1.sql`) was developed in the repository to address the Phase 1.1 defects:
   - Changed `fn_enforce_profile_security_fields` to `SECURITY INVOKER`, checking the actual executing database principal and explicitly requiring `auth.uid() IS NOT NULL` and active account status.
   - Corrected permission resolution to genuine additive semantics (`RoleActions UNION DirectActions`).
   - Scoped department derivation strictly to `organization_members.department_id` matching the target organization.
   - Restricted Organization Admin resolution so that custom organization-scoped roles matching administrative names/codes cannot confer organization administrator authority.
   - Hardened `current_user_organization_id()` to fail closed (`NULL`) on ambiguous multi-organization memberships without an explicit, valid claim.

3. **Staging Environment Status:**
   The remote Supabase staging database endpoint (`[REDACTED].supabase.co`) configured in `.env` is **unreachable** (`getaddrinfo ENOTFOUND`). Therefore, live staging database verification could **not** be performed and is marked **NOT VERIFIED**. All database runtime verification was executed against the embedded PostgreSQL 18 engine (`@electric-sql/pglite`) running the complete migration baseline.

4. **Final Security Verdict:**
   **NOT APPROVED**  
   - Phase 1.1 (as defined by Migration 13 in isolation) contains unresolved Critical and High vulnerabilities.
   - Phase 1.1.1 (Migration 14) successfully resolves these defects in code and embedded PostgreSQL testing, but has **not** been applied or verified against the actual Supabase staging database. Production deployment cannot be authorized until live staging verification is completed.

---

## 2. Repository and Migration Version

### Repository State
- **Git Commit Branch:** `main`
- **Working Tree:** Contains uncommitted modifications in authentication controllers, organization context middleware, and untracked Phase 1.1 / 1.1.1 migration artifacts.
- **Node Environment:** Node.js v24.14.0, Vite 4.3.4, React 19.3.1, Express 4.21.2.
- **Database Engine (Embedded Testing):** PostgreSQL 18.0 (PGlite WASM v0.5.17).

### Migration Sequence Analysis
| Migration Filename | Stage | Description | Security Significance |
|---|---|---|---|
| `20261104000001_core_schema.sql` | Baseline | Core multi-tenant tables, profiles, organizations, departments | Defines initial schema; profiles.organization_id present |
| `20261104000002_functions_and_rls.sql` | Baseline | Initial RLS policies, get_user_effective_permissions | Had PUBLIC execution grant on permission RPC |
| `20261104000003_audit_logs.sql` | Baseline | Audit logging and access token hook | Injected display names into JWT role claims |
| `20261119000010_remediate_database_rls.sql` | Phase 0 | Initial containment attempt | Contained COALESCE flaws and permissive profile update policies |
| `20261121000012_remediate_critical_containment.sql` | Phase 1.0 | Immediate containment: sync triggers, helper functions, policy lockdown | Fixed boolean evaluation, revoked public RPC grants |
| `20261121000013_security_correction_phase1_1.sql` | Phase 1.1 | Security correction: Model B RPC, sole SuperAdmin, profile trigger | **Introduced P111-01 (trigger bypass) & P111-02 (XOR permissions)** |
| `20261121000014_security_corrections_phase1_1_1.sql` | Phase 1.1.1 | Corrects P111-01 through P111-06; SECURITY INVOKER trigger, UNION perms | Remediates Migration 13 vulnerabilities |
| `20261121000015_align_organization_locale_defaults.sql` | Post-1.1 | Sets default currency ('PHP') and timezone ('Asia/Manila') | Schema normalization |
| `20261121000016_require_organization_leaves_settings.sql` | Post-1.1 | Standardizes JSON settings for leaves and attendance | Configuration consistency |

---

## 3. Files Inspected

### Database Migrations
- `supabase/migrations/20261121000012_remediate_critical_containment.sql` (Lines 1–347)
- `supabase/migrations/20261121000013_security_correction_phase1_1.sql` (Lines 1–546)
- `supabase/migrations/20261121000014_security_corrections_phase1_1_1.sql` (Lines 1–509)
- `supabase/migrations/20261121000015_align_organization_locale_defaults.sql` (Lines 1–5)
- `supabase/migrations/20261121000016_require_organization_leaves_settings.sql` (Lines 1–40)
- `supabase/staging/phase1_1_1_structural_verification.sql` (Lines 1–168)
- `supabase/staging/phase1_1_1_behavioral_smoke.sql` (Lines 1–192)

### Backend Authorization & API Middleware
- `src/server/db/repository.ts` (Lines 1415–1516: `getUserEffectivePermissions`, Lines 1150–1250: user-roles)
- `src/features/access-control/services/permission.service.ts` (Lines 1–98)
- `src/server/middleware/auth.middleware.ts` (Lines 1–305)
- `src/server/middleware/rbac.guard.ts` (Lines 1–146)
- `src/features/organizations/organization-context.service.ts` (Lines 1–349)
- `src/features/roles/role.service.ts` (Lines 1–120, 475–552)
- `src/features/roles/role.controller.ts` & `src/features/roles/user-role.controller.ts`

### Test Suites Inspected & Executed
- `tests/integration/security-phase1-postgres.integration.test.ts` (31 tests, PGlite PostgreSQL)
- `tests/integration/security-phase1-1-1-postgres.integration.test.ts` (58 tests, PGlite PostgreSQL)
- `tests/security-phase1.test.ts` (25 tests, Supertest Express integration)
- `tests/security-phase1-containment.test.ts` (16 tests, static invariant assertions)
- `tests/security-phase1-correction.test.ts` (14 tests, static invariant assertions)
- `tests/security-phase1-1-1-correction.test.ts` (19 tests, static invariant assertions)
- `tests/integration/security-postgres.integration.test.ts` (Remote staging test — failed on DNS resolution)

---

## 4. Phase 1.1 Security Objective Verification

| Objective | Description | Migration 13 Implementation | Migration 14 Implementation | Verification Status |
|---|---|---|---|:---:|
| **OBJ-1** | Authoritative Organization Membership | Removed `profiles.organization_id` fallback from `current_user_organization_id()` and `is_organization_member()` | Re-asserted; explicit claim or unique membership required | **VERIFIED** (in v14) |
| **OBJ-2** | Harden Profile INSERT & UPDATE | Implemented `profiles_insert_policy`, `profiles_update_policy`, and trigger | Fixed `SECURITY DEFINER` bypass flaw in trigger; made `SECURITY INVOKER` | **VERIFIED** (in v14) |
| **OBJ-3** | Single SuperAdmin Authority | `is_super_admin()` reads exclusively from `profiles.is_super_admin = true AND is_active = true` | Unchanged; strictly verified | **VERIFIED** |
| **OBJ-4** | Model B Permission RPC Security | `REVOKE ALL` from PUBLIC, anon, authenticated; `GRANT` to `service_role` | Re-asserted; fixed internal additive logic | **VERIFIED** (in v14) |
| **OBJ-5** | Organization Admin Resolution | Eliminated role display names; added role code checks | Restricted to `role_type = 'SYSTEM'` to prevent custom role injection | **VERIFIED** (in v14) |
| **OBJ-6** | Lifecycle Status Synchronization | Automatic status trigger + table CHECK constraint | Maintained across all tables | **VERIFIED** |

---

## 5. SECURITY DEFINER Trigger Assessment

### Object: `public.fn_enforce_profile_security_fields()`

#### 1. Vulnerability Analysis in Migration 13
Lines 310–320 of `supabase/migrations/20261121000013_security_correction_phase1_1.sql`:
```sql
CREATE OR REPLACE FUNCTION public.fn_enforce_profile_security_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Superusers, service_role, and platform Super Admins bypass field mutation restrictions
    IF current_user IN ('postgres', 'service_role') OR current_role IN ('postgres', 'service_role') OR public.is_super_admin() THEN
        RETURN NEW;
    END IF;
```
- **The Defect:** In PostgreSQL, a `SECURITY DEFINER` function executes with the privileges of the user that owns the function (in Supabase migrations, this is `postgres`).
- **The Impact:** When any user (including an unprivileged `authenticated` user or even `anon`) triggers this function, `current_user` evaluates to `'postgres'`. The condition `current_user IN ('postgres', 'service_role')` **always evaluates to true**.
- **Result:** The trigger returned `NEW` immediately without inspecting modified columns. An ordinary user could issue `UPDATE public.profiles SET is_super_admin = true WHERE id = auth.uid();` and completely bypass the trigger logic.
- **Empirical Reproduction:** Verified in `tests/integration/security-phase1-1-1-postgres.integration.test.ts:276-298`. When RLS is disabled or misconfigured, an ordinary user updating their profile under Migration 13 successfully elevates to `is_super_admin = true`.

#### 2. Hardened Implementation in Migration 14
Lines 77–103 of `supabase/migrations/20261121000014_security_corrections_phase1_1_1.sql`:
```sql
CREATE OR REPLACE FUNCTION public.fn_enforce_profile_security_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid           UUID := auth.uid();
    v_actor_active  BOOLEAN;
BEGIN
    -- Trusted database principals (real executing role; NOT the owner of a DEFINER wrapper)
    IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
        RETURN NEW;
    END IF;

    -- Any other role must carry an authenticated identity.
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Security violation: profile modification requires an authenticated caller'
            USING ERRCODE = '42501';
    END IF;
```
- **Security Mode:** `SECURITY INVOKER`.
- **Caller Context:** `current_user` reflects the actual connected database role (`authenticated`, `anon`, `service_role`, or `postgres`).
- **Unauthenticated Protection:** If `auth.uid() IS NULL`, it raises exception `42501` immediately.
- **Deactivated Account Protection:** Inactive users cannot modify any profile attributes.
- **Protected Fields:** Enforces strict immutability for `id`, `is_active`, `is_super_admin`, `is_organization_admin`, `organization_id`, and `department_id` against self-updates, and prevents Org Admins from elevating other profiles.

---

## 6. Effective Permission Resolver Assessment

### Object: `public.get_user_effective_permissions(UUID, UUID)`

#### 1. SQL Resolver Logic Comparison

| Semantic Check | Migration 13 (`v13`) | Migration 14 (`v14`) | Backend TypeScript (`repository.ts`) | Consistency Evaluation |
|---|---|---|---|---|
| **Permission Combination** | `Direct XOR Role` (defect) | `RoleActions UNION DirectActions` | `RoleActions UNION DirectActions` | Consistent between v14 and Backend |
| **Department Source** | `profiles.department_id` | `organization_members.department_id` | `organization_members.department_id` | Consistent between v14 and Backend |
| **Cross-Tenant Department Validation** | Incomplete | Enforced: `departments.organization_id = p_org_id` | Enforced: `departments.organizationId === tenantId` | Fully Consistent |
| **Administrative Bypass** | None (All users evaluate department) | None (All users evaluate department) | **Full Bypass** (SuperAdmin / OrgAdmin get all tenant modules) | **Discrepancy (FINDING-MED-01)** |
| **Inactive Role Handling** | Excluded | Excluded (`r.is_active = true`) | Excluded (`role.isActive === true`) | Fully Consistent |
| **Module Licensing & Allocation** | Enforces Tier 1 & Tier 2 | Enforces Tier 1 & Tier 2 | Enforces Tier 1 & Tier 2 | Fully Consistent |

#### 2. Analysis of the Migration 13 XOR Defect
Lines 519–527 of `20261121000013_security_correction_phase1_1.sql`:
```sql
candidate_actions AS (
    SELECT * FROM direct_user_actions
    WHERE EXISTS (SELECT 1 FROM direct_user_actions)
    UNION ALL
    SELECT * FROM role_user_actions
    WHERE NOT EXISTS (SELECT 1 FROM direct_user_actions)
)
```
If an employee held a standard "Staff" role with 15 actions, and an administrator granted 1 direct custom action (e.g. `RequestForLeave.Approval.Create`), `WHERE EXISTS (SELECT 1 FROM direct_user_actions)` evaluated to true. Consequently, the user lost all 15 role actions and received only the 1 direct action. Migration 14 line 481 corrected this to `UNION`.

---

## 7. Multi-Tenant Membership Assessment

### Authoritative Membership Model
1. **Primary Authority:** `public.organization_members` is the sole source of truth for organization membership.
2. **Profile Decoupling:** `profiles.organization_id` represents an informational or initial self-registration reference. It is **never** accepted by PostgreSQL functions or backend services as authorization proof.
3. **Explicit Organization Selection (`current_user_organization_id()`):**
   - In Migration 12: Selected the "first" membership ordered by `is_owner DESC, created_at ASC`. This caused cross-tenant bleed for users belonging to multiple organizations.
   - In Migration 14:
     ```sql
     WITH eligible AS (
         SELECT om.organization_id
         FROM public.organization_members om
         INNER JOIN public.organizations o ON o.id = om.organization_id
         WHERE om.user_id = auth.uid()
           AND om.is_active = true
           AND o.status = 'Active'
           AND (o.end_date IS NULL OR o.end_date >= clock_timestamp())
     )
     SELECT COALESCE(
         (SELECT e.organization_id FROM eligible e WHERE e.organization_id = safe_cast_uuid(auth.jwt()->'app_metadata'->>'organization_id') LIMIT 1),
         (SELECT MIN(e.organization_id::text)::uuid FROM eligible e HAVING COUNT(*) = 1)
     );
     ```
   - If the user belongs to multiple active organizations and does not provide an explicit, validated JWT claim, the function returns `NULL`. It fails closed instead of guessing.

---

## 8. Profile INSERT and UPDATE Security

### 1. `profiles_insert_policy`
- **Self-Registration Path:** Authenticated users inserting their own profile must have:
  - `id = auth.uid()`
  - `organization_id IS NULL`
  - `department_id IS NULL`
  - `is_super_admin = false`
  - `is_organization_admin = false`
- **Administrator Provisioning Path:** An organization administrator may insert a profile only if:
  - The target user **already possesses** an active record in `organization_members` for that organization (`membership precedes profile`).
  - `is_super_admin = false` and `is_organization_admin = false`.
  - The assigned `department_id` belongs to the administrator's organization.

### 2. `profiles_update_policy`
- **Self-Update Restrictions:**
  - Caller account must currently be active (`is_active = true`).
  - Immutability enforced on `is_super_admin`, `is_organization_admin`, `is_active`, `organization_id`, and `department_id`.
- **Administrator Update Restrictions:**
  - Organization administrators cannot promote users to SuperAdmin or Organization Admin via profile updates.
  - Cannot change a profile's `organization_id`.
  - Can only assign a `department_id` that belongs to their organization.

---

## 9. SuperAdmin and Organization Admin Assessment

### SuperAdmin Authority
- **Authority Source:** `profiles.is_super_admin = true AND profiles.is_active = true`.
- **Token Claims Decoupling:** In Migration 12, `is_super_admin()` accepted `auth.jwt()->'app_metadata'->>'role' = 'SUPER_ADMIN'`. This was eliminated in Migration 13 and Migration 14.
- **Immediate Revocation:** Because `is_super_admin()` performs a direct SQL `EXISTS` check on `public.profiles`, toggling `is_super_admin = false` in the database immediately revokes all platform privileges, even if the user possesses an unexpired JWT token.

### Organization Administrator Authority
`public.is_organization_admin(UUID)` resolves through four distinct sources (Migration 14 lines 227–264):
1. **Source A (Authoritative):** `organization_members.is_owner = true`.
2. **Source B (Authoritative):** `user_roles` assignment of an active role where `role_type = 'SYSTEM'` and `organization_id IS NULL` and code is in `('TENANT_ADMIN', 'ORGANIZATION_ADMIN', 'ORG_ADMIN', 'ADMIN')`.
3. **Source C (Transitional Compatibility):** Legacy `organization_members.role_id` referencing an active SYSTEM admin role.
4. **Source D (Transitional Compatibility):** Legacy `profiles.is_organization_admin = true` scoped strictly to the target organization.

**Critical Guard:** Every single source (A, B, C, D) strictly requires:
- Target organization is active and not expired (`status = 'Active' AND (end_date IS NULL OR end_date >= clock_timestamp())`).
- User possesses an active membership in `organization_members` (`om.is_active = true`).
- Custom roles created by tenants (where `r.organization_id IS NOT NULL`) **cannot** confer organization administrator privileges, even if named "Admin".

---

## 10. Permission RPC ACL Assessment

### Object: `public.get_user_effective_permissions(UUID, UUID)`

### Access Control Lists (ACLs)
- Direct Grants:
  - `REVOKE ALL ON FUNCTION public.get_user_effective_permissions(UUID, UUID) FROM PUBLIC;`
  - `REVOKE ALL ON FUNCTION public.get_user_effective_permissions(UUID, UUID) FROM anon;`
  - `REVOKE ALL ON FUNCTION public.get_user_effective_permissions(UUID, UUID) FROM authenticated;`
  - `GRANT EXECUTE ON FUNCTION public.get_user_effective_permissions(UUID, UUID) TO service_role;`
- Execution Boundary:
  - Untrusted client callers (`anon`, `authenticated`) receive error `42501 (insufficient_privilege)`.
  - Only the Express backend (executing under `service_role`) is permitted to invoke the RPC.
- Defense in Depth:
  - Lines 409–412: If invoked under `authenticated` role through any potential misconfiguration, the function body enforces that `auth.uid() = p_user_id`, preventing cross-user permission enumeration.

---

## 11. Actual PostgreSQL Database Verification

### Verification Environment
- **Target Supabase Staging Database:** `https://[REDACTED].supabase.co`
- **Connectivity Status:** **FAILED / UNREACHABLE** (`getaddrinfo ENOTFOUND [REDACTED].supabase.co`).
- **Staging Verification Status:** **NOT VERIFIED** (In accordance with strict operating rule #7).
- **Embedded Engine Verification:** Executed via `@electric-sql/pglite` (PostgreSQL 18.0 engine) applying migrations 1 through 16 sequentially.

### Embedded Database Query Results

#### Query 1 — Function Ownership & Security Configuration
```sql
SELECT
    p.proname,
    pg_get_userbyid(p.proowner) AS function_owner,
    p.prosecdef AS security_definer,
    p.provolatile AS volatility,
    p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname IN (
    'fn_enforce_profile_security_fields',
    'fn_sync_organization_active_status',
    'get_user_effective_permissions',
    'is_super_admin',
    'is_organization_admin',
    'is_organization_member',
    'current_user_organization_id'
)
ORDER BY p.proname;
```
**Results (PGlite PostgreSQL 18):**
| proname | function_owner | security_definer | volatility | proconfig |
|---|---|:---:|:---:|---|
| `current_user_organization_id` | `postgres` | `true` | `s` (STABLE) | `{search_path=public,pg_temp}` |
| `fn_enforce_profile_security_fields` | `postgres` | **`false`** | `v` (VOLATILE) | `{search_path=public,pg_temp}` |
| `fn_sync_organization_active_status` | `postgres` | `true` | `v` (VOLATILE) | `{search_path=public}` |
| `get_user_effective_permissions` | `postgres` | `true` | `s` (STABLE) | `{search_path=public,pg_temp}` |
| `is_organization_admin` | `postgres` | `true` | `s` (STABLE) | `{search_path=public,pg_temp}` |
| `is_organization_member` | `postgres` | `true` | `s` (STABLE) | `{search_path=public}` |
| `is_super_admin` | `postgres` | `true` | `s` (STABLE) | `{search_path=public}` |

*Note: `fn_enforce_profile_security_fields` is confirmed as `security_definer = false` (SECURITY INVOKER) following Migration 14.*

#### Query 2 — RLS Policy Status
```sql
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'organization_members', 'organizations', 'user_roles')
ORDER BY tablename, policyname;
```
**Results (PGlite PostgreSQL 18):**
| tablename | policyname | permissive | roles | cmd |
|---|---|---|---|---|
| `organization_members` | `org_members_delete_policy` | PERMISSIVE | `{authenticated}` | DELETE |
| `organization_members` | `org_members_insert_policy` | PERMISSIVE | `{authenticated}` | INSERT |
| `organization_members` | `org_members_select_policy` | PERMISSIVE | `{authenticated}` | SELECT |
| `organization_members` | `org_members_update_policy` | PERMISSIVE | `{authenticated}` | UPDATE |
| `organizations` | `organizations_select_policy` | PERMISSIVE | `{authenticated}` | SELECT |
| `profiles` | `profiles_insert_policy` | PERMISSIVE | `{authenticated}` | INSERT |
| `profiles` | `profiles_select_policy` | PERMISSIVE | `{authenticated}` | SELECT |
| `profiles` | `profiles_update_policy` | PERMISSIVE | `{authenticated}` | UPDATE |
| `user_roles` | `user_roles_select_policy` | PERMISSIVE | `{authenticated}` | SELECT |

#### Query 3 — Effective RPC Privileges
```sql
SELECT
    has_function_privilege('authenticated', 'public.get_user_effective_permissions(uuid, uuid)', 'EXECUTE') AS authenticated_can_execute,
    has_function_privilege('anon', 'public.get_user_effective_permissions(uuid, uuid)', 'EXECUTE') AS anon_can_execute,
    has_function_privilege('service_role', 'public.get_user_effective_permissions(uuid, uuid)', 'EXECUTE') AS service_role_can_execute;
```
**Results (PGlite PostgreSQL 18):**
| authenticated_can_execute | anon_can_execute | service_role_can_execute |
|:---:|:---:|:---:|
| **`false`** | **`false`** | **`true`** |

#### Query 4 — Trigger Status
```sql
SELECT
    c.relname AS table_name,
    t.tgname AS trigger_name,
    t.tgenabled,
    pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND NOT t.tgisinternal
AND t.tgname IN ('trg_enforce_profile_security_fields', 'trg_sync_organization_active_status');
```
**Results (PGlite PostgreSQL 18):**
| table_name | trigger_name | tgenabled | trigger_definition |
|---|---|:---:|---|
| `profiles` | `trg_enforce_profile_security_fields` | `O` (Enabled) | `BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION fn_enforce_profile_security_fields()` |
| `organizations` | `trg_sync_organization_active_status` | `O` (Enabled) | `BEFORE INSERT OR UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION fn_sync_organization_active_status()` |

#### Query 5 — Migration Tracking on Staging
- **Status:** **NOT VERIFIED (STAGING OFFLINE)**.
- Query against staging `supabase_migrations.schema_migrations` could not be executed due to DNS resolution failure for the Supabase host.

---

## 12. Integration Test Coverage Matrix

The repository includes a dedicated PostgreSQL integration test harness executing real SQL queries against the PGlite engine. Below is the verification status for each required security test scenario:

| # | Security Scenario | Required Result | Test File & Suite | Execution Engine | Database Role | Actual Assertion Result | Coverage Status |
|---|---|---|---|---|---|---|:---:|
| 1 | Ordinary user changes own SuperAdmin flag | Denied | `tests/integration/security-phase1-1-1-postgres.integration.test.ts:206` | PGlite PostgreSQL | `authenticated` | Throws `42501 (super admin status)` | **PASS** |
| 2 | Ordinary user changes own org admin flag | Denied | `tests/integration/security-phase1-1-1-postgres.integration.test.ts:207` | PGlite PostgreSQL | `authenticated` | Throws `42501 (org admin status)` | **PASS** |
| 3 | Ordinary user changes own organization ID | Denied | `tests/integration/security-phase1-1-1-postgres.integration.test.ts:208` | PGlite PostgreSQL | `authenticated` | Throws `42501 (reassign organization)` | **PASS** |
| 4 | Ordinary user changes own department ID | Denied | `tests/integration/security-phase1-1-1-postgres.integration.test.ts:209` | PGlite PostgreSQL | `authenticated` | Throws `42501 (reassign department)` | **PASS** |
| 5 | Inactive user reactivates own account | Denied | `tests/integration/security-phase1-1-1-postgres.integration.test.ts:229` | PGlite PostgreSQL | `authenticated` | Throws `42501 (inactive accounts)` | **PASS** |
| 6 | Profile organization without membership | No access | `tests/integration/security-phase1-1-1-postgres.integration.test.ts:351` | PGlite PostgreSQL | `authenticated` | Returns empty array `[]` | **PASS** |
| 7 | Inactive membership | No access | `tests/integration/security-phase1-1-1-postgres.integration.test.ts:354` | PGlite PostgreSQL | `authenticated` | Returns empty array `[]` | **PASS** |
| 8 | Cross-tenant department read | Denied | `tests/integration/security-phase1-postgres.integration.test.ts:326` | PGlite PostgreSQL | `authenticated` | Returns 0 rows | **PASS** |
| 9 | Cross-tenant membership read | Denied | `tests/integration/security-phase1-postgres.integration.test.ts:333` | PGlite PostgreSQL | `authenticated` | Returns 0 rows | **PASS** |
| 10 | Org admin promotes user through profile | Denied | `tests/integration/security-phase1-1-1-postgres.integration.test.ts:221` | PGlite PostgreSQL | `authenticated` | Throws `42501 (org admin status)` | **PASS** |
| 11 | Org admin injects owner membership | Denied | `tests/integration/security-phase1-postgres.integration.test.ts:303` | PGlite PostgreSQL | `authenticated` | Throws `42501 (violates RLS)` | **PASS** |
| 12 | JWT SuperAdmin claim without profile | No SuperAdmin | `tests/integration/security-phase1-1-1-postgres.integration.test.ts:519` | PGlite PostgreSQL | `authenticated` | `is_super_admin() = false` | **PASS** |
| 13 | Revoked SuperAdmin with old JWT | No SuperAdmin | `tests/integration/security-phase1-postgres.integration.test.ts:227` | PGlite PostgreSQL | `authenticated` | `is_super_admin() = false` | **PASS** |
| 14 | Authenticated calls permission RPC | Denied | `tests/integration/security-phase1-1-1-postgres.integration.test.ts:366` | PGlite PostgreSQL | `authenticated` | Throws `42501 (permission denied)` | **PASS** |
| 15 | anon calls permission RPC | Denied | `tests/integration/security-phase1-postgres.integration.test.ts:468` | PGlite PostgreSQL | `anon` | Throws `42501 (permission denied)` | **PASS** |
| 16 | service_role calls permission RPC | Allowed | `tests/integration/security-phase1-postgres.integration.test.ts:480` | PGlite PostgreSQL | `service_role` | Returns permissions array | **PASS** |
| 17 | Role perms plus direct perms | Union returned | `tests/integration/security-phase1-1-1-postgres.integration.test.ts:311` | PGlite PostgreSQL | `service_role` | Returns full union without loss | **PASS** |
| 18 | Multiple organization memberships | Selected used | `tests/integration/security-phase1-1-1-postgres.integration.test.ts:339` | PGlite PostgreSQL | `service_role` | Returns org-specific perms | **PASS** |
| 19 | Department belongs to other org | Rejected | `tests/integration/security-phase1-1-1-postgres.integration.test.ts:345` | PGlite PostgreSQL | `service_role` | Returns empty array `[]` | **PASS** |
| 20 | Inactive role assignment | No perms | `tests/integration/security-phase1-1-1-postgres.integration.test.ts:325` | PGlite PostgreSQL | `service_role` | Returns empty array `[]` | **PASS** |
| 21 | Suspended organization | No access | `tests/integration/security-phase1-1-1-postgres.integration.test.ts:360` | PGlite PostgreSQL | `authenticated` | Returns empty array `[]` | **PASS** |
| 22 | Expired organization | No access | `tests/integration/security-phase1-1-1-postgres.integration.test.ts:364` | PGlite PostgreSQL | `authenticated` | Returns empty array `[]` | **PASS** |

---

## 13. Express and Database Authorization Consistency

| Authorization Mechanism | Express Middleware Layer | PostgreSQL Database Layer | Discrepancy Analysis |
|---|---|---|---|
| **Identity Verification** | Verifies JWT signature, issuer, audience; rejects local JWT in production (`auth.middleware.ts:115`) | `auth.uid()` extracted from JWT claims set by PostgREST | Consistent |
| **Organization Context Validation** | `resolveOrganizationContext()` validates active membership in `organization_members` | `current_user_organization_id()` validates active membership in `organization_members` | Consistent |
| **SuperAdmin Authority** | Verified via `profile.isSuperAdmin === true` (`rbac.guard.ts:18`) | Verified via `profiles.is_super_admin = true` (`is_super_admin()`) | Consistent |
| **Admin Privilege Bypass in Permissions** | `repository.ts:1438` bypasses department checks for SuperAdmin / OrgAdmin / Owner and returns all tenant modules | `get_user_effective_permissions()` has **no admin bypass**; requires department allocation | **Inconsistent (FINDING-MED-01)** |
| **Role Assignment Enforcement** | `role.service.ts:475` rejects assigning global SYSTEM roles by Tenant Admins | `roles` table RLS restricts writes to SuperAdmin | Consistent |
| **Profile Caching** | `db.getProfileById()` caches profiles in memory (`auth.middleware.ts:179`) | Direct SQL queries evaluate live state on every request | **Latency Risk (FINDING-MED-02)** |

---

## 14. Critical Findings

### FINDING-CRIT-01: SECURITY DEFINER Trigger Bypass in Migration 13 (Resolved in Migration 14)
- **Severity:** Critical (CVSS 9.8)
- **Location:** `supabase/migrations/20261121000013_security_correction_phase1_1.sql:310-320`
- **Vulnerable Code:**
  ```sql
  CREATE OR REPLACE FUNCTION public.fn_enforce_profile_security_fields()
  RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN
      IF current_user IN ('postgres', 'service_role') OR current_role IN ('postgres', 'service_role') OR public.is_super_admin() THEN
          RETURN NEW;
      END IF;
  ```
- **Risk Analysis:** Inside a `SECURITY DEFINER` function, `current_user` evaluates to the object owner (`postgres`), causing the bypass condition to evaluate to true for every caller, including unprivileged users. An authenticated attacker can issue `UPDATE profiles SET is_super_admin = true WHERE id = auth.uid()` without restriction.
- **Verification:** Empirically verified in `tests/integration/security-phase1-1-1-postgres.integration.test.ts:289-298`.
- **Status:** **Resolved in Migration 14** by altering function to `SECURITY INVOKER` and validating `auth.uid()` and account status. If Migration 13 alone is deployed to production, this vulnerability is live.

---

## 15. High Findings

### FINDING-HIGH-01: Effective Permission Resolver XOR Semantics in Migration 13 (Resolved in Migration 14)
- **Severity:** High (CVSS 7.5)
- **Location:** `supabase/migrations/20261121000013_security_correction_phase1_1.sql:519-527`
- **Vulnerable Code:**
  ```sql
  candidate_actions AS (
      SELECT * FROM direct_user_actions WHERE EXISTS (SELECT 1 FROM direct_user_actions)
      UNION ALL
      SELECT * FROM role_user_actions WHERE NOT EXISTS (SELECT 1 FROM direct_user_actions)
  )
  ```
- **Risk Analysis:** Direct permissions completely suppressed role permissions instead of taking the union. Users granted granular direct permissions experienced denial of service regarding their baseline role duties.
- **Status:** **Resolved in Migration 14** (`RoleActions UNION DirectActions`).

### FINDING-HIGH-02: Profile-Derived Department in Permission Resolver (Resolved in Migration 14)
- **Severity:** High (CVSS 7.2)
- **Location:** `supabase/migrations/20261121000013_security_correction_phase1_1.sql:455-466`
- **Vulnerable Code:**
  ```sql
  SELECT p.department_id, p.is_active INTO v_dept_id, v_user_active
  FROM public.profiles p WHERE p.id = p_user_id AND p.organization_id = p_organization_id;
  ```
- **Risk Analysis:** For multi-organization users, `profiles.department_id` reflects only the primary profile organization. Resolving permissions for secondary organizations failed or inherited wrong department allocations.
- **Status:** **Resolved in Migration 14** by querying `organization_members.department_id` and verifying department ownership.

### FINDING-HIGH-03: Multi-Source Organization Administrator Resolution (Transitional Architecture Risk)
- **Severity:** High (CVSS 6.8)
- **Location:** `supabase/migrations/20261121000014_security_corrections_phase1_1_1.sql:227-264`
- **Risk Analysis:** Administrator authority is granted by 4 separate sources (`is_owner`, `user_roles`, `organization_members.role_id`, and `profiles.is_organization_admin`). Deprovisioning an administrator requires synchronizing removals across all 4 tables; missing one leaves administrative access active.
- **Mitigation:** Planned Phase 2/3 RBAC consolidation.

### FINDING-HIGH-04: Supabase Staging Database Unreachable & Migrations Unapplied
- **Severity:** High (Operational / Governance)
- **Location:** Environment Configuration / DNS
- **Risk Analysis:** The staging database endpoint `[REDACTED].supabase.co` is unreachable. Migrations 12, 13, 14, 15, and 16 have not been confirmed as applied on live Supabase staging infrastructure.

---

## 16. Medium Findings

### FINDING-MED-01: Discrepancy Between Express Repository and SQL Permission Resolver
- **Severity:** Medium (CVSS 5.3)
- **Location:** `src/server/db/repository.ts:1438-1449`
- **Analysis:** The backend TypeScript repository immediately returns all tenant modules if the user is a SuperAdmin, OrgAdmin, or Owner. The database SQL function `get_user_effective_permissions` contains no such bypass and always evaluates department allocation. While `rbac.guard.ts` intercepts SuperAdmin access before calling the resolver, this inconsistency creates diverging behavior between direct SQL callers and backend services.

### FINDING-MED-02: In-Memory Profile Caching in Auth Middleware
- **Severity:** Medium (CVSS 4.8)
- **Location:** `src/server/middleware/auth.middleware.ts:179-181`
- **Analysis:** `db.getProfileById(userId)` consults the local memory cache before querying Supabase. In multi-instance or long-running server deployments, immediate database revocations (e.g., setting `is_active = false` or `is_super_admin = false`) will not be reflected until process restart or cache eviction.

---

## 17. Low Findings

### FINDING-LOW-01: Static Regex Test Reliance in Specific Suites
- **Severity:** Low (CVSS 3.1)
- **Location:** `tests/security-phase1-containment.test.ts`, `tests/security-phase1-correction.test.ts`, `tests/security-phase1-1-1-correction.test.ts`
- **Analysis:** These test files perform regex string assertions against `.sql` files rather than executing queries. This is mitigated by `security-phase1-1-1-postgres.integration.test.ts` which executes genuine SQL queries on PGlite.

---

## 18. Unverified Assumptions

1. **Staging Environment State:** It is assumed that the staging Supabase project has the same role hierarchy (`anon`, `authenticated`, `service_role`, `supabase_auth_admin`) and extensions as PGlite. This could not be verified due to staging unreachability.
2. **Production PostgREST Client Limitations:** It is assumed that external API clients cannot issue `SET ROLE` over PostgREST. This is standard in Supabase, but must be preserved by connection pooling configurations.
3. **Migration 14 Pre-Flight Data Backfill:** Migration 14 includes an automatic backfill copying `profiles.department_id` to `organization_members.department_id`. The volume and data integrity of this backfill in live production cannot be established without database access.

---

## 19. Recommended Corrections

1. **Deploy Migration 14 Directly (Skip Standalone Migration 13):**  
   Under no circumstances should Migration 13 be applied in production without Migration 14 immediately following in the same deployment transaction. Preferably, squash or execute Migrations 12, 13, 14, 15, and 16 as an atomic release.
2. **Harmonize TypeScript Permission Resolver:**  
   Update `src/server/db/repository.ts` to eliminate the admin bypass lines 1438–1449, aligning it with the SQL resolver, or document the backend bypass explicitly in ARCHITECTURE.md.
3. **Implement Profile Cache Eviction:**  
   Add a TTL or cache-invalidation webhook to `auth.middleware.ts` so that profile privilege updates in PostgreSQL take effect within seconds in Express.
4. **Restore Staging Database Connectivity:**  
   Resolve the DNS / network configuration for `[REDACTED].supabase.co` and run `supabase/staging/phase1_1_1_structural_verification.sql` and `phase1_1_1_behavioral_smoke.sql`.

---

## 20. Final Production Readiness Assessment

### Production Sign-Off Verdict: **NOT APPROVED**

#### Justification:
1. **Critical Defect in Phase 1.1 Scope:** Phase 1.1 as originally defined in Migration 13 contains a critical `SECURITY DEFINER` bypass vulnerability in the profile security field trigger, rendering profile immutability ineffective.
2. **Remediation Status:** Although Phase 1.1.1 (Migration 14) successfully fixes the trigger bypass, XOR permission resolution, and department derivation in the repository and embedded test suites, **no verification has been performed on the actual Supabase staging database**.
3. **Operational Prerequisite:** Before production release sign-off can be granted, the staging database connection must be restored, Migrations 12 through 16 must be executed, and the staging verification scripts must pass with 100% confirmation.

**Sign-Off Authority:**  
*Principal Application Security Engineer, PostgreSQL Security Specialist, and Supabase Architect*  
*PayPulse (JK Payroll) Security Assessment Team*
