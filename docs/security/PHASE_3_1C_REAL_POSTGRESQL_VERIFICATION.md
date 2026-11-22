# Phase 3.1C: Real PostgreSQL Verification and Migration Readiness Report

**Review Date:** 2026-11-22 (Asia/Manila)  
**Execution Type:** Environment Preflight, Security Static Analysis, and Verification Protocol  
**PostgreSQL Version:** Not available / not determined (blocked by environment constraints)  
**Remote Database Accessed or Changed:** **No** (Zero remote databases connected or modified)  
**Production Approval:** **Not Granted**  
**Final Determination:** **NOT READY**

---

## 1. Executive Summary & Environment Assessment

Phase 3.1C requires verification of migrations 20 (`20261121000020_separate_superadmin_role_authority.sql`) and 21 (`20261121153500_phase_3_1b_database_role_authorization_boundary.sql`) against an authentic, disposable PostgreSQL instance prior to any development Supabase deployment.

### 1.1 Environment Inspection Results

An exhaustive audit of the local execution environment was conducted to identify supported PostgreSQL provisioning pathways:

| Component / Utility | Inspection Method | Result | Notes |
|---|---|---|---|
| PostgreSQL Client Binaries | `psql`, `pg_ctl`, `initdb`, `createdb` | **Not Found** | Not present on system `PATH` or in standard directories |
| PostgreSQL Server Binaries | `postgres` | **Not Found** | No native installation found in `C:\Program Files\PostgreSQL` |
| Container Runtimes | `docker`, `podman`, `nerdctl`, `minikube` | **Not Found** | No container engine available in host environment |
| Supabase CLI | `supabase` | **Not Found** | Supabase CLI executable absent from `PATH` |
| Windows Subsystem for Linux | `wsl --status`, `wsl --list` | **Inaccessible** | WSL executable present, but invocation denied (`Wsl/E_ACCESSDENIED`) |
| Service Control Manager | PowerShell `Get-Service` | **Access Denied** | Inability to inspect or query Windows service control manager |
| External Supabase Project | Connection Strings / Credentials | **Disconnected** | Explicitly prevented; no external databases were contacted |

### 1.2 Exact Blocker Statement

> [!CAUTION]
> **Exact Blocker:** No authentic local PostgreSQL server, client binary (`psql`), or container runtime (`docker`/`podman`) is installed or accessible within this environment. Windows Subsystem for Linux (WSL) is locked with `Wsl/E_ACCESSDENIED`, and host service management privileges are restricted. Under Phase 3.1C instructions, the agent is strictly forbidden from installing software or starting services without explicit authorization, forbidden from connecting to remote Supabase instances, and forbidden from substituting embedded PGlite to claim PostgreSQL verification. Therefore, real PostgreSQL execution is blocked at the environment gate.

In accordance with Section 1 of the instructions, execution has halted, and all verification suites are documented below with their static security proofs, locking models, and readiness criteria.

---

## 2. Migration Execution & Catalog Analysis

### 2.1 Sequential Migration Baseline (Migrations 1–21)

The complete migration sequence comprises 21 files:

1. `20261104000001_core_schema.sql`
2. `20261104000002_functions_and_rls.sql`
3. `20261104000003_audit_logs.sql`
4. `20261104000004_attach_audit_triggers.sql`
5. `20261104000005_seed_default_user_roles.sql`
6. `20261104000006_fix_auth_users_null_tokens.sql`
7. `20261104000007_audit_logs_superadmin_policy.sql`
8. `20261104000008_align_organizations_schema.sql`
9. `20261104000009_expand_organizations_sector_settings.sql`
10. `20261119000010_remediate_database_rls.sql`
11. `20261119000011_harden_audit_attribution_and_integrity.sql`
12. `20261121000012_remediate_critical_containment.sql`
13. `20261121000013_security_correction_phase1_1.sql`
14. `20261121000014_security_corrections_phase1_1_1.sql`
15. `20261121000015_align_organization_locale_defaults.sql`
16. `20261121000016_require_organization_leaves_settings.sql`
17. `20261121000017_protect_profile_audit_fields.sql`
18. `20261121000018_superadmin_onboarding_invitations.sql`
19. `20261121000019_authorized_member_invitations.sql`
20. `20261121000020_separate_superadmin_role_authority.sql`
21. `20261121153500_phase_3_1b_database_role_authorization_boundary.sql`

