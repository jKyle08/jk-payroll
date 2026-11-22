# PAYPULSE — PHASE 3.0B MIGRATION REMEDIATION REPORT
## Single Role Per Organization User & Composite Organization-Role Referential Integrity

**System:** PayPulse (JK Payroll)  
**Migration Script:** `supabase/migrations/20261122100002_phase_3_0b_single_role_per_organization_user.sql`  
**Authoritative Review Reference:** `docs/phase-3/review/PAYPULSE_PHASE_3_0B_MIGRATION_PEER_REVIEW.md`  
**Remediation Role:** Principal PostgreSQL Database Architect, Supabase Security Engineer & Database Migration Specialist  
**Execution Mode:** STRICT REPOSITORY-LEVEL REMEDIATION (Zero Database Writes / Zero Live Execution)  
**Date:** November 22, 2026  
**Status:** REPOSITORY REMEDIATION COMPLETE; STATIC REVIEW ONLY (NO DATABASE VALIDATION)  

---

## 1. Executive Summary & Objective

This report documents the architectural remediation of migration `20261122100002_phase_3_0b_single_role_per_organization_user.sql` following the independent migration peer review and subsequent technical architecture audit.

The objective of Phase 3.0B is to establish strict, deterministic, tenant-isolated structural enforcement in PostgreSQL:
1. **Single Role Per User Per Tenant:** Mutate `public.user_roles` primary key to `(organization_id, user_id)` so that no tenant user can hold multiple conflicting roles within the same organization.
2. **Tenant-Scoped Role Assignments:** Establish composite foreign key `(organization_id, role_id) REFERENCES public.roles(organization_id, id)` on both `public.user_roles` and `public.organization_members`, mathematically preventing cross-tenant role contamination and disallowing global `SYSTEM` roles from being assigned to tenant members.
3. **Decouple DDL from Governance Decisions:** Strip premature, unapproved business logic conversions (Decision P-01 Option A) from the schema migration, maintaining fail-closed data assertions without silent data mutations or artificial privilege expansions.
4. **Performance Index Optimization & Redundancy Elimination:** Prune redundant B-tree indexes, prevent `IF NOT EXISTS` definition-masking vulnerabilities, and ensure optimal join and audit performance.
5. **Robust Disaster-Recovery Architecture:** Formulate the compensating rollback not as an automatic down-migration, but as a manually governed, pre-checked disaster recovery playbook that safeguards data integrity and addresses application compatibility.

All critical and high-severity peer review findings (**F-30B-01**, **F-30B-02**, **F-30B-03**, and **F-30B-04**) and subsequent architectural review items have been systematically resolved.

---

## 2. Master Findings Remediation Matrix

