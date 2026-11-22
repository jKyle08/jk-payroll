# PAYPULSE — PHASE 3.0 MIGRATION SECURITY FINDINGS REGISTER
## Independent Technical Audit & Classified Findings Log

**System:** PayPulse (JK Payroll)  
**Migrations Audited:**
1. `supabase/migrations/20261122100001_phase_3_0a_organization_permission_entitlements.sql`
2. `supabase/migrations/20261122100002_phase_3_0b_single_role_per_organization_user.sql`  
**Stack:** React 19, Express 4, Supabase Auth, PostgreSQL 17+  
**Review Date:** November 22, 2026  
**Execution Mode:** STRICT READ-ONLY REPOSITORY REVIEW (No DB writes or execution authorized)

---

## 1. Classification Methodology

Findings are categorized in accordance with standard application and database security review severity thresholds:

- **CRITICAL:** High-impact defect that causes execution failure, data corruption, or catastrophic security bypass. Must be resolved before any execution review.
- **HIGH:** Significant security exposure, tenant boundary hazard, race condition, or governance violation.
- **MEDIUM:** Correctness, operational robustness, schema consistency, or maintainability concern.
- **LOW:** Improvement, documentation discrepancy, or telemetry enhancement.
- **INFORMATIONAL:** Confirmed architectural strength, conformance observation, or positive security control.

---

## 2. Master Findings Summary Table

| Finding ID | Severity | Migration | Location | Title | Blocks Execution? |
|---|---|---|---|---|---|
| **F-30B-01** | **CRITICAL** | `20261122100002_phase_3_0b` | Lines 106–119 | Trigger Collision on Protected Role Code `ORG_ADMIN` | **YES** |
| **F-30B-02** | **HIGH** | `20261122100002_phase_3_0b` | Lines 8–14 | Concurrency Race Hazard from Missing Table Lock | **YES** |
| **F-30B-03** | **HIGH** | `20261122100002_phase_3_0b` | Lines 60–122 | Premature Coupling with Unapproved Governance Decision P-01 | **YES** |
| **F-30A-01** | **MEDIUM** | `20261122100001_phase_3_0a` | Lines 39–60 | Procedural Trigger Validation vs. Declarative Composite Foreign Key | NO |
| **F-30B-04** | **MEDIUM** | `20261122100002_phase_3_0b` | Lines 145–152 | Role Scope Mirror Asymmetry in `organization_members.role_id` | NO |
| **F-30A-02** | **MEDIUM** | `20261122100001_phase_3_0a` | Lines 14–15, 110–119 | Presumption of Active Status in Module Backfill | NO |
| **F-30A-03** | **LOW** | `20261122100001_phase_3_0a` | Lines 39–54 | Trigger Function Omits Explicit `SECURITY DEFINER` | NO |
| **F-30B-05** | **LOW** | `20261122100002_phase_3_0b` | Lines 60–122 | Anonymous DO Block Lacks Migration Telemetry Logs | NO |
| **F-30A-04** | **INFORMATIONAL**| `20261122100001_phase_3_0a` | Lines 110–119 | Preservation of PascalCase Canonical Action Keys | NO |
| **F-30B-06** | **INFORMATIONAL**| `20261122100002_phase_3_0b` | Lines 145–152 | System Role Assignment Blocked via Composite Foreign Key | NO |

---

## 3. Detailed Finding Records

### Finding F-30B-01: Trigger Collision on Protected Role Code `ORG_ADMIN`

- **Severity:** **CRITICAL**
- **Migration Filename:** `supabase/migrations/20261122100002_phase_3_0b_single_role_per_organization_user.sql`
- **Line Reference:** Lines 106–119 (Section 3: DATA RECONCILIATION)
- **Description:**
  Section 3 of migration 3.0B identifies organizations where users hold `SYSTEM` roles, creates a custom role with `code = 'ORG_ADMIN'`, and updates `public.user_roles` and `public.organization_members` setting `role_id = v_custom_role_id`.
  However, migration `20261121153500_phase_3_1b_database_role_authorization_boundary.sql` attached active `BEFORE UPDATE` triggers `trg_phase31b_user_role_assignment` and `trg_phase31b_organization_member_role_assignment` that invoke `public.enforce_organization_role_assignment()`.
  In that function:
  ```sql
  v_code := public.normalize_organization_role_code(v_role.code);
  IF v_code IN ('SUPERADMIN', 'PLATFORMSUPERADMIN', 'TENANTADMIN', 'ORGANIZATIONADMIN', 'ORGADMIN', 'ADMIN') THEN
      RAISE EXCEPTION 'Protected role codes cannot be assigned through organization role management'
          USING ERRCODE = '42501';
  END IF;
  ```
  Because `normalize_organization_role_code('ORG_ADMIN')` evaluates to `'ORGADMIN'`, the trigger intercepts the update and raises an unhandled exception `42501`.