### 2.2 Baseline Integrity Assessment

- **Migration Files 1–20 Integrity Check:**
  - Workspace inspection confirms that `supabase/migrations/20261104000001_core_schema.sql` contains unstaged working-tree modifications from an earlier refactor.
  - Migrations 20 and 21 are untracked in git.
  - Prior to production or remote staging application, the repository owner must reconcile the working tree against the clean upstream baseline commit (`a7f77fa`).
  - No migration files were altered during this Phase 3.1C task.

### 2.3 Catalog Objects Expected from Migrations 20 & 21

When applied to real PostgreSQL, the following functions, triggers, and policies are introduced or replaced:

```sql
-- Functions
public.normalize_organization_role_code(TEXT) -> TEXT [IMMUTABLE, search_path = pg_catalog, public, pg_temp]
public.is_assignable_organization_role(UUID, UUID) -> BOOLEAN [STABLE, SECURITY DEFINER, search_path = pg_catalog, public, pg_temp]
public.is_existing_trusted_tenant_admin_user_role(UUID, UUID, UUID) -> BOOLEAN [STABLE, SECURITY DEFINER]
public.is_existing_trusted_tenant_admin_membership(UUID, UUID, UUID, UUID, BOOLEAN) -> BOOLEAN [STABLE, SECURITY DEFINER]
public.enforce_organization_role_assignment() -> TRIGGER [SECURITY DEFINER, search_path = pg_catalog, public, auth, pg_temp]
public.enforce_member_invitation_role_eligibility() -> TRIGGER [SECURITY DEFINER, search_path = pg_catalog, public, pg_temp]
public.prevent_assigned_role_identity_or_scope_change() -> TRIGGER [SECURITY DEFINER, search_path = pg_catalog, public, pg_temp]
public.reject_superadmin_role_assignment() -> TRIGGER [SECURITY DEFINER, search_path = public, pg_temp]
public.reject_superadmin_role_code_with_assignments() -> TRIGGER [SECURITY DEFINER, search_path = public, pg_temp]

-- Triggers
trg_phase31b_user_role_assignment ON public.user_roles (BEFORE INSERT OR UPDATE)
trg_phase31b_organization_member_role_assignment ON public.organization_members (BEFORE INSERT OR UPDATE)
trg_phase31b_member_invitation_role ON public.organization_member_invitations (BEFORE INSERT OR UPDATE)
trg_phase31b_role_identity_scope ON public.roles (BEFORE UPDATE OF code, organization_id, role_type)
trg_reject_superadmin_user_role_assignment ON public.user_roles (BEFORE INSERT OR UPDATE)
trg_reject_superadmin_membership_role_assignment ON public.organization_members (BEFORE INSERT OR UPDATE)
trg_reject_superadmin_role_code_with_assignments ON public.roles (BEFORE UPDATE OF code)

-- Policies
user_roles_insert_policy ON public.user_roles (FOR INSERT TO authenticated)
user_roles_update_policy ON public.user_roles (FOR UPDATE TO authenticated)
org_members_insert_policy ON public.organization_members (FOR INSERT TO authenticated)
org_members_update_policy ON public.organization_members (FOR UPDATE TO authenticated)
```

---

## 3. Trusted Onboarding Security & Execution-Context Analysis

A critical objective of Phase 3.1C is verifying the coexistence and security boundaries of Migration 18 (`provision_organization_from_onboarding_invitation`) and Migration 21 (`enforce_organization_role_assignment`).

### 3.1 PostgreSQL `SECURITY DEFINER` Identity Mechanics

In PostgreSQL, the execution identity of functions and triggers adheres to specific rules:
1. **Invoker vs. Definer:** An ordinary function or trigger executes with the privileges and context of the `current_user` (the calling session role). A `SECURITY DEFINER` function executes with the privileges and authorization context of its **owner** (typically `postgres` or `supabase_admin`).
2. **`current_user` in SECURITY DEFINER:**
   - Inside a `SECURITY DEFINER` function or trigger, calling `current_user` evaluates to the **definer/owner**, *not* the caller who initiated the transaction or query.
   - If a trigger were to check `IF current_user = 'service_role'`, that check would evaluate to `false` (or check the database superuser name), completely failing to identify the external Supabase API role.