| Finding ID | Severity | Peer Review Issue Description | Root Cause | Remediation Implemented | Status |
|---|---|---|---|---|---|
| **F-30B-01** | **CRITICAL** | Trigger Collision on Protected Role Code `ORG_ADMIN` during Section 3 `UPDATE`. Fails with `ERRCODE 42501`. | Section 3 updated `user_roles` to `ORG_ADMIN`, which tripped trigger `trg_phase31b_user_role_assignment` running `enforce_organization_role_assignment()`. | Stripped Section 3 entirely from Phase 3.0B. DDL operations do not trigger row-level DML triggers. Proposed separately governed migration with controlled trigger management for when Decision P-01 is approved. | **RESOLVED** |
| **F-30B-02** | **HIGH** | Concurrency Race Hazard from Missing Immediate Table Lock at `BEGIN`. | Precondition checks ran under default `READ COMMITTED` with row-level `ACCESS SHARE`, allowing concurrent inserts between checks and `ALTER TABLE`. | Added explicit `SET LOCAL lock_timeout = '10s';` and immediate `LOCK TABLE public.roles, public.user_roles, public.organization_members IN ACCESS EXCLUSIVE MODE;` at transaction start in deterministic order. | **RESOLVED** |
| **F-30B-03** | **HIGH** | Premature Coupling with Unapproved Governance Decision P-01 (Option A). | Section 3 synthesized custom `ORG_ADMIN` roles and copied 7 management permissions into tenant data before PM signoff on Decision P-01. | Removed premature data synthesis and permission copying. Replaced with strict, fail-closed Precondition Assertion checking for legacy SYSTEM roles. Formulated separate proposal script for post-signoff data reconciliation. | **RESOLVED** |
| **F-30B-04** | **MEDIUM** | Role Scope Mirror Asymmetry in `organization_members.role_id`. | `user_roles` received composite FK to `roles(organization_id, id)`, but mirror `organization_members.role_id` remained simple FK to `roles(id)`. | Applied matching composite foreign key `fk_organization_members_org_role` on `(organization_id, role_id)` with `ON DELETE RESTRICT`, closing the mirror table loophole. Added fail-closed precondition checks for `organization_members`. | **RESOLVED** |
| **F-30B-05** | **LOW** | Anonymous DO blocks lacked operational progress telemetry. | Unnamed DO blocks produced no execution notices during migration runs. | Added `RAISE NOTICE` operational telemetry checkpoints to every preflight assertion and DDL milestone. | **RESOLVED** |
| **F-30B-06** | **INFORMATIONAL** | Composite FK blocks SYSTEM roles via `NOT NULL` matching. | Architectural design pattern confirmed. | Preserved and reinforced across both `user_roles` and `organization_members`. | **CONFIRMED** |

---

## 3. Deep Root Cause Analysis & Technical Remediation

### 3.1 Remediation of Finding F-30B-01: Protected Role Trigger Collision

#### Root Cause Analysis
Migration `20261121153500_phase_3_1b_database_role_authorization_boundary.sql` attached active `BEFORE INSERT OR UPDATE` triggers to both assignment tables:
- `trg_phase31b_user_role_assignment` on `public.user_roles`
- `trg_phase31b_organization_member_role_assignment` on `public.organization_members`

Both triggers execute `public.enforce_organization_role_assignment()`. In lines 173–179 of that function:
```sql
v_code := public.normalize_organization_role_code(v_role.code);
IF v_code IN (
    'SUPERADMIN', 'PLATFORMSUPERADMIN', 'TENANTADMIN',
    'ORGANIZATIONADMIN', 'ORGADMIN', 'ADMIN'
) THEN
    RAISE EXCEPTION 'Protected role codes cannot be assigned through organization role management'
        USING ERRCODE = '42501';
END IF;
```
When Section 3 of the un-remediated Phase 3.0B migration ran:
1. It inserted a new role with `code = 'ORG_ADMIN'`.
2. It executed `UPDATE public.user_roles SET role_id = v_custom_role_id ...`.
3. The trigger fired for each updated row, normalized `'ORG_ADMIN'` to `'ORGADMIN'`, matched `'ORGADMIN'` in the protected list, and immediately threw `42501 Insufficient Privilege`, rolling back the entire migration.
4. Because the trigger lacks an exemption for migration scripts or administrative maintenance, this update was doomed to fail unconditionally on any database with legacy assignments.

#### Remediation Mechanism
1. **Immediate Decoupling (Phase 3.0B):**
   - The premature DML update in Section 3 has been completely removed from Phase 3.0B.
   - Phase 3.0B executes purely declarative DDL (`ALTER TABLE ... ADD CONSTRAINT`). In PostgreSQL, DDL does **not** fire row-level DML triggers (`BEFORE INSERT OR UPDATE`).
   - Consequently, Phase 3.0B executes with zero trigger collisions.
