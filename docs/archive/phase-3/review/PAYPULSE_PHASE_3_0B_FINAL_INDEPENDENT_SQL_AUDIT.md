# PAYPULSE — PHASE 3.0B FINAL INDEPENDENT SQL REVIEW & EXECUTION READINESS AUDIT

**Target Migration:** `supabase/migrations/20261122100002_phase_3_0b_single_role_per_organization_user.sql`  
**System:** PayPulse (JK Payroll)  
**Architectural Roles:** Principal PostgreSQL Database Architect, Supabase Security Engineer, Database Migration Auditor, and Application Compatibility Specialist  
**Execution Mode:** STRICT READ-ONLY REPOSITORY AUDIT (Zero Database Execution / Zero Live Connections / Zero Data Writes)  
**Date of Audit:** November 22, 2026  
**Audit Document:** `docs/phase-3/review/PAYPULSE_PHASE_3_0B_FINAL_INDEPENDENT_SQL_AUDIT.md`  

---

## 1. Executive Summary

This report delivers the authoritative, independent architectural and database security audit of the remediated Phase 3.0B migration script: [20261122100002_phase_3_0b_single_role_per_organization_user.sql](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261122100002_phase_3_0b_single_role_per_organization_user.sql).

Phase 3.0B attempts to enforce structural multi-tenant RBAC guarantees at the PostgreSQL engine level:
1. Mutate `public.user_roles` primary key to `(organization_id, user_id)` to enforce a single role per user per tenant.
2. Establish composite foreign keys referencing `public.roles(organization_id, id)` on both `public.user_roles` and `public.organization_members`.
3. Eliminate redundant indexes, establish fail-closed precondition assertions, and provide a manually governed disaster-recovery rollback playbook.

The previous peer review (`PAYPULSE_PHASE_3_0B_MIGRATION_PEER_REVIEW.md`) returned **REVISION REQUIRED** due to a critical trigger collision (`F-30B-01`), concurrency gaps (`F-30B-02`), and premature governance coupling (`F-30B-03`). The remediation report (`PAYPULSE_PHASE_3_0B_REMEDIATION_REPORT.md`) and validation report (`PAYPULSE_PHASE_3_0B_VALIDATION_REPORT.md`) claimed full remediation and recommended advancing to staging execution review.

### Definitive Independent Audit Verdict: **REJECTED — NOT SAFE FOR STAGING REVIEW**
*(Alternative Governance Path: **CONDITIONALLY APPROVED — ADDITIONAL REMEDIATION REQUIRED** strictly upon resolution of Finding **F-30B-07**)*