- **Impact:**
  The migration transaction **crashes and fails unconditionally** on any database environment where any user currently possesses a `SYSTEM` role.
- **Reproduction / Reasoning:**
  1. A database exists with `20261121153500_phase_3_1b` applied.
  2. `user_roles` contains a user with a `SYSTEM` role (e.g. initial seeded `TENANT_ADMIN`).
  3. Migration 3.0B executes Section 3 line 106 (`UPDATE public.user_roles ur SET role_id = v_custom_role_id ...`).
  4. Trigger `trg_phase31b_user_role_assignment` fires.
  5. The role assigned has `code = 'ORG_ADMIN'`, normalized to `'ORGADMIN'`.
  6. The trigger checks `v_code IN ('ORGADMIN', ...)` and raises `42501`.
  7. The entire migration aborts and rolls back.
- **Recommended Correction:**
  Within Section 3 of `20261122100002_phase_3_0b`, disable the assignment triggers during the data conversion or execute under replica session mode:
  ```sql
  -- Prior to Section 3 UPDATE:
  ALTER TABLE public.user_roles DISABLE TRIGGER trg_phase31b_user_role_assignment;
  ALTER TABLE public.organization_members DISABLE TRIGGER trg_phase31b_organization_member_role_assignment;

  -- Execute data migration updates...

  -- Immediately following Section 3 UPDATE:
  ALTER TABLE public.user_roles ENABLE TRIGGER trg_phase31b_user_role_assignment;
  ALTER TABLE public.organization_members ENABLE TRIGGER trg_phase31b_organization_member_role_assignment;
  ```
  Alternatively, update `enforce_organization_role_assignment()` to exempt operations when `current_setting('session_replication_role', true) = 'replica'`.
- **Blocks Execution:** **YES**

---

### Finding F-30B-02: Concurrency Race Hazard from Missing Table Lock

- **Severity:** **HIGH**
- **Migration Filename:** `supabase/migrations/20261122100002_phase_3_0b_single_role_per_organization_user.sql`
- **Line Reference:** Lines 8–14
- **Description:**
  The migration begins with `BEGIN;` and executes preflight checks in anonymous `DO $$ ... $$` blocks.
  Under PostgreSQL default transaction isolation (`READ COMMITTED`), reading `user_roles` does not prevent concurrent transactions from inserting new rows.
  A concurrent HTTP request (such as an admin accepting an invitation or assigning a role) could insert a second role for a user immediately after Section 1 finishes checking.
- **Impact:**
  The precondition assertion passes, but Section 5 (`ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (organization_id, user_id)`) crashes with an unexpected `unique_violation (23505)` error, rolling back the migration.
- **Reproduction / Reasoning:**
  Session A starts 3.0B, finishes Section 1 (count = 0).
  Session B executes `INSERT INTO user_roles ...` for an existing user and commits.
  Session A reaches Section 5 and attempts to build the unique index for the primary key.
  PostgreSQL throws `ERROR: could not create unique index "user_roles_pkey" Key (organization_id, user_id)=(...) is duplicated`.
- **Recommended Correction:**
  Acquire an explicit table lock on all mutated tables immediately following `BEGIN;`:
  ```sql
  BEGIN;

  -- Acquire exclusive table locks before executing preconditions
  LOCK TABLE public.user_roles IN ACCESS EXCLUSIVE MODE;
  LOCK TABLE public.organization_members IN ACCESS EXCLUSIVE MODE;
  LOCK TABLE public.roles IN SHARE ROW EXCLUSIVE MODE;
  ```