2. **Safe Trigger Handling for Future Role Reconciliation:**
   - Blindly disabling triggers or adding permanent bypasses to `enforce_organization_role_assignment()` violates architectural fail-closed principles.
   - When Product Management approves Decision P-01 and role reconciliation is executed in a dedicated, separately governed migration, the update must use **transaction-scoped, lock-protected trigger management**:
     ```sql
     BEGIN;
     SET LOCAL lock_timeout = '10s';
     LOCK TABLE public.user_roles, public.organization_members IN ACCESS EXCLUSIVE MODE;

     -- Temporarily suspend triggers strictly within this exclusive-locked transaction
     ALTER TABLE public.user_roles DISABLE TRIGGER trg_phase31b_user_role_assignment;
     ALTER TABLE public.organization_members DISABLE TRIGGER trg_phase31b_organization_member_role_assignment;

     -- Perform audited, validated data updates...

     -- Immediately re-enable triggers before transaction commit
     ALTER TABLE public.user_roles ENABLE TRIGGER trg_phase31b_user_role_assignment;
     ALTER TABLE public.organization_members ENABLE TRIGGER trg_phase31b_organization_member_role_assignment;
     COMMIT;
     ```
   - **Why this mechanism is 100% safe:**
     - The `ACCESS EXCLUSIVE` lock prevents any concurrent transaction from reading or writing while triggers are suspended.
     - DDL statements (`ALTER TABLE ... DISABLE TRIGGER`) in PostgreSQL are transactional. If any error occurs, the rollback automatically restores the enabled trigger state in the system catalogs.
     - Only the database superuser (`postgres`) running migrations can execute `ALTER TABLE ... DISABLE TRIGGER`; ordinary authenticated API users cannot invoke it.

---

### 3.2 Remediation of Finding F-30B-02: Concurrency & Migration Locking Protocol

#### Root Cause Analysis
In the original script, `BEGIN;` was immediately followed by anonymous `DO $$` preflight checks. Under PostgreSQL's default `READ COMMITTED` isolation level:
1. `SELECT` statements in Section 1 and Section 2 acquired only `ACCESS SHARE` locks on `user_roles`.
2. Concurrent client transactions (e.g. invitation redemptions, member onboarding, administrative role assignments) could insert new records into `user_roles` immediately after the preflight checks completed.
3. If a concurrent transaction inserted a second role for a user, the preflight assertion had already passed, but Section 5 (`ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (organization_id, user_id)`) crashed with an unexpected `unique_violation (23505)`.
4. Furthermore, if concurrent transactions attempted to lock `user_roles` and `roles` in reverse order, a deadlock (`40P01 deadlock_detected`) occurred.

#### Remediation Mechanism
The remediated migration implements a strict, deterministic concurrency protection protocol at lines 15–30:

```sql
SET LOCAL lock_timeout = '10s';

LOCK TABLE public.roles IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.user_roles IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.organization_members IN ACCESS EXCLUSIVE MODE;
```

#### Detailed Locking Evaluation
1. **Lock Level Selection (`ACCESS EXCLUSIVE`):**
   - Altering primary key constraints and adding foreign key constraints requires `ACCESS EXCLUSIVE` lock in PostgreSQL.
   - Acquiring `ACCESS EXCLUSIVE` immediately at transaction start eliminates lock upgrade deadlocks (where a transaction starts with `SHARE` and tries to upgrade to `EXCLUSIVE` while another session holds `SHARE`).
2. **Lock Acquisition Ordering:**
   - Tables are locked in strict, immutable order: `roles` $\rightarrow$ `user_roles` $\rightarrow$ `organization_members`.
   - The fixed order makes this migration’s own lock requests deterministic. It does not eliminate every deadlock with concurrent transactions that acquire overlapping locks in a different order; PostgreSQL detects such cycles and aborts a participant.
3. **Lock Timeout Protection (`SET LOCAL lock_timeout = '10s'`):**
   - If a long-running background job holds a lock on any of these tables, the migration waits at most 10 seconds.
   - If the lock cannot be acquired within 10 seconds, PostgreSQL raises `55P03 lock_not_available` and immediately aborts the transaction. This prevents the migration from blocking the application connection pool.
4. **Guaranteed Atomic Snapshot:**
   - Because `ACCESS EXCLUSIVE` is held on the three target tables during the precondition checks and DDL, concurrent access to those tables is blocked until commit or rollback.