3. **Trigger Invocation Context:**
   - When Migration 18's `provision_organization_from_onboarding_invitation()` runs, it is a `SECURITY DEFINER` function owned by `postgres`.
   - When it performs `INSERT INTO public.organization_members` and `INSERT INTO public.user_roles`, the `BEFORE INSERT` triggers on those tables fire.
   - Even though the parent RPC is running as `postgres`, the request session metadata established by PostgREST/Supabase persists in session settings (`request.jwt.claim.role`).
4. **Resolution in Migration 21:**
   - Migration 21 correctly avoids relying on `current_user`. Instead, it extracts the authenticated claim:
     ```sql
     v_actor_role TEXT := coalesce(auth.role(), 'anon');
     ```
   - In Supabase, `auth.role()` resolves `NULLIF(current_setting('request.jwt.claim.role', true), '')`. When called via the service-role client, this returns `'service_role'`.

### 3.2 Non-Interference Proof: Why Migration 21 Does Not Block Migration 18

Migration 18 performs the following operations inside its single transaction:
1. `INSERT INTO public.organizations (...) RETURNING id INTO v_org_id;`
2. `INSERT INTO public.departments (...) RETURNING id INTO v_dept_id;`
3. `INSERT INTO public.profiles (..., is_organization_admin = false, is_super_admin = false, is_active = true, ...);`
4. `INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner = true, is_active = true);`
5. `INSERT INTO public.user_roles (organization_id, user_id, role_id, ...);`

When Migration 21's trigger `enforce_organization_role_assignment()` intercepts steps 4 and 5:

#### Step 4 (`organization_members` INSERT):
- `v_actor_role` = `'service_role'`.
- `v_code` = `'TENANTADMIN'` (from `public.roles` where `role_type = 'SYSTEM' AND organization_id IS NULL`).
- Condition evaluates:
  ```sql
  IF v_code = 'TENANTADMIN'
     AND v_actor_role = 'service_role'
     AND v_role.role_type = 'SYSTEM'
     AND v_role.organization_id IS NULL
     AND v_role.is_active = true THEN
      IF TG_TABLE_NAME = 'organization_members' THEN
          v_is_first_owner_tenant_admin := NEW.is_owner; -- evaluates to TRUE
      ...
      IF v_is_first_owner_tenant_admin
         AND EXISTS (
             SELECT 1 FROM public.profiles p
             WHERE p.id = NEW.user_id AND p.is_active = true AND p.is_super_admin = false
         ) THEN
          RETURN NEW; -- PERMITTED
      END IF;
  ```
- Because Step 3 inserted the profile with `is_super_admin = false` and `is_active = true`, the check passes immediately, permitting the owner membership.

#### Step 5 (`user_roles` INSERT):
- `TG_TABLE_NAME` = `'user_roles'`.
- Condition evaluates:
  ```sql
  SELECT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = NEW.organization_id
        AND om.user_id = NEW.user_id
        AND om.role_id = NEW.role_id
        AND om.is_owner = true
        AND om.is_active = true
  ) INTO v_is_first_owner_tenant_admin;
  ```
- Because Step 4 already committed into the transaction state, this returns `TRUE`.
- The profile check (`is_super_admin = false`) passes.
- The trigger executes `RETURN NEW`, permitting the role assignment.

**Conclusion:** The trigger logic is strictly ordered to allow Migration 18's provisioning sequence while prohibiting any unauthorized assignment.

### 3.3 Protection Against Privilege Escalation and Spoofing

1. **Ordinary Administrator Cannot Assign TENANT_ADMIN:**
   - An authenticated organization admin connects with JWT role `'authenticated'`.
   - `v_actor_role` evaluates to `'authenticated'`.
   - The onboarding exception requires `v_actor_role = 'service_role'`. This branch is bypassed.
   - The trigger enters the prohibited code check:
     ```sql
     IF v_code IN ('SUPERADMIN', 'PLATFORMSUPERADMIN', 'TENANTADMIN', 'ORGANIZATIONADMIN', 'ORGADMIN', 'ADMIN') THEN
         RAISE EXCEPTION 'Protected role codes cannot be assigned through organization role management'
             USING ERRCODE = '42501';
     ```
   - Execution is aborted with error code `42501`.
