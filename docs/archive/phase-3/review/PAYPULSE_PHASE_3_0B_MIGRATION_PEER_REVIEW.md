# PAYPULSE — PHASE 3.0B INDEPENDENT MIGRATION PEER REVIEW
## Single Role Per User & Organization Role Scoping Migration Safety & Technical Audit

**System:** PayPulse (JK Payroll)  
**Migration File:** `supabase/migrations/20261122100002_phase_3_0b_single_role_per_organization_user.sql`  
**Stack:** React 19, Express 4, Supabase Auth, PostgreSQL 17+  
**Review Type:** Independent Architecture, Concurrency & Database Security Audit  
**Review Date:** November 22, 2026  
**Execution Mode:** STRICT READ-ONLY REPOSITORY REVIEW (No DB writes or execution authorized)

---

## 1. Executive Summary

This document presents an independent technical peer review of Phase 3.0B migration script: `20261122100002_phase_3_0b_single_role_per_organization_user.sql`.

Phase 3.0B intends to accomplish three distinct structural objectives:
1. Enforce a single role per user per organization by altering the `public.user_roles` primary key to `(organization_id, user_id)`.
2. Enforce organization scoping on role assignments by adding composite foreign key `(organization_id, role_id) REFERENCES public.roles(organization_id, id)`.
3. Reconcile legacy `SYSTEM` role assignments (`TENANT_ADMIN`) by converting them into organization-owned `CUSTOM` manager roles (`ORG_ADMIN`).

### Final Peer Review Verdict: **REVISION REQUIRED**

The migration contains a **CRITICAL execution-blocking defect** and two **HIGH severity architectural/concurrency risks**:
1. **CRITICAL Trigger Collision (Finding F-30B-01):** Section 3 updates `user_roles` and `organization_members` setting `role_id` to a newly created `ORG_ADMIN` custom role. This triggers `public.enforce_organization_role_assignment()` established in Phase 3.1b, which **strictly and unconditionally raises an exception (ERRCODE 42501)** because `'ORGADMIN'` is a protected role code. As authored, this migration **will immediately crash and abort** if any organization has legacy `SYSTEM` role assignments.
2. **HIGH Concurrency Gap (Finding F-30B-02):** The migration does not acquire an immediate table lock at `BEGIN`. A concurrent transaction between Section 1 and Section 5 can insert multi-role records, bypassing preflight assertions and failing the migration unexpectedly.
3. **HIGH Premature Governance Coupling (Finding F-30B-03):** Section 3 embeds an irreversible data conversion implementing **Option A** (Decision P-01) before formal Product Management governance approval.

Execution review cannot proceed until these issues are formally remediated.

---

## 2. SQL Artifact Specification Under Review

The review is based on the authoritative code located at [20261122100002_phase_3_0b_single_role_per_organization_user.sql](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261122100002_phase_3_0b_single_role_per_organization_user.sql):

- **Lines 8–158:** Migration wrapped in transaction block (`BEGIN ... COMMIT`).
- **Section 1 (Lines 14–35):** Precondition Assertion: Multi-role detection in `user_roles`.
- **Section 2 (Lines 41–54):** Precondition Assertion: Cross-organization role detection.
- **Section 3 (Lines 60–122):** Dynamic data reconciliation DO block: Migrates `SYSTEM` role assignments to custom `ORG_ADMIN` roles.
- **Section 4 (Lines 128–133):** DDL: Adds `uq_roles_org_id` on `public.roles (organization_id, id)`.
- **Section 5 (Lines 138–156):** DDL: Alters `user_roles` primary key to `(organization_id, user_id)`, adds composite foreign key `fk_user_roles_org_role`, and creates index.

---

## 3. Deep Technical Audit by Dimension

### 3.1 Precondition Assertions & Failure Modes

#### A. Multi-Role Assertion (Section 1)
```sql
SELECT count(*), string_agg(ur.user_id::text || '@' || ur.organization_id::text, ', ')
INTO v_conflict_count, v_sample_conflict
FROM (
    SELECT organization_id, user_id
    FROM public.user_roles
    GROUP BY organization_id, user_id
    HAVING count(*) > 1
    LIMIT 5
) ur;

IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Phase 3.0B Precondition Failed: % multi-role user conflicts detected...',
        v_conflict_count, v_sample_conflict USING ERRCODE = '23505';
END IF;
```
- *Evaluation:* Excellent fail-closed design. Rather than silently dropping duplicate roles (which could revoke user access without an audit trail), it aborts the transaction with error code `23505` (`unique_violation`) and outputs sample IDs for manual operator resolution.

#### B. Cross-Organization Role Assertion (Section 2)
```sql
IF EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE r.organization_id IS NOT NULL 
      AND r.organization_id <> ur.organization_id
) THEN
    RAISE EXCEPTION 'Phase 3.0B Precondition Failed: Cross-organization role assignment detected in user_roles.'
        USING ERRCODE = '23514';
END IF;
```
- *Evaluation:* Correctly detects cross-tenant contamination where a tenant holds a role owned by another tenant.