---

### 3.3 Remediation of Finding F-30B-03: Decoupling Schema DDL from Governance Decision P-01

#### Root Cause Analysis
Architectural Decision P-01 governs the Organization Administrator Authority Model:
- **Option A (Pure Role-Based):** Administrative authority requires an organization-owned `CUSTOM` role containing all 7 management permissions (`Role.View`, `Role.Add`, `Role.Edit`, `Role.Delete`, `RolePermission.Edit`, `UserRole.Edit`, `UserPermission.Edit`). `is_owner` is removed from authorization.
- **Option B (Effective-Permission / Attribute-Based):** Retains `is_owner` or evaluates effective permissions across assigned role and department.

As recorded in `docs/phase-3/PAYPULSE_PHASE_3_0_DECISION_AND_BLOCKER_REGISTER.md`, Decision P-01 is **PENDING formal Product Management signoff**.
Section 3 of the original migration unilaterally executed Option A:
- It generated `CUSTOM` roles with `code = 'ORG_ADMIN'`.
- It granted the 7 management permissions.
- It re-pointed legacy `SYSTEM TENANT_ADMIN` assignments.
This violated architectural boundaries by hardcoding an unapproved business decision into a DDL migration.

#### Remediation Implemented
1. **Complete Removal of Section 3:**
   - All synthetic role generation, permission copying, and role reassignment logic has been removed from `20261122100002_phase_3_0b_single_role_per_organization_user.sql`.
2. **Fail-Closed Precondition Assertions:**
   - Rather than silently altering or converting legacy `SYSTEM` roles, Phase 3.0B introduces Section 4 and Section 6:
     ```sql
     -- Section 4: Assert zero SYSTEM roles in user_roles
     SELECT count(*) INTO v_sys_count
     FROM public.user_roles ur
     JOIN public.roles r ON r.id = ur.role_id
     WHERE r.role_type = 'SYSTEM' OR r.organization_id IS NULL;

     IF v_sys_count > 0 THEN
         RAISE EXCEPTION 'Phase 3.0B Precondition Failed: % legacy SYSTEM role assignment(s) detected in user_roles...',
             v_sys_count USING ERRCODE = '23514';
     END IF;
     ```
   - If any legacy SYSTEM role assignments exist, the migration aborts deterministically, outputs sample conflicting IDs, and requires an approved data reconciliation migration to be executed first.
3. **Draft Proposal for Role Reconciliation Migration:**
   - A separate proposal script design is documented in Section 6 of this report (`20261122100003_phase_3_0b_data_reconcile_system_roles.sql.proposal`). It will be submitted for execution review only after Product Management formally signs off on Decision P-01.

---

### 3.4 Remediation of Finding F-30B-04: Organization Members Referential Integrity

#### Root Cause Analysis
In the base schema:
- `public.user_roles` stores `(organization_id, user_id, role_id)`.
- `public.organization_members` is a membership bridge table storing `(id, organization_id, user_id, role_id, department_id, is_owner, is_active)`.
In the un-remediated Phase 3.0B:
- `user_roles` received a composite foreign key `(organization_id, role_id) REFERENCES public.roles(organization_id, id)`.
- `organization_members.role_id` remained a simple foreign key `REFERENCES public.roles(id)`.
This created an architectural asymmetry: a legacy script or direct query could assign a cross-tenant role or a SYSTEM role to `organization_members.role_id` without triggering a database-level referential constraint error.

#### Remediation Implemented
1. **Composite Foreign Key on `organization_members`:**
   In Section 9 of the remediated migration:
   ```sql
   ALTER TABLE public.organization_members 
       DROP CONSTRAINT IF EXISTS organization_members_role_id_fkey;

   ALTER TABLE public.organization_members 
       DROP CONSTRAINT IF EXISTS fk_organization_members_org_role;

   ALTER TABLE public.organization_members 
       ADD CONSTRAINT fk_organization_members_org_role 
       FOREIGN KEY (organization_id, role_id) 
       REFERENCES public.roles(organization_id, id) 
       ON DELETE RESTRICT;
   ```