2. **Ordinary Authenticated User Cannot Call Provisioning RPC:**
   - In Migration 18:
     ```sql
     REVOKE ALL ON FUNCTION public.provision_organization_from_onboarding_invitation(TEXT, UUID, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
     GRANT EXECUTE ON FUNCTION public.provision_organization_from_onboarding_invitation(TEXT, UUID, JSONB, TEXT, TEXT) TO service_role;
     ```
   - In Migration 21:
     ```sql
     REVOKE ALL ON FUNCTION public.enforce_organization_role_assignment() FROM PUBLIC, anon, authenticated;
     ```
   - Calling the provisioning RPC as `authenticated` fails at PostgreSQL's function dispatch layer with `42501 permission denied for function provision_organization_from_onboarding_invitation`.
3. **Resistance to Session Variable Spoofing:**
   - In Supabase, PostgREST controls transaction boundaries and executes `SET LOCAL request.jwt.claims = ...` based on cryptographically verified JWT signatures.
   - Ordinary client HTTP requests cannot set custom configuration settings (`request.jwt.*`) because PostgREST overrides these headers with the validated bearer token claims.
   - However, in raw SQL connections via connection pooling (PgBouncer/Supavisor), an authenticated role could theoretically attempt `SET request.jwt.claim.role = 'service_role'`. In PostgreSQL, `ALTER ROLE authenticated SET ...` or session configuration restrictions must ensure unprivileged roles cannot override protected settings. This runtime boundary requires live PostgreSQL testing.

---

## 4. Row-Level Security (RLS) Test Matrix

The test protocol establishes that `user_roles` and `organization_members` enforce strict isolation between tenants and prevent privilege escalation across all DML operations.

### 4.1 RLS Evaluation Model

```
           +---------------------------------------------+
           | Client Request (INSERT / UPDATE / DELETE)   |
           +---------------------------------------------+
                                  |
                                  v
           +---------------------------------------------+
           | 1. Table RLS Policies (PostgreSQL Engine)    |
           |    - user_roles_insert_policy               |
           |    - user_roles_update_policy               |
           |    - org_members_insert_policy              |
           |    - org_members_update_policy              |
           +---------------------------------------------+
                    |                      |
            (USING fails)            (WITH CHECK passes)
                    |                      |
                    v                      v
             [42501 / 0 rows]  +-----------------------------------+
                               | 2. BEFORE Triggers (Pl/pgSQL)     |
                               |    - enforce_organization_role_   |
                               |      assignment()                 |
                               |    - FOR SHARE lock on Role       |
                               +-----------------------------------+
                                        |                  |
                                (Exception raised)   (RETURN NEW)
                                        |                  |
                                        v                  v
                                     [42501]           [COMMITTED]
```

### 4.2 Detailed Test Scenarios (Matrix of Authenticated Operations)

| Test ID | Operation | Target Table | Target Entity / Role | Executing Role / Actor | Expected Result | Enforcement Mechanism |
|---|---|---|---|---|---|---|
| **RLS-01** | `INSERT` | `user_roles` | Valid same-org custom role | `authenticated` (Org Admin) | **ALLOW** | `user_roles_insert_policy` + Trigger check pass |
| **RLS-02** | `INSERT` | `user_roles` | Protected platform `SUPERADMIN` | `authenticated` (Org Admin) | **DENY (42501)** | Trigger: Protected role code block |
| **RLS-03** | `INSERT` | `user_roles` | System `TENANT_ADMIN` | `authenticated` (Org Admin) | **DENY (42501)** | Trigger: Non-service-role actor block |
| **RLS-04** | `INSERT` | `user_roles` | System `ORG_ADMIN` | `authenticated` (Org Admin) | **DENY (42501)** | Trigger: Protected role code block |
| **RLS-05** | `INSERT` | `user_roles` | Role from Org B into Org A | `authenticated` (Org Admin A) | **DENY (23514/42501)** | `is_assignable_organization_role` returns FALSE |
| **RLS-06** | `UPDATE` | `user_roles` | Change `organization_id` | `authenticated` (Org Admin) | **DENY (42501)** | Trigger: Cross-organization assignment block |
| **RLS-07** | `UPDATE` | `user_roles` | Change `role_id` to `TENANT_ADMIN` | `authenticated` (Org Admin) | **DENY (42501)** | `user_roles_update_policy` WITH CHECK failure |
| **RLS-08** | `UPDATE` | `user_roles` | Combined Org and Role change | `authenticated` (Org Admin) | **DENY (42501)** | Trigger + Policy rejection |
| **RLS-09** | `UPDATE` | `organization_members` | Preserve owner `TENANT_ADMIN` | `authenticated` (Org Admin) | **ALLOW** | `is_existing_trusted_tenant_admin_membership` |
| **RLS-10** | `UPDATE` | `organization_members` | Set `is_owner = true` | `authenticated` (Org Admin) | **DENY (42501)** | Trigger: Non-service-role owner mutation block |
| **RLS-11** | `EXECUTE` | `provision_organization_from_...` | RPC invocation | `authenticated` (Any) | **DENY (42501)** | PostgreSQL function ACL permission check |
| **RLS-12** | `DELETE` | `user_roles` | Custom role assignment | `authenticated` (Org Admin) | **ALLOW** | Standard org-admin delete policy |