- **Blocks Execution:** **YES**

---

### Finding F-30B-03: Premature Coupling with Unapproved Governance Decision P-01

- **Severity:** **HIGH**
- **Migration Filename:** `supabase/migrations/20261122100002_phase_3_0b_single_role_per_organization_user.sql`
- **Line Reference:** Lines 60–122 (Section 3: DATA RECONCILIATION)
- **Description:**
  Section 3 embeds an irreversible data conversion that assumes **Option A** (Organization-owned `CUSTOM ORG_ADMIN` role).
  In Phase 2.2 and Phase 3.0 architecture documentation, Option A is explicitly marked as a recommendation requiring formal Product Management signoff.
- **Impact:**
  If the migration is executed and Product Management subsequently selects Option B (`is_owner` attribute authority) or Option C (Dual-Mode), the database will contain newly synthesized custom roles and altered assignments that diverge from the approved product governance.
- **Reproduction / Reasoning:**
  Governance documents `PAYPULSE_PHASE_2_2_ADMINISTRATOR_AUTHORITY_CLOSURE.md` and `PAYPULSE_PHASE_3_0_DECISION_AND_BLOCKER_REGISTER.md` indicate Decision P-01 is `PENDING PRODUCT MANAGEMENT APPROVAL`. Executing Section 3 preempts that governance approval.
- **Recommended Correction:**
  Decouple Section 3 into a separate operational data migration script (`20261122100003_data_reconcile_system_roles.sql`) to be executed only after formal signoff on Decision P-01. Phase 3.0B should focus strictly on schema constraints (single-role PK and composite FK).
- **Blocks Execution:** **YES**

---

### Finding F-30A-01: Procedural Trigger Validation vs. Declarative Composite Foreign Key

- **Severity:** **MEDIUM**
- **Migration Filename:** `supabase/migrations/20261122100001_phase_3_0a_organization_permission_entitlements.sql`
- **Line Reference:** Lines 39–60 (Section 3)
- **Description:**
  The migration ensures that an organization permission references a module action that truly belongs to the specified module via trigger `trg_validate_org_permission_module`.
  While functional, triggers do not protect against subsequent updates to `public.module_actions.module_id`. Furthermore, row-by-row PL/pgSQL triggers incur performance overhead during bulk imports.
- **Impact:**
  Catalog modifications on `module_actions` are not constrained by the trigger.
- **Reproduction / Reasoning:**
  If an operator runs `UPDATE public.module_actions SET module_id = <new_id> WHERE id = <action_id>;`, `organization_permissions` will retain the old `module_id`, creating an inconsistency that the trigger cannot catch.
- **Recommended Correction:**
  In a future maintenance phase, add a unique constraint on `public.module_actions (id, module_id)` and replace the trigger with a declarative composite foreign key:
  ```sql
  ALTER TABLE public.module_actions ADD CONSTRAINT uq_module_actions_id_module UNIQUE (id, module_id);
  ALTER TABLE public.organization_permissions 
      ADD CONSTRAINT fk_org_permissions_action_module 
      FOREIGN KEY (module_action_id, module_id) 
      REFERENCES public.module_actions(id, module_id) 
      ON DELETE CASCADE ON UPDATE CASCADE;
  ```
- **Blocks Execution:** NO

---

### Finding F-30B-04: Role Scope Mirror Asymmetry in `organization_members.role_id`

- **Severity:** **MEDIUM**
- **Migration Filename:** `supabase/migrations/20261122100002_phase_3_0b_single_role_per_organization_user.sql`
- **Line Reference:** Lines 145–152
- **Description:**
  Phase 3.0B establishes a composite foreign key on `public.user_roles (organization_id, role_id) REFERENCES public.roles (organization_id, id)`.
  However, `public.organization_members.role_id` is left as a single-column foreign key `REFERENCES public.roles(id)`.
- **Impact:**
  An administrative query or legacy code path could update `organization_members.role_id` with a role belonging to another organization, causing desynchronization with `user_roles`.
- **Reproduction / Reasoning:**
  `user_roles` enforces org-scoping at the database level; `organization_members` only enforces it procedurally through application middleware and triggers.