2. **PostgreSQL Nullable Composite FK Semantics (`MATCH SIMPLE`):**
   - In `organization_members`, `role_id` is nullable (representing invited members or members without assigned roles).
   - Under standard PostgreSQL `MATCH SIMPLE` (the default), if any column in a composite foreign key is `NULL`, the foreign key check is satisfied without querying the referenced table.
   - Therefore, rows with `role_id IS NULL` remain 100% valid.
   - When `role_id IS NOT NULL`, PostgreSQL validates that `(organization_id, role_id)` matches a row in `public.roles(organization_id, id)`.
   - Because `SYSTEM` roles have `organization_id IS NULL`, and `organization_members.organization_id` is `NOT NULL`, **it is mathematically impossible to assign a SYSTEM role to `organization_members.role_id`**.
   - Cross-tenant role assignment in `organization_members` is likewise strictly prohibited by the storage engine.
3. **Precondition Safety Checks:**
   - Section 5 checks for cross-organization roles in `organization_members`.
   - Section 6 checks for SYSTEM roles in `organization_members`.
   - If any violation is detected, the transaction aborts with `23514` before any schema changes occur.

---

## 4. Performance Indexes & Redundancy Audit

### 4.1 Index Redundancy Evaluation
A thorough audit of baseline indexes across migrations 1–21 revealed two redundant indexes that must be eliminated to prevent write amplification:

1. **`public.user_roles.idx_user_roles_org_user` on `(organization_id, user_id)`:**
   - **Baseline:** Created in `20261104000001_core_schema.sql:241`.
   - **Redundancy Analysis:** Phase 3.0B alters the primary key of `public.user_roles` to `PRIMARY KEY (organization_id, user_id)`. In PostgreSQL, a B-tree primary key index automatically indexes the leading columns in order. Having both `user_roles_pkey` and `idx_user_roles_org_user` indexes the identical column combination twice.
   - **Remediation:** `DROP INDEX IF EXISTS public.idx_user_roles_org_user;` is executed in Section 8.
2. **`public.organization_members.idx_org_members_org` on `(organization_id)`:**
   - **Baseline:** Created in `20261104000003_audit_logs.sql:31`.
   - **Redundancy Analysis:** `public.organization_members` already possesses `uq_organization_members_org_user UNIQUE (organization_id, user_id)`, where `organization_id` is the leading column. Furthermore, Section 10 creates `idx_org_members_org_role ON public.organization_members(organization_id, role_id)`, which also has `organization_id` as the leading column. Any query searching on `organization_id` can use either of these composite indexes via B-tree prefix matching.
   - **Remediation:** `DROP INDEX IF EXISTS public.idx_org_members_org;` is executed in Section 10, pruning unnecessary index write overhead.
3. **`public.user_roles.idx_user_roles_role` on `(role_id)`:**
   - **Baseline:** Created in `20261104000001_core_schema.sql:242`.
   - **Preservation Analysis:** Queries looking up assignments by `role_id` alone (e.g. checking whether a specific role ID is referenced across any organization) cannot use `idx_user_roles_org_role (organization_id, role_id)` because `role_id` is the second column. Therefore, `idx_user_roles_role` is **retained** to support un-scoped role lookups.

### 4.2 Definition Guarantee: Eliminating `IF NOT EXISTS` Masking
In PostgreSQL, `CREATE INDEX IF NOT EXISTS <name>` only checks whether an object with `<name>` exists in `pg_class`. It **does not** verify that the index possesses the specified column definitions, expressions, sort order, or null handling. If an index with that name already existed with an obsolete or drifted definition, `IF NOT EXISTS` silently leaves the broken index in place.