#### C. Precondition Concurrency Vulnerability (Finding F-30B-02)
- *Mechanism:* The script issues `BEGIN;` followed immediately by the `DO $$ ... $$` blocks.
- *Vulnerability:* Under PostgreSQL default `READ COMMITTED` transaction isolation, `SELECT` queries take only row-level `ACCESS SHARE` locks.
- If a concurrent user registration, role assignment, or invitation acceptance commits a second role for a user *after* Section 1 completes but *before* Section 5 executes `ALTER TABLE ... ADD CONSTRAINT user_roles_pkey`, the DDL statement in Section 5 will fail with an unhandled unique violation.
- *Correction:* The transaction must acquire an explicit exclusive lock immediately at the start of the transaction:
  ```sql
  BEGIN;
  LOCK TABLE public.user_roles IN ACCESS EXCLUSIVE MODE;
  LOCK TABLE public.organization_members IN ACCESS EXCLUSIVE MODE;
  ```

---

### 3.2 CRITICAL DEFECT: Trigger Collision on Protected Role Code `ORG_ADMIN` (Finding F-30B-01)

#### A. Defect Mechanism Analysis
In Section 3 (Lines 80–120), the migration iterates over organizations having users assigned to `SYSTEM` roles (such as legacy `TENANT_ADMIN`):
1. It creates an organization-owned `CUSTOM` role:
   ```sql
   INSERT INTO public.roles (organization_id, name, code, description, role_type, is_active)
   VALUES (v_rec.organization_id, 'Organization Administrator', 'ORG_ADMIN', ..., 'CUSTOM', true)
   RETURNING id INTO v_custom_role_id;
   ```
2. It assigns the newly created role to `public.user_roles`:
   ```sql
   UPDATE public.user_roles ur
   SET role_id = v_custom_role_id
   FROM public.roles r
   WHERE r.id = ur.role_id AND ur.organization_id = v_rec.organization_id AND r.role_type = 'SYSTEM';
   ```
3. It assigns the newly created role to `public.organization_members`:
   ```sql
   UPDATE public.organization_members om
   SET role_id = v_custom_role_id
   FROM public.roles r
   WHERE r.id = om.role_id AND om.organization_id = v_rec.organization_id AND r.role_type = 'SYSTEM';
   ```

#### B. The Collision with Migration `20261121153500_phase_3_1b`
Migration `20261121153500_phase_3_1b_database_role_authorization_boundary.sql` attached active `BEFORE INSERT OR UPDATE` triggers to both tables:
- `trg_phase31b_user_role_assignment` on `public.user_roles`
- `trg_phase31b_organization_member_role_assignment` on `public.organization_members`

Both triggers execute `public.enforce_organization_role_assignment()`. In that function:
```sql
v_code := public.normalize_organization_role_code(v_role.code);
-- When v_role.code = 'ORG_ADMIN', normalize_organization_role_code returns 'ORGADMIN'

IF v_code IN (
    'SUPERADMIN', 'PLATFORMSUPERADMIN', 'TENANTADMIN',
    'ORGANIZATIONADMIN', 'ORGADMIN', 'ADMIN'
) THEN
    RAISE EXCEPTION 'Protected role codes cannot be assigned through organization role management'
        USING ERRCODE = '42501';
END IF;
```

#### C. Why the Migration Aborts
- `enforce_organization_role_assignment()` **does not exempt migrations running as `postgres` or administrative maintenance**.
- While lines 135–165 contain a narrow exception for `v_code = 'TENANTADMIN' AND v_role.role_type = 'SYSTEM' AND v_role.organization_id IS NULL`, there is **zero exception** for role assignments where `v_code = 'ORGADMIN'`.
- The moment the `UPDATE public.user_roles` executes, the trigger fires, evaluates `v_code IN ('..., ORGADMIN, ...')`, and immediately terminates the transaction with `42501 Insufficient Privilege`.
- **Conclusion:** As authored, migration Phase 3.0B is completely inoperable against any database that contains legacy `SYSTEM` role assignments.

#### D. Remediation Alternatives
1. **Option 1 (Trigger Suspension during Migration):**
   ```sql
   ALTER TABLE public.user_roles DISABLE TRIGGER trg_phase31b_user_role_assignment;
   ALTER TABLE public.organization_members DISABLE TRIGGER trg_phase31b_organization_member_role_assignment;
   -- Perform data migration
   ALTER TABLE public.user_roles ENABLE TRIGGER trg_phase31b_user_role_assignment;
   ALTER TABLE public.organization_members ENABLE TRIGGER trg_phase31b_organization_member_role_assignment;
   ```
2. **Option 2 (Session Replication Role):**
   Execute the data conversion under `SET LOCAL session_replication_role = 'replica';` to suppress non-replica triggers.
3. **Option 3 (Decouple Data Migration):**
   Extract Section 3 entirely into a standalone, reviewed data reconciliation script that handles trigger bypass safely.