- **Recommended Correction:**
  Apply the matching composite foreign key to `public.organization_members`:
  ```sql
  ALTER TABLE public.organization_members
      DROP CONSTRAINT IF EXISTS fk_organization_members_role,
      ADD CONSTRAINT fk_organization_members_role 
      FOREIGN KEY (organization_id, role_id) 
      REFERENCES public.roles(organization_id, id) 
      ON DELETE RESTRICT;
  ```
- **Blocks Execution:** NO

---

### Finding F-30A-02: Presumption of Active Status in Module Backfill

- **Severity:** **MEDIUM**
- **Migration Filename:** `supabase/migrations/20261122100001_phase_3_0a_organization_permission_entitlements.sql`
- **Line Reference:** Lines 14–15, 110–119
- **Description:**
  Section 1 adds `is_active BOOLEAN NOT NULL DEFAULT true` to `public.organization_modules`.
  Section 6 then immediately selects all rows where `om.is_active = true` and backfills entitlements.
  Because the column default was `true`, all pre-existing rows are treated as active.
- **Impact:**
  If any organization had legacy module allocations that were intended to be disabled or inactive, all permissions under those modules will be entitled upon migration.
- **Reproduction / Reasoning:**
  PostgreSQL applies the `DEFAULT` value to existing rows when adding a `NOT NULL` column.
- **Recommended Correction:**
  Staging preflight verification query must inspect `public.organization_modules` prior to migration to verify that all existing records are active and licensed.
- **Blocks Execution:** NO (Gated on preflight evidence)

---

### Finding F-30A-03: Trigger Function Omits Explicit `SECURITY DEFINER`

- **Severity:** **LOW**
- **Migration Filename:** `supabase/migrations/20261122100001_phase_3_0a_organization_permission_entitlements.sql`
- **Line Reference:** Lines 39–54
- **Description:**
  Function `public.fn_validate_organization_permission_module()` includes `SET search_path = public, pg_temp` but omits `SECURITY DEFINER`.
- **Impact:**
  The trigger executes with invoker permissions. Since direct client DML is revoked on `organization_permissions`, this is low-risk, but `SECURITY DEFINER` provides consistency with other RBAC triggers in PayPulse.
- **Recommended Correction:**
  Add `SECURITY DEFINER` to function header.
- **Blocks Execution:** NO

---

### Finding F-30B-05: Anonymous DO Block Lacks Migration Telemetry Logs

- **Severity:** **LOW**
- **Migration Filename:** `supabase/migrations/20261122100002_phase_3_0b_single_role_per_organization_user.sql`
- **Line Reference:** Lines 60–122
- **Description:**
  The data reconciliation loop in Section 3 iterates over organizations and reassigns roles without outputting operational progress notices.
- **Impact:**
  Database administrators executing migrations via CLI or pipeline cannot observe how many organizations or roles were migrated.
- **Recommended Correction:**
  Add `RAISE NOTICE 'Migrated organization % to custom ORG_ADMIN role %', v_rec.organization_id, v_custom_role_id;` inside the loop.
- **Blocks Execution:** NO

---

### Finding F-30A-04: Preservation of PascalCase Canonical Action Keys

- **Severity:** **INFORMATIONAL**
- **Migration Filename:** `supabase/migrations/20261122100001_phase_3_0a_organization_permission_entitlements.sql`
- **Line Reference:** Lines 110–119
- **Description:**
  Inspection confirms that the backfill references canonical `module_actions` which retain standard PascalCase identifiers (e.g. `Role.View`, `UserRole.Edit`). No conflicting snake_case catalog entries were introduced.
- **Blocks Execution:** NO

---

### Finding F-30B-06: System Role Assignment Blocked via Composite Foreign Key

- **Severity:** **INFORMATIONAL**
- **Migration Filename:** `supabase/migrations/20261122100002_phase_3_0b_single_role_per_organization_user.sql`
- **Line Reference:** Lines 145–152
- **Description:**
  By establishing composite foreign key `(organization_id, role_id) REFERENCES public.roles(organization_id, id)` where `user_roles.organization_id` is `NOT NULL` and `roles.organization_id` is `NULL` for `SYSTEM` roles, the database engine mathematically prevents any tenant user from being assigned a global system role. This is a foundational multi-tenant security achievement.
- **Blocks Execution:** NO