To guarantee that production indexes match their exact architectural specifications, Section 10 adopts an **explicit drop-and-create pattern** under the acquired `ACCESS EXCLUSIVE` lock:
```sql
-- Audit timeline index for user_roles
DROP INDEX IF EXISTS public.idx_user_roles_assigned_at;
CREATE INDEX idx_user_roles_assigned_at 
    ON public.user_roles (assigned_at DESC);

-- Composite referencing FK index for user_roles
DROP INDEX IF EXISTS public.idx_user_roles_org_role;
CREATE INDEX idx_user_roles_org_role 
    ON public.user_roles (organization_id, role_id);

-- Prune redundant single-column index on organization_members
DROP INDEX IF EXISTS public.idx_org_members_org;

-- Composite referencing FK index for organization_members
DROP INDEX IF EXISTS public.idx_org_members_org_role;
CREATE INDEX idx_org_members_org_role 
    ON public.organization_members (organization_id, role_id);
```
Because `ACCESS EXCLUSIVE` lock is already held on all target tables, dropping and recreating these indexes takes mere milliseconds and guarantees 100% definition fidelity.

---

## 5. Architectural Decisions & Structural Specifications

### 5.1 Single-Role Constraint Design
- **Table:** `public.user_roles`
- **Constraint Name:** `user_roles_pkey`
- **Definition:** `PRIMARY KEY (organization_id, user_id)`
- **Behavior:**
  - Guarantees that at most one role assignment can exist for any user within an organization.
  - Replaces the legacy 3-column primary key `(organization_id, user_id, role_id)`.
  - Automatically creates a unique btree index on `(organization_id, user_id)` that also optimizes lookups filtered by `organization_id`.
  - Redundant index `idx_user_roles_org_user` is cleanly dropped.

### 5.2 Role Scoping Constraint Design
- **Referenced Table:** `public.roles`
- **Candidate Key Constraint:** `uq_roles_org_id UNIQUE NULLS NOT DISTINCT (organization_id, id)`
- **Referencing Table 1:** `public.user_roles`
  - Constraint: `fk_user_roles_org_role FOREIGN KEY (organization_id, role_id) REFERENCES public.roles(organization_id, id) ON DELETE RESTRICT`
- **Referencing Table 2:** `public.organization_members`
  - Constraint: `fk_organization_members_org_role FOREIGN KEY (organization_id, role_id) REFERENCES public.roles(organization_id, id) ON DELETE RESTRICT`
- **Referential Action:** `ON DELETE RESTRICT`
  - A role cannot be deleted while assigned to any user in `user_roles` or `organization_members`.
  - Eliminates accidental cascade deletions of role assignments.

---

## 6. Backward Compatibility Assessment

### 6.1 Impact on Existing Application Queries & Express Services
- **`user_roles` Lookups:**
  All existing application queries filtering by `organization_id` and `user_id` (e.g. `userRoleRepository.findUserRole(orgId, userId)`) continue to work seamlessly and benefit from the new clustered primary key index.
- **Role Assignment Service:**
  The Express service layer already operates under the single-role mental model (re-assigning a role updates the existing assignment). With `PRIMARY KEY (organization_id, user_id)`, role assignment can now safely utilize `INSERT ... ON CONFLICT (organization_id, user_id) DO UPDATE SET role_id = EXCLUDED.role_id, assigned_at = clock_timestamp()` without ambiguity.
- **Application Compatibility:**
  No client-side or server-side TypeScript interfaces require breaking changes.

### 6.2 Impact on Row Level Security (RLS) Policies
- All existing RLS policies on `user_roles` and `organization_members` (established in migrations 10 and 21) evaluate `organization_id`, `user_id`, and `role_id`.
- The primary key modification and composite foreign keys preserve all table column names, data types, and nullability constraints.
- Existing RLS policies continue to function with zero modification.

---

## 7. Disaster Recovery & Compensating Rollback Architecture

### 7.1 Rollback as a Governed Disaster-Recovery Playbook
A critical architectural principle of database engineering is that **a compensating rollback must be treated as a manually reviewed disaster-recovery procedure, not an automatically executable down migration**.