---

## 5. Two-Session Concurrency & Serialization Verification

Migrations 20 and 21 implement database-level concurrency protection using `FOR SHARE` locks on the `roles` table and strict update triggers on role identity/scope. The concurrency suite tests race conditions across two independent PostgreSQL connections.

```
                      SESSION A                                      SESSION B
                          |                                              |
      BEGIN;              |                                              |
      INSERT INTO user_roles                                             |
      (takes FOR SHARE lock on Role X)                                   |
                          |                                              |  BEGIN;
                          |                                              |  UPDATE roles SET code = 'TENANTADMIN'
                          |                                              |  (attempts EXCLUSIVE write lock on Role X)
                          |                                              |        |
                          |                                              |  [BLOCKED BY FOR SHARE LOCK]
                          |                                              |        :
      COMMIT; ------------+--------------------------------------------->: (unblocks)
                                                                                  |
                                                                         trg_phase31b_role_identity_scope fires:
                                                                         detects existing assignment in user_roles;
                                                                         RAISE EXCEPTION '42501';
                                                                         [ROLLBACK]
```

### Scenario A: Assignment Wins the Lock

1. **Session A:**
   ```sql
   BEGIN;
   -- Valid custom role assignment in Org A
   INSERT INTO public.user_roles (organization_id, user_id, role_id, assigned_by)
   VALUES ('org-a-uuid', 'user-1-uuid', 'role-custom-uuid', 'admin-uuid');
   -- The trigger executes: SELECT r.* FROM public.roles r WHERE r.id = NEW.role_id FOR SHARE;
   -- Holds row-level shared lock on role-custom-uuid.
   ```
2. **Session B (Concurrent Race):**
   ```sql
   BEGIN;
   -- Malicious or concurrent attempt to rename role-custom to a protected alias
   UPDATE public.roles
   SET code = 'TENANT_ADMIN'
   WHERE id = 'role-custom-uuid';
   -- BLOCKED: Awaiting release of Session A's FOR SHARE lock.
   ```
3. **Execution & Outcome:**
   - Session A executes `COMMIT;`.
   - Session B unblocks. Session B's trigger `trg_phase31b_role_identity_scope` fires:
     ```sql
     SELECT EXISTS (
         SELECT 1 FROM public.user_roles ur WHERE ur.role_id = OLD.id
         UNION ALL
         SELECT 1 FROM public.organization_members om WHERE om.role_id = OLD.id
     ) INTO v_has_assignments;
     ```
   - Since Session A's commit is now visible, `v_has_assignments` evaluates to `true`.
   - Because `v_new_code` (`'TENANTADMIN'`) is in the protected set and distinct from `v_old_code`, the trigger raises:
     `42501 Protected role identity cannot change while assignments reference it`.
   - **Result:** Invariant preserved. No user receives a protected role.

### Scenario B: Rename Wins the Lock

1. **Session A:**
   ```sql
   BEGIN;
   UPDATE public.roles
   SET code = 'ORGANIZATION_ADMIN'
   WHERE id = 'role-custom-uuid';
   -- Obtains exclusive row-level lock on role-custom-uuid.
   ```
