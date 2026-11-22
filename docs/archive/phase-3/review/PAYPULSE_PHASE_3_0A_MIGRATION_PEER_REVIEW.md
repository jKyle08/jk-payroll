# PAYPULSE — PHASE 3.0A INDEPENDENT MIGRATION PEER REVIEW
## Organization Permission Entitlements Migration Safety & Technical Audit

**System:** PayPulse (JK Payroll)  
**Migration File:** `supabase/migrations/20261122100001_phase_3_0a_organization_permission_entitlements.sql`  
**Stack:** React 19, Express 4, Supabase Auth, PostgreSQL 17+  
**Review Type:** Independent Architecture & Database Security Audit  
**Review Date:** November 22, 2026  
**Execution Mode:** STRICT READ-ONLY REPOSITORY REVIEW (No DB writes or execution authorized)

---

## 1. Executive Summary

This document presents an independent technical peer review of Phase 3.0A migration script: `20261122100001_phase_3_0a_organization_permission_entitlements.sql`.

The purpose of Phase 3.0A is to introduce a normalized, first-class organizational entitlement table (`public.organization_permissions`) that bridges licensed organization modules (`public.organization_modules`) with specific granular module actions (`public.module_actions`). This establishes Tier 1 of PayPulse's Three-Tier Cascading RBAC architecture.

### Final Peer Review Verdict: **CONDITIONALLY APPROVED FOR EXECUTION REVIEW**

- **Architectural Conformance:** Complies with the Phase 2 Architecture Specification and Phase 2.2 Entitlement Model.
- **Safety Profile:** Additive "Expand" migration. Fully transaction-safe and non-destructive.
- **Precondition:** Requires staging preflight confirmation that `organization_modules` records in the target environment accurately reflect active, licensed modules prior to executing the automatic backfill.

---

## 2. SQL Artifact Specification Under Review

The review is based on the authoritative code located at [20261122100001_phase_3_0a_organization_permission_entitlements.sql](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261122100001_phase_3_0a_organization_permission_entitlements.sql):

- **Lines 8–121:** Full migration wrapped in a single explicit transaction block (`BEGIN ... COMMIT`).
- **Section 1 (Lines 14–15):** Schema alteration adding `is_active` lifecycle flag to `public.organization_modules`.
- **Section 2 (Lines 21–33):** DDL creating `public.organization_permissions`.
- **Section 3 (Lines 39–60):** Integrity trigger function `fn_validate_organization_permission_module()` and trigger `trg_validate_org_permission_module`.
- **Section 4 (Lines 65–73):** Performance indexes.
- **Section 5 (Lines 78–98):** Row Level Security activation, forced enforcement, and privilege grants/revocations.
- **Section 6 (Lines 103–120):** Idempotent data backfill.

---

## 3. Deep Technical Audit by Dimension

### 3.1 Table Design & Referential Integrity

#### A. Primary Key and Foreign Key Architecture
- **Primary Key:** `PRIMARY KEY (organization_id, module_action_id)` (Line 28).
  - *Evaluation:* Correct and minimal. In PayPulse's multi-tenant domain, an organization can only be entitled to an action once. Using `(organization_id, module_action_id)` guarantees uniqueness at the storage layer without artificial surrogate keys.
- **Organization Module FK:**
  ```sql
  CONSTRAINT fk_org_permissions_module FOREIGN KEY (organization_id, module_id)
      REFERENCES public.organization_modules(organization_id, module_id) ON DELETE CASCADE
  ```
  - *Evaluation:* Excellent referential hygiene. It references the composite primary key of `public.organization_modules(organization_id, module_id)` established in `20261104000001_core_schema.sql`.
  - *Cascade Behavior:* If an organization is deleted, or if an entire module is de-allocated/removed from an organization, all corresponding permission entitlements in `organization_permissions` are automatically purged via `ON DELETE CASCADE`.