---

### 3.3 Premature Governance Coupling with Decision P-01 (Finding F-30B-03)

- *Context:* Architectural Decision P-01 (Organization Administrator Authority Model) defines two competing models:
  - **Option A:** Pure Role-Based (`is_owner` removed from authorization; management delegated to organization-owned custom `ORG_ADMIN` role).
  - **Option B:** Attribute-Based (`is_owner` or explicit flag retains administrative authority).
- *Finding:* Phase 2.2 and Phase 3.0 governance documentation explicitly stipulate that **Option A is a recommendation pending formal Product Management signoff**.
- By creating `ORG_ADMIN` roles and copying 7 administrative permissions, Phase 3.0B hardcodes Option A into the database state.
- If Product Management elects Option B or Option C, this data conversion leaves behind rogue custom administrator roles that violate governance.
- *Recommendation:* DDL constraints (single role PK and composite FK) should be decoupled from the business role conversion.

---

### 3.4 Single-Role Constraint & Composite Foreign Key Audit

#### A. Single Role Enforcement
```sql
ALTER TABLE public.user_roles 
    DROP CONSTRAINT IF EXISTS user_roles_pkey;

ALTER TABLE public.user_roles 
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (organization_id, user_id);
```
- Replaces the 3-column primary key `(organization_id, user_id, role_id)` with `(organization_id, user_id)`.
- Enforces single role per user per tenant directly at the storage engine level.
- No user can hold multiple roles in the same organization.

#### B. Composite Role-Scoping Foreign Key
```sql
ALTER TABLE public.roles 
    ADD CONSTRAINT uq_roles_org_id UNIQUE NULLS NOT DISTINCT (organization_id, id);

ALTER TABLE public.user_roles 
    ADD CONSTRAINT fk_user_roles_org_role 
    FOREIGN KEY (organization_id, role_id) 
    REFERENCES public.roles(organization_id, id) 
    ON DELETE RESTRICT;
```
- *Brilliant Scope Isolation:*
  - In `public.roles`, global system roles have `organization_id IS NULL`.
  - In `public.user_roles`, `organization_id` is strictly `NOT NULL`.
  - Because `fk_user_roles_org_role` matches `(ur.organization_id, ur.role_id)` with `(r.organization_id, r.id)`, **it is mathematically impossible to assign a SYSTEM role (`organization_id IS NULL`) to any tenant user in `user_roles`**.
  - Cross-tenant role assignments are also strictly forbidden.
- *Asymmetry Critique (Finding F-30B-04):*
  - `public.organization_members.role_id` was NOT updated with a composite foreign key. It remains a simple foreign key to `public.roles(id)`.
  - An administrative error or legacy script could set `organization_members.role_id` to a cross-tenant or system role, introducing divergence between `user_roles` and `organization_members`.

---

## 4. Findings Summary for Phase 3.0B

| Finding ID | Severity | Line Reference | Description | Blocks Execution? |
|---|---|---|---|---|
| **F-30B-01** | CRITICAL | Lines 106–119 | Trigger collision: Updating `user_roles` to `ORG_ADMIN` causes `enforce_organization_role_assignment` to abort with error 42501. | **YES** |
| **F-30B-02** | HIGH | Lines 8–14 | Missing explicit `ACCESS EXCLUSIVE` table lock at transaction start creates a race condition for concurrent role assignments. | **YES** |
| **F-30B-03** | HIGH | Lines 60–122 | Premature data conversion hardcodes unapproved Decision P-01 (Option A) into tenant data. | **YES** |
| **F-30B-04** | MEDIUM | Lines 145–152 | Asymmetry: `user_roles` receives composite FK, but legacy mirror `organization_members.role_id` is left unprotected. | NO |
| **F-30B-05** | LOW | Lines 60–122 | Dynamic DO block lacks operational progress telemetry (`RAISE NOTICE`). | NO |
| **F-30B-06** | INFORMATIONAL | Lines 145–152 | Composite FK elegantly prevents system role assignment via `NOT NULL` matching. | NO |

---

## 5. Peer Review Verdict & Recommendation

### Status: **REVISION REQUIRED**

### Mandatory Action Items for Revision:
1. **Remediate Trigger Collision:** Add trigger bypass handling (`DISABLE TRIGGER` / `SET LOCAL session_replication_role = 'replica'`) around Section 3 updates, or update `enforce_organization_role_assignment()` to exempt migration execution.
2. **Add Explicit Table Locks:** Add `LOCK TABLE public.user_roles, public.organization_members IN ACCESS EXCLUSIVE MODE;` immediately following `BEGIN;`.
3. **Decouple Data Migration or Obtain PM Approval:** Either obtain documented Product Management approval for Decision P-01 Option A, or decouple Section 3 data migration from the Phase 3.0B DDL migration.
4. **Resubmit for Peer Review:** Once revised, resubmit Phase 3.0B for follow-up peer review.