2. **Session B (Concurrent Race):**
   ```sql
   BEGIN;
   INSERT INTO public.user_roles (organization_id, user_id, role_id, assigned_by)
   VALUES ('org-a-uuid', 'user-1-uuid', 'role-custom-uuid', 'admin-uuid');
   -- BLOCKED: Trigger's SELECT ... FOR SHARE blocks waiting for Session A.
   ```
3. **Execution & Outcome:**
   - Session A executes `COMMIT;`.
   - Session B unblocks. In PostgreSQL read-committed mode, `SELECT ... FOR SHARE` re-fetches the updated row.
   - It reads `code = 'ORGANIZATION_ADMIN'`.
   - `normalize_organization_role_code('ORGANIZATION_ADMIN')` yields `'ORGANIZATIONADMIN'`.
   - The trigger condition triggers:
     `42501 Protected role codes cannot be assigned through organization role management`.
   - Session B's insert is rejected.
   - **Result:** Invariant preserved.

### Scenario C: Concurrent Scope / Tenant Modification

1. **Session A:**
   ```sql
   BEGIN;
   UPDATE public.roles
   SET organization_id = 'org-b-uuid'
   WHERE id = 'role-custom-uuid';
   -- Holds exclusive row lock.
   ```
2. **Session B:**
   ```sql
   BEGIN;
   INSERT INTO public.user_roles (organization_id, user_id, role_id, assigned_by)
   VALUES ('org-a-uuid', 'user-1-uuid', 'role-custom-uuid', 'admin-uuid');
   -- BLOCKED: Trigger's SELECT ... FOR SHARE waits for Session A.
   ```
3. **Execution & Outcome:**
   - Session A executes `COMMIT;`.
   - Session B unblocks and reads the updated role with `organization_id = 'org-b-uuid'`.
   - In Session B, `v_role.organization_id IS DISTINCT FROM NEW.organization_id` evaluates to `true`.
   - The trigger raises `23514 Role must be active, custom, and scoped to the assignment organization`.
   - **Result:** Cross-organization role breach prevented.

---

## 6. Invitation Validation & Normalization Matrix

Migration 21 introduces `normalize_organization_role_code()` and attaches `trg_phase31b_member_invitation_role` to `organization_member_invitations`.

### 6.1 Normalization Function Specification

```sql
CREATE OR REPLACE FUNCTION public.normalize_organization_role_code(p_code TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog, public, pg_temp AS $$
    SELECT regexp_replace(upper(coalesce(p_code, '')), '[[:space:]_-]+', '', 'g');
$$;
```

The regex `[[:space:]_-]+` removes underscores, hyphens, and any character matching POSIX `[:space:]` (spaces, horizontal tabs `\t`, newlines `\n`, vertical tabs `\v`, form feeds `\f`, and carriage returns `\r`).

### 6.2 Invitation Role Alias Test Suite

| Input Code String | Normalized Output | Protected Match? | Invitation Creation Result | Error Code |
|---|---|---|---|---|
| `SUPERADMIN` | `SUPERADMIN` | Yes | **REJECTED** | `23514` |
| `superadmin` | `SUPERADMIN` | Yes | **REJECTED** | `23514` |
| `  TENANT_ADMIN  ` | `TENANTADMIN` | Yes | **REJECTED** | `23514` |
| `\tTENANT_ADMIN` | `TENANTADMIN` | Yes | **REJECTED** | `23514` |
| `TENANT_\r\nADMIN` | `TENANTADMIN` | Yes | **REJECTED** | `23514` |
| `PLATFORM-SUPER-ADMIN`| `PLATFORMSUPERADMIN`| Yes | **REJECTED** | `23514` |
| `Org_Admin` | `ORGADMIN` | Yes | **REJECTED** | `23514` |
| `Organization-Admin` | `ORGANIZATIONADMIN` | Yes | **REJECTED** | `23514` |
| `ADMIN` | `ADMIN` | Yes | **REJECTED** | `23514` |
| `   ADMIN   ` | `ADMIN` | Yes | **REJECTED** | `23514` |
| `PAYROLL_OFFICER` | `PAYROLLOFFICER` | No | **ACCEPTED** | N/A |
| `HR_MANAGER` | `HRMANAGER` | No | **ACCEPTED** | N/A |

### 6.3 Preservation of Migration 19 Invariants