- **Module Action FK:**
  ```sql
  CONSTRAINT fk_org_permissions_action FOREIGN KEY (module_action_id)
      REFERENCES public.module_actions(id) ON DELETE CASCADE
  ```
  - *Evaluation:* Direct reference to catalog action primary key. If a module action is decommissioned from the global catalog, downstream organizational entitlements are cleanly removed.
- **Audit Attribution FK:**
  ```sql
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
  ```
  - *Evaluation:* Correct nullable attribution. Prevents user deletions from blocking or cascading to organizational entitlement records.

#### B. Nullability and Default Values
- `organization_id`, `module_id`, `module_action_id`: Explicitly `NOT NULL`.
- `is_active`: `BOOLEAN NOT NULL DEFAULT true`.
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()`.
- `created_by`: Nullable `UUID`.
- *Evaluation:* Strict nullability constraints prevent partially formed entitlement records.

---

### 3.2 Catalog Integrity & Module-Action Validation

#### A. Cross-Module Entitlement Prevention
- *Architectural Risk:* A caller or buggy script could insert a record associating `module_id = A` (e.g. `Profile`) with `module_action_id = B` (e.g. `PayrollComputation.Run`).
- *Migration Solution:* Section 3 defines trigger function `fn_validate_organization_permission_module()`:
  ```sql
  CREATE OR REPLACE FUNCTION public.fn_validate_organization_permission_module()
  RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
  BEGIN
      IF NOT EXISTS (
          SELECT 1 FROM public.module_actions ma
          WHERE ma.id = NEW.module_action_id AND ma.module_id = NEW.module_id
      ) THEN
          RAISE EXCEPTION 'Module action does not belong to specified module'
              USING ERRCODE = '23514'; -- check_violation
      END IF;
      RETURN NEW;
  END;
  $$;
  ```
- *Independent Audit Critique (Finding F-30A-01):*
  - The trigger validates consistency upon `INSERT OR UPDATE` on `organization_permissions`.
  - However, if an administrator or migration subsequently executes `UPDATE public.module_actions SET module_id = ...`, this trigger will *not* fire because it resides only on `organization_permissions`.
  - *Superior Long-Term Architecture:* Adding `CONSTRAINT uq_module_actions_id_module UNIQUE (id, module_id)` to `public.module_actions` would allow a declarative composite foreign key:
    `FOREIGN KEY (module_action_id, module_id) REFERENCES public.module_actions(id, module_id) ON UPDATE CASCADE ON DELETE CASCADE`.
  - *Verdict on Current Trigger:* Acceptable for Phase 3.0A execution review because `module_actions` is a static, rarely modified catalog table. This does not block execution.

#### B. Catalog Keys & Case Sensitivity
- The backfill (Lines 110–119) joins directly on `public.module_actions ma ON ma.module_id = om.module_id`.
- Inspection of `supabase/seeds/20261101000001_seed_catalog.sql` and `20261121153500_phase_3_1b` verifies that catalog keys use canonical PascalCase (e.g., `Role.View`, `Role.Add`, `UserRole.Edit`).
- Phase 3.0A does **not** introduce any duplicate snake_case catalog entries or alias tables.

---

### 3.3 Backfill Safety & Privilege Expansion Analysis

#### A. Backfill SQL Scrutiny
```sql
INSERT INTO public.organization_permissions (
    organization_id,
    module_id,
    module_action_id,
    is_active,
    created_at
)
SELECT 
    om.organization_id,
    om.module_id,
    ma.id,
    true,
    clock_timestamp()