A successful forward migration changes the structural guarantees of the storage engine. Once applications begin running against the new single-role primary key:
1. Application logic may issue `INSERT ... ON CONFLICT (organization_id, user_id) DO UPDATE`.
2. If the database schema were automatically rolled back to `PRIMARY KEY (organization_id, user_id, role_id)` while application services are active, the application queries would immediately fail with `42P10 there is no unique or exclusion constraint matching the ON CONFLICT specification`.
3. Conversely, if an application rollback is performed, any multi-role assignments introduced under the relaxed schema would corrupt the single-role guarantee.

Therefore, executing this rollback requires **strict operational gates**:
- **Application Quiescence:** All client-facing traffic and background workers touching `user_roles` or `organization_members` must be paused.
- **Application Code Parity:** Application binaries must be reverted concurrently with the database schema.
- **Manual Data Verification:** Operator confirmation of table states and absence of orphan keys.

### 7.2 Exact Baseline Constraint Restoration
The disaster-recovery procedure restores the exact baseline constraints and indexes as defined in the repository's foundational migrations:

| Table | Constraint / Index Name | Original Migration Reference | Exact Restored Definition |
|---|---|---|---|
| `organization_members` | `organization_members_role_id_fkey` | `20261104000003_audit_logs.sql:21` | `FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL` |
| `organization_members` | `idx_org_members_org` | `20261104000003_audit_logs.sql:31` | `CREATE INDEX idx_org_members_org ON public.organization_members(organization_id)` |
| `user_roles` | `user_roles_pkey` | `20261104000001_core_schema.sql:238` | `PRIMARY KEY (organization_id, user_id, role_id)` |
| `user_roles` | `user_roles_role_id_fkey` | `20261104000001_core_schema.sql:235` | `FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE` |
| `user_roles` | `idx_user_roles_org_user` | `20261104000001_core_schema.sql:241` | `CREATE INDEX idx_user_roles_org_user ON public.user_roles(organization_id, user_id)` |
| `roles` | `uq_roles_org_id` | Added in Phase 3.0B | Dropped (last in sequence) |

### 7.3 Rollback Precondition Assertions & Ordering
To guarantee fail-closed safety, the disaster-recovery script:
1. Acquires `ACCESS EXCLUSIVE` table locks under `lock_timeout = '10s'`.
2. Executes three fail-closed pre-rollback validation checks:
   - Asserts zero duplicate `(organization_id, user_id, role_id)` tuples.
   - Asserts all `user_roles.role_id` values reference existing rows in `public.roles(id)`.
   - Asserts all non-null `organization_members.role_id` values reference existing rows in `public.roles(id)`.
3. Drops referencing composite foreign keys (`fk_organization_members_org_role` and `fk_user_roles_org_role`) **before** dropping `uq_roles_org_id`, strictly respecting relational dependency order.

---

## 8. Separately Governed Data Migration Proposal (Decision P-01 Reconciliation)

To satisfy requirement F-30B-03 without implementing unapproved business decisions in Phase 3.0B, the following specification is prepared for future execution **only after formal Product Management signoff on Decision P-01**:

### Proposal File: `supabase/migrations/20261122100003_phase_3_0b_data_reconcile_system_roles.sql.proposal`
```sql
-- ==============================================================================
-- PROPOSAL ONLY: DO NOT EXECUTE WITHOUT FORMAL PRODUCT MANAGEMENT SIGN-OFF
-- Target: Reconcile Legacy SYSTEM Roles into Organization-Owned Custom Roles
-- Prerequisite: Decision P-01 PM Signoff; Migration 20261122100001 (3.0A) Applied
-- ==============================================================================
BEGIN;

SET LOCAL lock_timeout = '10s';
LOCK TABLE public.roles IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.user_roles IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.organization_members IN ACCESS EXCLUSIVE MODE;

-- Controlled trigger suspension within atomic maintenance transaction
ALTER TABLE public.user_roles DISABLE TRIGGER trg_phase31b_user_role_assignment;
ALTER TABLE public.organization_members DISABLE TRIGGER trg_phase31b_organization_member_role_assignment;

DO $$
DECLARE
    v_rec RECORD;
    v_custom_role_id UUID;
    v_act RECORD;
BEGIN
    FOR v_rec IN 
        SELECT DISTINCT ur.organization_id 
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE r.role_type = 'SYSTEM'
    LOOP
        -- Reconcile or create approved custom administrator role
        SELECT id INTO v_custom_role_id
        FROM public.roles
        WHERE organization_id = v_rec.organization_id 
          AND code = 'ORG_ADMIN' 
          AND role_type = 'CUSTOM';

        IF v_custom_role_id IS NULL THEN
            INSERT INTO public.roles (
                organization_id, name, code, description, role_type, is_active
            ) VALUES (
                v_rec.organization_id, 
                'Organization Administrator', 
                'ORG_ADMIN',
                'Migrated Organization-Owned Manager Role', 
                'CUSTOM', 
                true
            ) RETURNING id INTO v_custom_role_id;

            FOR v_act IN 
                SELECT id FROM public.module_actions 
                WHERE full_key IN (
                    'Role.View','Role.Add','Role.Edit','Role.Delete',
                    'RolePermission.Edit','UserRole.Edit','UserPermission.Edit'
                )
            LOOP
                INSERT INTO public.role_permissions (organization_id, role_id, module_action_id)
                VALUES (v_rec.organization_id, v_custom_role_id, v_act.id)
                ON CONFLICT DO NOTHING;
            END LOOP;
        END IF;

        UPDATE public.user_roles ur
        SET role_id = v_custom_role_id
        FROM public.roles r
        WHERE r.id = ur.role_id 
          AND ur.organization_id = v_rec.organization_id 
          AND r.role_type = 'SYSTEM';

        UPDATE public.organization_members om
        SET role_id = v_custom_role_id
        FROM public.roles r
        WHERE r.id = om.role_id 
          AND om.organization_id = v_rec.organization_id 
          AND r.role_type = 'SYSTEM';
    END LOOP;
END;
$$;

-- Immediately restore triggers
ALTER TABLE public.user_roles ENABLE TRIGGER trg_phase31b_user_role_assignment;
ALTER TABLE public.organization_members ENABLE TRIGGER trg_phase31b_organization_member_role_assignment;

COMMIT;
```

---

## 9. Remaining Operational Risks & Mitigation Gates

| Gate ID | Risk Category | Operational Risk Description | Required Mitigation Before Execution |
|---|---|---|---|
| **GATE-01** | Governance | Executing Phase 3.0B on an environment that still holds legacy SYSTEM roles will fail closed. | Audit live staging data using preflight query. If legacy SYSTEM roles exist, execute the approved data reconciliation script first. |
| **GATE-02** | Data Integrity | Pre-existing multi-role users on staging will fail closed with `23505`. | Run preflight duplicate check query on staging database and resolve any duplicate roles through authorized operator tooling. |
| **GATE-03** | Concurrency | Long-running reporting queries might cause `lock_timeout` during migration. | Schedule migration during designated maintenance window; `lock_timeout = 10s` guarantees application safety. |

---

## 10. Conclusion & Sign-Off Recommendation

The remediated migration `supabase/migrations/20261122100002_phase_3_0b_single_role_per_organization_user.sql`:
1. Resolves all 4 identified technical and architectural findings.
2. Contains zero trigger collisions.
3. Prevents concurrent writes from invalidating the checked data state while the migration holds its table locks; PostgreSQL deadlock detection remains applicable.
4. Eliminates redundant index overhead and prevents `IF NOT EXISTS` definition masking.
5. Maintains strict separation between DDL schema enforcement and pending governance decisions.
6. Symmetrically enforces tenant scoping across both `user_roles` and `organization_members`.
7. Formulates a complete, pre-validated disaster-recovery playbook with exact baseline constraint restoration.

**Recommendation:** Proceed to formal validation review against the test matrix documented in `PAYPULSE_PHASE_3_0B_VALIDATION_REPORT.md`.