### Primary Audit Findings:
1. **CRITICAL SYSTEMIC INCOMPATIBILITY (Finding F-30B-07 — Execution-Breaking):**  
   While Phase 3.0B correctly adds composite foreign keys `(organization_id, role_id) REFERENCES public.roles(organization_id, id)` that mathematically reject any role where `roles.organization_id IS NULL`, **it fails to update the active database tenant provisioning function `public.provision_organization_from_onboarding_invitation()`** ([20261121000018_superadmin_onboarding_invitations.sql#L141-L197](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261121000018_superadmin_onboarding_invitations.sql#L141-L197)). That function explicitly assigns the global `SYSTEM` `TENANT_ADMIN` role (`organization_id IS NULL`) to both `user_roles` and `organization_members`.  
   **Direct Operational Consequence:** The moment Phase 3.0B is applied, every subsequent organization onboarding redemption will crash with SQLSTATE `23503 foreign_key_violation`. Furthermore, any staging database with already-onboarded tenants will fail closed during migration execution at Precondition Section 4 and Section 6.
2. **HIGH CONCURRENCY & DEADLOCK VULNERABILITY (Finding F-30B-08):**  
   Phase 3.0B acquires exclusive table locks in the order `roles` $\rightarrow$ `user_roles` $\rightarrow$ `organization_members`. However, the active trigger `enforce_organization_role_assignment()` established in Phase 3.1b acquires a row-level lock on `user_roles` first, followed by `SELECT ... FROM public.roles ... FOR SHARE`. This inverse lock acquisition order creates a guaranteed deadlock condition with concurrent role assignment transactions. Mandatory application quiescence is required.
3. **TEST EVIDENCE MISREPRESENTATION (Finding F-30B-09):**  
   The reported test pass (`11/11 tests passed` in `tests/user-roles.test.ts`) tests only in-memory mock repositories, React UI components, and static text assertions on legacy seed files. It provides **zero** PostgreSQL database execution validation, zero foreign key constraint verification, and zero concurrency testing.

---

## 2. Scope and Operational Restrictions

In strict adherence to repository operating instructions and database safety mandates:
- **Zero Database Operations:** No connections were opened to Supabase, local PostgreSQL, or staging databases.
- **Zero Schema Mutations:** No SQL commands, `supabase db push`, `supabase migration up`, or DDL scripts were executed.
- **Zero Artifact Overwrites:** Existing peer review and remediation documents were preserved without modification.
- **Strict Read-Only Static Verification:** The audit analyzed source files, AST grammar, relational algebra proofs, information schema definitions, execution paths, lock semantics, and application call sites.
- **Explicit Classification:** Every check is classified as **VERIFIED**, **NOT VERIFIED** (if requiring live execution), or **FAILED**.

---

## 3. Source Files Inspected

The following repository source files were inspected in their entirety:

| Object Type | File Path | Scope of Inspection |
|---|---|---|
| **Target Migration** | `supabase/migrations/20261122100002_phase_3_0b_single_role_per_organization_user.sql` | Complete DDL, lock statements, preconditions, constraints, and rollback script. |
| **Peer Review** | `docs/phase-3/review/PAYPULSE_PHASE_3_0B_MIGRATION_PEER_REVIEW.md` | Baseline findings F-30B-01 through F-30B-06. |
| **Remediation Report** | `docs/phase-3/review/PAYPULSE_PHASE_3_0B_REMEDIATION_REPORT.md` | Claimed fixes, lock rationale, and proposal script. |
| **Validation Report** | `docs/phase-3/review/PAYPULSE_PHASE_3_0B_VALIDATION_REPORT.md` | Static claims and mathematical proofs. |
| **Baseline Core Schema** | `supabase/migrations/20261104000001_core_schema.sql` | Base definitions of `roles`, `user_roles`, and `organizations`. |
| **Baseline Audit & Members** | `supabase/migrations/20261104000003_audit_logs.sql` | Base definition of `organization_members`. |
| **Default Roles Seed** | `supabase/migrations/20261104000005_seed_default_user_roles.sql` | System role seed definitions (`f0000000-0000-0000-0000-000000000002`). |
| **Security Corrections 1.1** | `supabase/migrations/20261121000013_security_correction_phase1_1.sql` | RLS policies and `is_organization_admin()` definition. |
| **Security Corrections 1.1.1**| `supabase/migrations/20261121000014_security_corrections_phase1_1_1.sql` | Transitional `is_organization_admin()` checks for SYSTEM roles. |
| **Onboarding Provisioning** | `supabase/migrations/20261121000018_superadmin_onboarding_invitations.sql` | Implementation of `provision_organization_from_onboarding_invitation()`. |
| **Member Invitations** | `supabase/migrations/20261121000019_authorized_member_invitations.sql` | `is_active_org_admin_for_user()` and invitation redemption. |
| **Phase 3.1b Role Triggers** | `supabase/migrations/20261121153500_phase_3_1b_database_role_authorization_boundary.sql` | Triggers, `enforce_organization_role_assignment()`, and role code guards. |
| **Phase 3.0A Prerequisites** | `supabase/migrations/20261122100001_phase_3_0a_organization_permission_entitlements.sql` | `organization_permissions` table prerequisite. |
| **Application Layer** | `src/features/organizations/organization.service.ts` | Backend tenant onboarding and membership provisioning. |
| **Application Layer** | `src/features/roles/role.service.ts` & `user-role.controller.ts` | Role assignment and update workflows. |
| **Application Repository** | `src/server/db/repository.ts` | In-memory data repository and membership assertions. |
| **Test Suite** | `tests/user-roles.test.ts` | Vitest unit test coverage for user roles. |

---

## 4. Original Findings Resolution Verification

The table below audits the status of findings F-30B-01 through F-30B-06 identified in the initial peer review:

| Original Finding ID | Initial Peer Review Description | Remediation Implemented in Phase 3.0B | Independent Audit Evaluation | Resolution Status |
|---|---|---|---|---|
| **F-30B-01** | Trigger Collision on protected role code `ORG_ADMIN` via `enforce_organization_role_assignment()`. | Section 3 removed completely. Phase 3.0B contains zero DML updates. | Verified. DDL (`ALTER TABLE`) does not fire row-level DML triggers. Trigger collision eliminated. | **RESOLVED** |
| **F-30B-02** | Concurrency race condition from missing table locks at `BEGIN`. | Added `SET LOCAL lock_timeout = '10s';` and `LOCK TABLE roles, user_roles, organization_members IN ACCESS EXCLUSIVE MODE;`. | Verified that table locks are acquired upfront. However, lock ordering introduces a secondary deadlock risk (see F-30B-08). | **PARTIALLY RESOLVED** |
| **F-30B-03** | Premature coupling with unapproved Decision P-01 (Option A). | Section 3 data migration removed. Replaced with fail-closed Precondition Sections 4 & 6 checking for SYSTEM roles. | Verified: No synthetic roles or permissions created. However, fail-closed check blocks staging (see F-30B-07). | **RESOLVED AT DDL LEVEL** *(Blocked by System State)* |
| **F-30B-04** | Role scoping mirror asymmetry in `organization_members.role_id`. | Section 9 applies matching composite FK `fk_organization_members_org_role` on `organization_members(organization_id, role_id)`. | Verified: Composite FK applies symmetrically with `MATCH SIMPLE` handling nullability. | **RESOLVED** |
| **F-30B-05** | Anonymous DO blocks lacked execution telemetry. | Added `RAISE NOTICE` checkpoints to each preflight assertion and DDL section. | Verified: Operational notices present throughout. | **RESOLVED** |
| **F-30B-06** | Composite FK blocks SYSTEM roles via `NOT NULL` matching. | Confirmed architectural pattern. | Verified mathematically. | **CONFIRMED** |

---

## 5. PostgreSQL Schema and Constraint Audit

### 5.1 Primary Key Mutation on `public.user_roles`
- **Location:** Lines 274–279 of [20261122100002_phase_3_0b_single_role_per_organization_user.sql](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261122100002_phase_3_0b_single_role_per_organization_user.sql#L274-L279).
- **Existing Constraint:** `PRIMARY KEY (organization_id, user_id, role_id)` ([20261104000001_core_schema.sql#L238](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261104000001_core_schema.sql#L238)).
- **New Constraint:** `PRIMARY KEY (organization_id, user_id)`.
- **Relational Proof:**  
  Let relation $UR$ denote `user_roles`. Under $\text{PK}(UR) = (\text{organization\_id}, \text{user\_id})$, the functional dependency $(\text{organization\_id}, \text{user\_id}) \rightarrow \text{role\_id}$ holds. For any distinct pair $(o, u)$, at most one tuple can exist.  
- **Audit Assessment:** **VERIFIED**. Enforces single-role assignment per user per tenant at the storage engine level.

### 5.2 Candidate Unique Key on `public.roles`
- **Location:** Lines 252–257 of [20261122100002_phase_3_0b_single_role_per_organization_user.sql](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261122100002_phase_3_0b_single_role_per_organization_user.sql#L252-L257).
- **Statement:** `ALTER TABLE public.roles ADD CONSTRAINT uq_roles_org_id UNIQUE NULLS NOT DISTINCT (organization_id, id);`
- **PostgreSQL 15+ Compatibility:** `UNIQUE NULLS NOT DISTINCT` was introduced in PostgreSQL 15. Because Supabase operates on PostgreSQL 15+, syntax is fully valid.
- **Relational Proof:**  
  Because `roles.id` is already the primary key of `public.roles`, each `id` is globally unique. Adding `organization_id` to form `(organization_id, id)` is guaranteed unique. PostgreSQL requires an explicit `UNIQUE` or `PRIMARY KEY` constraint on the exact referenced composite target to support a composite foreign key.  
- **Audit Assessment:** **VERIFIED**. Candidate key correctly enables composite foreign key referencing.

### 5.3 Composite Foreign Key on `public.user_roles`
- **Location:** Lines 283–287 of [20261122100002_phase_3_0b_single_role_per_organization_user.sql](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261122100002_phase_3_0b_single_role_per_organization_user.sql#L283-L287).
- **Statement:**  
  ```sql
  ALTER TABLE public.user_roles 
      ADD CONSTRAINT fk_user_roles_org_role 
      FOREIGN KEY (organization_id, role_id) 
      REFERENCES public.roles(organization_id, id) 
      ON DELETE RESTRICT;
  ```
- **Referential Action:** Changed from baseline `ON DELETE CASCADE` to `ON DELETE RESTRICT`.
- **System Role Exclusion Proof:**  
  In `public.roles`, global system roles have `organization_id IS NULL`. In `public.user_roles`, `organization_id` is defined `UUID NOT NULL`. Under composite FK validation, matching $(o_{\text{tenant}}, r_{\text{sys}})$ against $(\text{NULL}, r_{\text{sys}})$ fails relational equality ($o_{\text{tenant}} \ne \text{NULL}$).  
- **Audit Assessment:** **VERIFIED**. Mathematically prevents cross-organization roles and global system roles from being assigned in `user_roles`.

### 5.4 Composite Foreign Key on `public.organization_members`
- **Location:** Lines 310–314 of [20261122100002_phase_3_0b_single_role_per_organization_user.sql](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261122100002_phase_3_0b_single_role_per_organization_user.sql#L310-L314).
- **Nullable Role Semantics (`MATCH SIMPLE`):**  
  In `public.organization_members`, `role_id` is nullable. Under PostgreSQL default `MATCH SIMPLE`, if `role_id` is `NULL`, the constraint is satisfied without evaluating `roles`. When `role_id` is NOT NULL, $(o_{\text{tenant}}, \text{role\_id})$ must match `public.roles(organization_id, id)`.  
- **Audit Assessment:** **VERIFIED**. Nullable role memberships remain valid; non-null assignments strictly enforce organization scoping.

---

## 6. Trigger Compatibility Audit

### 6.1 DDL vs. DML Trigger Interaction
- **Triggers Inspected:**
  - `trg_phase31b_user_role_assignment` on `public.user_roles`
  - `trg_phase31b_organization_member_role_assignment` on `public.organization_members`
  - `trg_phase31b_role_identity_scope` on `public.roles`
- **Evaluation:**  
  In PostgreSQL, row-level `BEFORE INSERT OR UPDATE` triggers execute only during DML operations (`INSERT`, `UPDATE`). Declarative DDL statements (`ALTER TABLE ... ADD CONSTRAINT`) validate existing table data directly through storage engine indexes without firing row triggers.
- **Audit Assessment:** **VERIFIED**. Finding `F-30B-01` does not recur during Phase 3.0B execution.

### 6.2 Precondition Assertions vs. Existing System State
- **Precondition Assertions:**
  - Section 2: Zero multi-role users in `user_roles` (Lines 97–120).
  - Section 3: Zero cross-organization roles in `user_roles` (Lines 126–150).
  - Section 4: Zero `SYSTEM` roles in `user_roles` (Lines 160–183).
  - Section 5: Zero cross-organization roles in `organization_members` (Lines 189–213).
  - Section 6: Zero `SYSTEM` roles in `organization_members` (Lines 220–244).
- **Execution Reality on Staging / Production:**  
  Under baseline migrations 5, 14, 18, and 21, the standard tenant onboarding workflow **explicitly assigns the global SYSTEM `TENANT_ADMIN` role** (`f0000000-0000-0000-0000-000000000002`) to both `user_roles` and `organization_members`.  
  **Audit Assessment:** **FAILED**. Sections 4 and 6 will unconditionally trip and raise error `23514` on any database containing onboarded organizations.

---

## 7. Concurrency and Locking Audit

### 7.1 Table Lock Order vs. Runtime Trigger Lock Order (Finding F-30B-08)
- **Phase 3.0B Lock Sequence (Lines 31–33):**
  1. `LOCK TABLE public.roles IN ACCESS EXCLUSIVE MODE;`
  2. `LOCK TABLE public.user_roles IN ACCESS EXCLUSIVE MODE;`
  3. `LOCK TABLE public.organization_members IN ACCESS EXCLUSIVE MODE;`
- **Runtime Trigger Sequence (`enforce_organization_role_assignment()`):**
  When an application transaction assigns a role:
  1. PostgreSQL acquires `ROW EXCLUSIVE` on `public.user_roles`.
  2. Line 139 of [20261121153500_phase_3_1b...sql](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261121153500_phase_3_1b_database_role_authorization_boundary.sql#L139) executes: `SELECT r.* INTO v_role FROM public.roles r WHERE r.id = NEW.role_id FOR SHARE;` (acquiring `FOR SHARE` on `public.roles`).
- **Deadlock Condition Analysis:**  
  - If transaction $T_1$ (Application) inserts into `user_roles`, it holds a row lock on `user_roles` and waits for `FOR SHARE` on `roles`.
  - If transaction $T_2$ (Migration 3.0B) starts, it acquires `ACCESS EXCLUSIVE` on `roles` and requests `ACCESS EXCLUSIVE` on `user_roles`.
  - **Result:** $T_1$ waits for $T_2$; $T_2$ waits for $T_1$. A PostgreSQL deadlock cycle (`40P01`) occurs immediately.
- **Audit Assessment:** **FAILED (MEDIUM CONCURRENCY RISK)**. While `lock_timeout = '10s'` limits the stall to 10 seconds, the inverse lock ordering guarantees aborts if concurrent assignments occur during migration start. **Application quiescence is mandatory.**

---

## 8. Index Redundancy and Performance Audit

### 8.1 Index Redundancy Evaluation
A detailed audit of baseline indexes confirms the following optimization actions:

1. **`idx_user_roles_org_user` on `(organization_id, user_id)`:**  
   - Baseline: Created in [20261104000001_core_schema.sql#L241](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261104000001_core_schema.sql#L241).  
   - Redundancy: Fully superseded by `user_roles_pkey PRIMARY KEY (organization_id, user_id)`.  
   - Audit Assessment: **VERIFIED**. Correctly dropped in Section 8.
2. **`idx_org_members_org` on `(organization_id)`:**  
   - Baseline: Created in [20261104000003_audit_logs.sql#L31](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261104000003_audit_logs.sql#L31).  
   - Redundancy Analysis: `public.organization_members` possesses `uq_organization_members_org_user (organization_id, user_id)` and Section 10 creates `idx_org_members_org_role (organization_id, role_id)`. Both composite B-tree indexes use `organization_id` as their leading column. Queries filtered solely by `organization_id` utilize prefix index scans on either composite index.  
   - Audit Assessment: **VERIFIED**. Pruning reduces write amplification without degrading query performance.
3. **`idx_user_roles_role` on `(role_id)`:**  
   - Baseline: Created in [20261104000001_core_schema.sql#L242](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261104000001_core_schema.sql#L242).  
   - Analysis: Required for queries inspecting role deletion or role references across organizations where `organization_id` is unknown.  
   - Audit Assessment: **VERIFIED**. Correctly retained.

### 8.2 Drop-and-Create Pattern vs. `IF NOT EXISTS` Masking
- Lines 328–344 employ `DROP INDEX IF EXISTS ...; CREATE INDEX ...`.
- In PostgreSQL, `CREATE INDEX IF NOT EXISTS` checks only object existence in `pg_class`, ignoring drifted column definitions, expressions, or sort orders.
- Because `ACCESS EXCLUSIVE` table locks are already held, dropping and recreating indexes in the same transaction guarantees definition fidelity without additional lock acquisition overhead.
- **Audit Assessment:** **VERIFIED**.

---

## 9. Application Backward Compatibility Audit

### 9.1 CRITICAL DEFECT: Onboarding Function Incompatibility (Finding F-30B-07)
A thorough scan of all database functions and application controllers revealed a critical break in the tenant onboarding architecture:

1. **Active Provisioning Function:**  
   [20261121000018_superadmin_onboarding_invitations.sql#L141-L197](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261121000018_superadmin_onboarding_invitations.sql#L141-L197) implements `public.provision_organization_from_onboarding_invitation()`:
   ```sql
   SELECT r.id INTO v_tenant_role_id
   FROM public.roles r
   WHERE r.code = 'TENANT_ADMIN' AND r.role_type = 'SYSTEM'
     AND r.organization_id IS NULL AND r.is_active = true
   LIMIT 1;

   INSERT INTO public.organization_members (
       organization_id, user_id, role_id, department_id, is_owner, is_active
   ) VALUES (v_org_id, p_user_id, v_tenant_role_id, v_dept_id, true, true);

   INSERT INTO public.user_roles (organization_id, user_id, role_id, assigned_by)
   VALUES (v_org_id, p_user_id, v_tenant_role_id, v_inv.created_by);
   ```
2. **The Conflict with Phase 3.0B:**  
   - Phase 3.0B applies `fk_user_roles_org_role` and `fk_organization_members_org_role`, requiring `(organization_id, role_id) REFERENCES public.roles(organization_id, id)`.
   - `v_tenant_role_id` is a SYSTEM role where `roles.organization_id IS NULL`.
   - When `provision_organization_from_onboarding_invitation()` executes, PostgreSQL attempts to match `(v_org_id, v_tenant_role_id)` against `public.roles`.
   - Because `v_org_id <> NULL`, the foreign key check **fails immediately with SQLSTATE `23503 foreign_key_violation`**.
3. **Application Call Site Impact:**  
   In [src/features/organizations/organization.service.ts#L161](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/src/features/organizations/organization.service.ts#L161):
   `await adminClient.rpc('provision_organization_from_onboarding_invitation', ...)`
   Every tenant onboarding invitation redeemed via the application UI will crash with `23503`.
4. **Audit Assessment:** **FAILED (CRITICAL)**. Phase 3.0B cannot be executed until `provision_organization_from_onboarding_invitation()` is refactored.

### 9.2 Conflict Targets & Application Upserts
- **Application Logic:** The application Express service layer ([src/features/roles/role.service.ts](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/src/features/roles/role.service.ts)) treats role assignment as single-assignment per user.
- **Upsert Compatibility:** Modifying the primary key to `(organization_id, user_id)` allows future application queries to utilize `ON CONFLICT (organization_id, user_id) DO UPDATE SET role_id = EXCLUDED.role_id`.
- **Audit Assessment:** **VERIFIED**.

---

## 10. Disaster-Recovery and Rollback Audit

### 10.1 Rollback Script Structure & Dependency Ordering
The commented disaster-recovery playbook ([20261122100002_phase_3_0b...sql#L353-L448](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261122100002_phase_3_0b_single_role_per_organization_user.sql#L353-L448)) was evaluated:
1. **Locking & Preconditions:** Acquires `ACCESS EXCLUSIVE` under `lock_timeout = '10s'`. Executes three fail-closed checks verifying zero duplicate 3-column tuples and zero orphaned role references.
2. **Referential Dependency Sequence:** Drops referencing composite FKs (`fk_organization_members_org_role` and `fk_user_roles_org_role`) before dropping candidate key `uq_roles_org_id`.
3. **Exact Baseline Restoration:**
   - Restores `organization_members_role_id_fkey` with `ON DELETE SET NULL` ([20261104000003_audit_logs.sql#L21](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261104000003_audit_logs.sql#L21)).
   - Restores `user_roles_pkey PRIMARY KEY (organization_id, user_id, role_id)` ([20261104000001_core_schema.sql#L238](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261104000001_core_schema.sql#L238)).
   - Restores `user_roles_role_id_fkey` with `ON DELETE CASCADE` ([20261104000001_core_schema.sql#L235](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261104000001_core_schema.sql#L235)).
   - Recreates baseline indexes `idx_org_members_org` and `idx_user_roles_org_user`.
4. **Audit Assessment:** **VERIFIED**. Correctly structured as a manually governed disaster-recovery playbook.

---

## 11. Governance and Decision P-01 Compliance

- **Decision P-01 Status:** PENDING formal Product Management signoff.
- **Compliance Check:**
  - Zero custom `ORG_ADMIN` roles are synthesized in Phase 3.0B.
  - Zero administrative permissions are copied or manufactured.
  - Existing `is_owner` semantics in `organization_members` remain untouched.
- **Audit Assessment:** **VERIFIED**. Phase 3.0B strictly limits its scope to structural database enforcement and does not pre-empt Product Management approval.

---

## 12. Automated Test Evidence Assessment

### 12.1 Audit of Reported Vitest Result
The remediation report cited `npx vitest run tests/user-roles.test.ts (11/11 tests passed)` as verification evidence.

An independent inspection of [tests/user-roles.test.ts](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/tests/user-roles.test.ts) reveals the following actual test coverage:
1. **Lines 32–60:** Static text inspection of `supabase/seed.sql` using Node.js `fs.readFileSync`.
2. **Lines 62–83:** Zod schema validation (`createOrganizationSchema.parse`).
3. **Lines 85–228:** In-memory TypeScript mock testing (`db.assignUserRole`, `db.userRoles.set`) in `src/server/db/repository.ts`.
4. **Lines 230–261:** Static text inspection of `20261104000001_core_schema.sql`.
5. **Lines 263–284:** React component export validation.

### 12.2 Test Classification Matrix

| Verification Dimension | Actual Test Coverage in Repository | Status in Audit |
|---|---|---|
| **Repository Static Verification** | Verified via AST and file inspection. | **VERIFIED** |
| **SQL Parser Verification** | Verified against PostgreSQL 15+ grammar. | **VERIFIED** |
| **Application Unit Tests** | Verified via Vitest (`11/11 passed` on in-memory mocks). | **VERIFIED** |
| **Database Constraint Tests** | **ZERO live PostgreSQL constraint tests exist.** | **NOT VERIFIED** |
| **PostgreSQL Concurrency Tests** | **ZERO live locking/deadlock tests exist.** | **NOT VERIFIED** |
| **Supabase Execution Privilege Tests** | **ZERO live privilege tests executed.** | **NOT VERIFIED** |

> [!WARNING]
> Application unit tests passing against in-memory JavaScript mocks (`DatabaseRepository`) must NEVER be represented as successful database migration execution. The real PostgreSQL constraint behavior and the RPC conflict with `provision_organization_from_onboarding_invitation` were completely masked by the mock repository.

---

## 13. Master Findings Register

| Finding ID | Severity | File Reference | Exact SQL / Code Location | Technical Root Cause | Operational Impact | Recommended Action | Blocks Staging? |
|---|---|---|---|---|---|---|---|
| **F-30B-07** | **CRITICAL** | `20261121000018_...sql` & `20261122100002_...sql` | Lines 141–197 of Migration 18; Lines 283 & 310 of Migration Phase 3.0B | `provision_organization_from_onboarding_invitation` inserts SYSTEM `TENANT_ADMIN` role (`org_id IS NULL`), violating new composite FKs. Preconditions 4 & 6 also fail closed on existing data. | Every tenant onboarding redemption crashes with `23503 foreign_key_violation`. Migration aborts on any database with onboarded tenants. | Refactor `provision_organization_from_onboarding_invitation` to create/assign custom org role or leave role unassigned. Bundle fix before Phase 3.0B. | **YES** |
| **F-30B-08** | **MEDIUM** | `20261122100002_...sql` & `20261121153500_...sql` | Lines 31–33 of Phase 3.0B; Lines 136–139 of Phase 3.1b | Migration locks `roles` $\rightarrow$ `user_roles`. Runtime trigger locks `user_roles` $\rightarrow$ `roles` (`FOR SHARE`). Inverse lock order causes deadlock. | Concurrent role assignment during migration execution deadlocks and aborts with `40P01`. | Mandate application quiescence during migration; align lock acquisition sequence. | NO (Mitigated by quiescence) |
| **F-30B-09** | **INFORMATIONAL** | `tests/user-roles.test.ts` | Complete File | Unit tests cover in-memory mock repository only; no real database constraint validation. | False sense of execution readiness. | Maintain explicit distinction between static unit tests and database integration tests. | NO |
| **F-30B-10** | **LOW** | `20261122100002_...sql` | Lines 287 & 314 | `ON DELETE RESTRICT` on composite FKs replaces baseline `CASCADE`/`SET NULL`. | Deleting an organization cascading to `roles` before `user_roles` could trigger immediate `RESTRICT` error in PostgreSQL. | Verify cascade ordering or utilize `ON DELETE NO ACTION`. | NO |

---

## 14. Remaining Operational Risks

1. **Staging Execution Failure Risk:**  
   If Phase 3.0B is executed on a staging database populated by seed migrations or onboarding tests, Precondition Section 4 and Section 6 will detect `TENANT_ADMIN` assignments and abort execution with SQLSTATE `23514`.
2. **Onboarding Blackout Risk:**  
   If Phase 3.0B is forced onto staging without updating Migration 18, all subsequent invitation redemptions will fail with `23503`.
3. **Application Upsert Timing Risk:**  
   Services must not deploy single-role upserts (`ON CONFLICT (organization_id, user_id)`) until the database migration transaction commits successfully.

---

## 15. Final Architectural Recommendation & Verdict

### Final Verdict: **REJECTED — NOT SAFE FOR STAGING REVIEW**
*(Alternative Governance Status: **CONDITIONALLY APPROVED — ADDITIONAL REMEDIATION REQUIRED**)*

### Verdict Rationale:
Phase 3.0B is architecturally and mathematically sound in its core schema definitions (`PRIMARY KEY (organization_id, user_id)` and composite FK scoping). However, **it cannot be advanced to staging execution review in isolation** because it directly breaks the active tenant onboarding RPC `public.provision_organization_from_onboarding_invitation()`, and its fail-closed preconditions will abort against any staging instance that has onboarded tenants.

### Mandatory Pre-Requisites Before Advancing:
1. **Remediate Onboarding Provisioning Function (Resolves F-30B-07):**  
   Update `public.provision_organization_from_onboarding_invitation()` so that it no longer assigns the global SYSTEM `TENANT_ADMIN` role into `user_roles` or `organization_members`.
2. **Formalize Decision P-01 Signoff:**  
   Obtain Product Management approval for the Organization Administrator model so that legacy `TENANT_ADMIN` assignments can be formally reconciled into approved custom manager roles.
3. **Schedule Maintenance Quiescence Window:**  
   Enforce total application quiescence during staging execution to eliminate inverse lock ordering deadlocks with Phase 3.1b triggers.