FROM public.organization_modules om
JOIN public.module_actions ma ON ma.module_id = om.module_id
WHERE om.is_active = true
ON CONFLICT (organization_id, module_action_id) DO NOTHING;
```

#### B. Privilege Expansion Evaluation
- *Question:* Does backfilling every action under an active module grant unintended privileges to regular users?
- *Analysis:*
  1. In PayPulse's Three-Tier RBAC, `organization_permissions` represents the **outer licensing boundary** (Tier 1).
  2. To actually exercise a permission, an authenticated tenant user must have an explicit assignment in Tier 3 (`public.role_permissions` linked to their role, or `public.user_permissions`).
  3. Populating Tier 1 does **not** automatically grant any user permissions unless a matching grant already exists in Tier 3.
  4. Therefore, there is **zero direct privilege escalation** for tenant users.

#### C. Inactive / Suspended Modules Evaluation (Finding F-30A-02)
- In Section 1, `ALTER TABLE public.organization_modules ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;` sets `is_active = true` for all existing rows.
- If a target database contains legacy records in `organization_modules` that were intended to be deactivated or suspended, the backfill will treat them as active and entitle their actions.
- *Remediation Requirement:* The staging preflight must execute a read-only query inspecting `public.organization_modules` to ensure no deactivated or legacy organizations/modules exist prior to migration execution.

#### D. Idempotency & Repeatability
- The query uses `ON CONFLICT (organization_id, module_action_id) DO NOTHING`.
- If the migration is re-run or partially backfilled, existing entitlement records are preserved without timestamp overwrite or error.

---

### 3.4 Row Level Security & Privilege Boundaries

#### A. RLS Policy Audit
```sql
ALTER TABLE public.organization_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_permissions FORCE ROW LEVEL SECURITY;

CREATE POLICY org_permissions_select_policy ON public.organization_permissions
    FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_member(organization_id)
        )
    );
```
- *Tenant Isolation:* A user can only read entitlements where `organization_id` strictly matches their active context (`public.current_user_organization_id()`) AND they possess an active membership (`public.is_organization_member(organization_id)`).
- *Cross-Tenant Defense:* Cross-tenant queries by authenticated tenant users evaluate to `false` and return zero rows.
- *SuperAdmin Visibility:* SuperAdmins can inspect entitlements across all organizations for administrative governance via `public.is_super_admin()`.
- *FORCE RLS:* `FORCE ROW LEVEL SECURITY` ensures that table owners (excluding superuser/service_role bypass) are constrained by policies.

#### B. DML Privilege Hardening
```sql
REVOKE ALL ON public.organization_permissions FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.organization_permissions FROM authenticated;
GRANT SELECT ON public.organization_permissions TO authenticated;
GRANT ALL ON public.organization_permissions TO service_role, postgres;
```
- *Strict Fail-Closed Grants:* Direct client mutation (`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`) is stripped from `authenticated` and `anon`.
- Tenant administrators and users cannot modify their own organization's entitlements via PostgREST/Supabase client. Entitlement modifications are reserved exclusively for trusted backend workflows operating via `service_role` or `postgres`.

---

## 4. Findings Summary for Phase 3.0A

| Finding ID | Severity | Line Reference | Description | Blocks Execution? |
|---|---|---|---|---|
| **F-30A-01** | MEDIUM | Lines 39–60 | Module-action consistency enforced via trigger rather than declarative composite foreign key on `module_actions`. | NO |
| **F-30A-02** | MEDIUM | Lines 14–15, 110–119 | Column `is_active` added with `DEFAULT true`; all existing `organization_modules` presumed active during backfill. | NO (Preflight required) |
| **F-30A-03** | LOW | Lines 39–54 | Trigger function `fn_validate_organization_permission_module` omits explicit `SECURITY DEFINER`. | NO |
| **F-30A-04** | INFORMATIONAL | Lines 110–119 | Verifies preservation of canonical PascalCase naming; no snake_case duplicate catalog introduced. | NO |

---

## 5. Peer Review Verdict & Recommendation

### Status: **CONDITIONALLY APPROVED FOR EXECUTION REVIEW**

### Prerequisites for Controlled Staging Execution:
1. **Staging Preflight Verification:** Confirm that all rows in `public.organization_modules` on the staging target represent active, billable modules.
2. **Catalog Integrity Verification:** Confirm that canonical records in `public.modules` and `public.module_actions` are intact and uncorrupted.
3. **Execution Sequencing:** Phase 3.0A must be applied and committed before Phase 3.0B or subsequent cascading authorization migrations.