1. **Same-Identity Idempotent Retry:**
   - In Migration 19 (`provision_organization_member_from_invitation`):
     ```sql
     IF v_inv.redeemed_at IS NOT NULL THEN
         IF v_inv.redeemed_by = p_user_id THEN
             RETURN QUERY SELECT v_inv.organization_id, v_inv.department_id, p_user_id, v_inv.role_id;
             RETURN;
         END IF;
         RAISE EXCEPTION 'Member invitation has already been used' USING ERRCODE = '42501';
     END IF;
     ```
   - Migration 21 does not touch this function or its redemption table; same-identity replay behavior remains intact.
2. **Different-Identity Rejection:**
   - If User B attempts to redeem an invitation token issued to User A (`v_inv.redeemed_by <> p_user_id`), the transaction raises `42501 Member invitation has already been used`.

---

## 7. Combined Migration Regression Analysis (18, 19, 20, 21)

The unified workflow requires seamless interoperation of all four security migrations:

```
[Migration 18] SuperAdmin Onboarding Link Issued
       |
       v
[Migration 18] provision_organization_from_onboarding_invitation()
       |---> Creates Org, Dept, Profile (is_super_admin = false)
       |---> Inserts Owner Membership
       |---> Inserts TENANT_ADMIN user_role
       |
       v (Intercepted by Migration 20 & 21 Triggers)
       |---> Migration 20: Ignores TENANT_ADMIN (only rejects SUPER_ADMIN)
       |---> Migration 21: Validates service_role + is_owner + active profile -> ALLOWS
       |
       v
[Migration 19] create_organization_member_invitation()
       |---> Validates actor is Org Admin
       |---> Intercepted by Migration 21 trg_phase31b_member_invitation_role
       |---> Rejects protected roles (ADMIN, ORG_ADMIN, etc.) -> ENFORCED
       |---> Allows custom active role -> ALLOWS
       |
       v
[Migration 19] provision_organization_member_from_invitation()
       |---> Provisions invited user with custom role
       |---> Intercepted by Migration 21 trg_phase31b_user_role_assignment
       |---> Validates active custom role scoped to Org -> ALLOWS
       |
       v
[Migration 20 & 21] Subsequent Ordinary Administration
       |---> Direct assignment of protected roles rejected
       |---> Scope modification of assigned roles rejected
       |---> Tenant admin assignment by ordinary admin rejected
```

---

## 8. Unresolved Issues & Remediation Action Items

1. **Unresolved Blocker — Local Database Provisioning:**
   - No authentic PostgreSQL instance is available in the local execution sandbox.
   - PGlite was verified in Phase 3.1B, but PGlite is a WebAssembly-compiled single-session engine and does not replicate PostgreSQL's multi-process concurrency, row-level locking (`FOR SHARE` / `FOR UPDATE`), or production Supabase PostgREST session configuration.
2. **Dirty Migration Baseline:**
   - `supabase/migrations/20261104000001_core_schema.sql` has unstaged changes.
   - Migrations 20 and 21 are untracked.
   - The workspace must be committed or stashed to ensure migration reproducibility.
3. **Mandatory Action Items Prior to Development Migration:**
   - [ ] Provision a dedicated, isolated PostgreSQL 15/16 database (e.g., local Supabase CLI or disposable container with network authorization).
   - [ ] Run the complete sequential migration apply (1 through 21) and capture raw PostgreSQL stdout/stderr.
   - [ ] Run the two-session concurrency scripts in parallel connections to verify row locking in actual MVCC transactions.
   - [ ] Verify Supabase project credentials, migration history table (`supabase_migrations.schema_migrations`), and existing tenant inventory before remote deployment.

---

## 9. Final Determination & Certification

### Statement on Remote Database Access
> **Exact Confirmation:** No remote database (including development, staging, or production Supabase projects) was contacted, accessed, or modified during the execution of this task. All analysis was conducted strictly within the local environment.

### Final Readiness Decision

# **NOT READY**

**Rationale:** While the static security analysis confirms the theoretical validity and non-interference of Migrations 18, 19, 20, and 21, the absence of a real PostgreSQL environment prevented live execution of the migration scripts, live multi-session concurrency testing, and empirical verification of PostgreSQL role and trigger semantics. Under the rules of Phase 3.1C, deployment readiness cannot be certified without real PostgreSQL verification.
