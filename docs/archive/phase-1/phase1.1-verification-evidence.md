# PayPulse Phase 1.1 Security Verification Evidence

> Archived historical report. Its phase statuses and recommendations are not current; use [`SECURITY_REMEDIATION_MASTER_TRACKER.md`](../../security/SECURITY_REMEDIATION_MASTER_TRACKER.md) for authoritative status. Original report content is preserved below.

**Review date:** 2026-11-21 (Asia/Manila)  
**Scope:** repository migrations through `20261121000017`, application authorization paths, embedded SQL checks, and availability of a live PostgreSQL/Supabase verifier.  
**Recommendation:** **Reject approval pending onboarding correction and live PostgreSQL/Supabase staging evidence.** The source corrections and embedded checks are useful evidence, but they are not proof of the deployed database state.

## 1. Repository Inspection Report

Inspected `supabase/migrations/` in filename order: `20261104000001` through `20261104000009`, `20261119000010` and `20261119000011`, `20261121000012` through `20261121000017`; `supabase/config.toml`; `supabase/seed.sql`; `supabase/clean_and_seed_superadmin.sql`; staging verification SQL; the requested middleware, organization context, permission service, role service and repository files; and the `tests/` tree including the shared SQL harness.

The migration history in this checkout extends through `20261121000016` before this task. Migrations 12–14 are already present and uncommitted. The request's statement that 12 is current is stale for this checkout. Migration 13 corrected the membership and SuperAdmin authority defects; migration 14 further corrected profile trigger execution context, permission RPC internals, self-registration, role-code authority, and ambiguous organization selection. Migration 15–16 are organization settings/locale changes. Migration 17 is the new Phase 1.1.2 correction from this review.

Supabase config specifies local DB port 54322 and PostgreSQL major version 17. No `psql`, `supabase`, or `docker` executable was available and no listener was found on 54322/5432. The integration harness uses `@electric-sql/pglite`, labels itself embedded PostgreSQL, and explicitly says it does not verify the Supabase staging database.

Key source facts:

- Core schema defines `organizations.status` as enum `Onboarding | Active | Suspended`, with `start_date` and `end_date` both `TIMESTAMPTZ`; expiration checks use inclusive `end_date >= clock_timestamp()`.
- Migration 13 synchronizes `organizations.is_active` on all insert/update operations and adds a validated `CHECK (is_active = (status = 'Active'))`.
- Migration 14 `is_organization_member()` requires an active `organization_members` row and an active, unexpired organization, except that a current authoritative SuperAdmin can bypass tenant membership. It does not use profile organization as membership proof.
- Migration 14 `current_user_organization_id()` validates the JWT organization selector against eligible memberships; without a valid selector it resolves only a single eligible membership, returning NULL for ambiguity.
- Migration 14 `is_super_admin()` reads only active `profiles.is_super_admin`; stale JWT role claims are informational. The token hook still emits an informational role label.
- `get_user_effective_permissions(uuid,uuid)` is SECURITY DEFINER with Model B grants in migrations 13/14 (revoked from PUBLIC, anon, authenticated; granted to `service_role`). Source also has a defense-in-depth authenticated user-id guard.
- `is_organization_admin()` in migration 14 uses owner flag; active system role through `user_roles`; transitional membership `role_id`; and transitional scoped `profiles.is_organization_admin`. It does not use display names or tenant-created role codes as authority. The transitional paths are documented in migration comments.
- Migration 10 grants authenticated table-wide CRUD and relies on RLS. Migrations inspected contain no `ALTER DEFAULT PRIVILEGES` declaration. The profile update trigger protected privilege and organization fields, but did not protect profile audit fields; profile insert also allowed a caller-supplied active state. Both are corrected in migration 17.
- `organization-context.service.ts` requires membership after choosing a header or profile-derived selector; headers are selectors only. Its in-memory repository path and broad catch-and-deny remote lookup behavior are separate from database RLS evidence.

## 2. Phase 1.1 Findings Register

| ID | Finding | Status | Evidence / disposition |
|---|---|---|---|
| F-01 | Profile organization could substitute for membership (migration 12) | Resolved in source | Migration 13 removes profile fallback; migration 14 retains strict membership requirement. |
| F-02 | Multiple eligible organizations could resolve arbitrarily | Resolved in source | Migration 14 accepts a valid selector or a sole eligible membership; ambiguous context returns NULL. |
| F-03 | Stale JWT `SUPER_ADMIN` claim could retain platform authority | Resolved in source | Migration 13 makes active profile flag the sole authority; migration 14 tests old-claim behavior under PGlite. |
| F-04 | Profile self-insert could set admin flags, org, department, or active state | Partly resolved in 14; completed in 17 | Migration 14 strictly requires unassigned profile and false admin flags. Migration 17 forces self-inserted profile inactive. |
| F-05 | Profile audit/provisioning fields could be set on insert/update | Resolved in source | Migration 17 server stamps insert timestamps, clears actor IDs for untrusted insert, rejects updates to created fields/updated actor, and server stamps updated_at. |
| F-06 | SECURITY DEFINER profile trigger could mistake function owner for caller | Resolved in source | Migration 14 changes the security-field trigger to SECURITY INVOKER. |
| F-07 | Permission RPC could enumerate other users | Resolved in source | Model B execution is restricted to `service_role`; PGlite test confirms client denial. Live ACL still unverified. |
| F-08 | Org-admin resolution relied on mutable role names/custom role codes | Resolved with transitional compatibility | Migration 14 restricts role authority to system role codes and documents owner, user_roles, transitional member role and profile flag paths. |
| F-09 | `is_active` could conflict with organization status | Resolved in source | Migration 13 all-DML trigger plus consistency CHECK. Live insert/update behavior still unverified. |
| F-10 | Multiple permissive policies, effective grants, default privileges, forced RLS and deployed migration version | Unresolved | Requires catalog queries on actual PostgreSQL; no live server/CLI was available. Migration source alone cannot prove deployed catalogs. |
| F-11 | Full application test suite | Failed in this environment | The full `npm.cmd test` run showed local listener failures (`connect EACCES 127.0.0.1`) and the existing Supabase integration suite reported `fetch failed`; it did not provide a clean full-suite result. |

## 3. Migration SQL

The complete corrective migration is [20261121000017_protect_profile_audit_fields.sql](../../../supabase/migrations/20261121000017_protect_profile_audit_fields.sql). It has a schema preflight, transaction, no existing-row rewrite, and inline rollback guidance. It is **not applied** to any live database in this environment.

The migration makes self-registered profiles inactive pending controlled provisioning. That is a behavior change: an onboarding flow that requires an active profile must activate it through the trusted provisioning path after completing its checks.

### Migration state and diffs

`git status --short` reported the following Phase 1.1 files as untracked (`??`): migrations `20261121000012`, `13`, `14`, `15`, `16`, and `17`; `supabase/rollbacks/`; `supabase/staging/`; `tests/integration/helpers/`; `tests/integration/security-phase1-postgres.integration.test.ts`; and `tests/integration/security-phase1-1-1-postgres.integration.test.ts`. They are not in Git's index, so Git has no committed migration 12/13/14/17 base against which to produce a conventional diff. I read the complete SQL files directly and preserved all existing workspace changes. No migrations were changed during this final verification pass.

Other uncommitted paths at inspection time were: `package-lock.json`, `package.json`, `src/client/RootApp.tsx`, `src/client/components/onboarding/OrganizationOnboardingWizard.tsx`, `src/client/lib/auth-session.ts`, `src/features/auth/auth.controller.ts`, `src/features/auth/auth.routes.ts`, `src/features/auth/auth.service.ts`, `src/features/auth/components/LoginPage.tsx`, `src/features/auth/hooks/use-auth.ts`, `src/features/organizations/organization-context.service.ts`, `src/features/organizations/organization.schema.ts`, `src/features/organizations/organization.service.ts`, `src/features/organizations/types.ts`, `src/server/db/repository.ts`, `src/server/middleware/auth.middleware.ts`, `tests/organizations.test.ts`, `SECURITY_REMEDIATION_REPORT.md`, `docs/security/`, `src/client/core/`, `src/client/hooks/`, `tests/security-phase1-1-1-correction.test.ts`, `tests/security-phase1-containment.test.ts`, `tests/security-phase1-correction.test.ts`, and `tests/session-recovery.test.ts`.

Filename sequence in this checkout is 1–17 with gaps in timestamp series only between 9 and 10 and 11 and 12; migrations 12, 13, 14, 15, 16, and 17 are all present in order. There is no database connection or migration ledger available here, so **none is confirmed applied**.

## 4. PostgreSQL Integration Test Source

The full current suite is [security-phase1-1-1-postgres.integration.test.ts](../../../tests/integration/security-phase1-1-1-postgres.integration.test.ts); shared harness is [pg-harness.ts](../../../tests/integration/helpers/pg-harness.ts). The harness executes actual SQL and migrations under PGlite roles, but is an embedded engine, not an external PostgreSQL instance or Supabase local stack. The source contains tests for membership authority, inactive membership, cross-tenant reads, role authority, profile inserts, owner membership, self-updates, stale claims, organization lifecycle, RPC ACLs and catalogs. This task added audit-field insertion/update checks and asserts that self-inserted profiles are inactive.

The request's required 20 scenarios have not all been independently evidenced against a live server. In particular, PGlite coverage is not equivalent to actual `authenticated`, `anon`, and `service_role` privileges in Supabase, nor does it establish the deployed schema state.

## 5. Database Verification Output

**Live database SQL/output: not available.** No local DB listener, PostgreSQL client, Supabase CLI, or Docker command was available. No live database query was executed, and no migration is claimed applied. Therefore actual `pg_policies`, `pg_proc`, `pg_namespace`, `pg_roles`, table grants, column privileges, `has_function_privilege()`, triggers, function owners/ACLs, RLS flags, default privileges, and policy permissiveness remain unverified.

The staging structural SQL at [phase1_1_1_structural_verification.sql](../../../supabase/staging/phase1_1_1_structural_verification.sql) was executed by the PGlite integration test, which asserted all returned checks were true. That is embedded-engine output only and must not be represented as staging output. The test also executed the staging behavioral smoke SQL in PGlite and confirmed it left no `SMOKE_%` organizations there.

After applying migrations to a disposable local Supabase database, execute the structural script with `psql` and preserve its full result. Then execute the following catalog queries and record unabridged output:

```sql
SELECT * FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
SELECT p.oid::regprocedure, n.nspname, pg_get_userbyid(p.proowner) AS owner,
       p.prosecdef, p.proconfig, p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public', 'auth') ORDER BY 1;
SELECT rolname, rolsuper, rolbypassrls, rolinherit FROM pg_roles ORDER BY rolname;
SELECT * FROM information_schema.role_table_grants WHERE table_schema = 'public' ORDER BY table_name, grantee, privilege_type;
SELECT * FROM information_schema.column_privileges WHERE table_schema = 'public' ORDER BY table_name, column_name, grantee, privilege_type;
SELECT has_function_privilege('anon','public.get_user_effective_permissions(uuid,uuid)','EXECUTE') AS anon_exec,
       has_function_privilege('authenticated','public.get_user_effective_permissions(uuid,uuid)','EXECUTE') AS authenticated_exec,
       has_function_privilege('service_role','public.get_user_effective_permissions(uuid,uuid)','EXECUTE') AS service_exec;
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r' ORDER BY c.relname;
SELECT t.tgrelid::regclass, t.tgname, pg_get_triggerdef(t.oid), p.prosecdef, p.proconfig
FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal ORDER BY 1,2;
SELECT * FROM pg_default_acl ORDER BY defaclrole, defaclnamespace, defaclobjtype;
```

## 6. Test Execution Output

- `npm.cmd test -- tests/integration/security-phase1-1-1-postgres.integration.test.ts --reporter=dot` — **passed**, 1 file / 59 tests, exit code 0; PGlite embedded engine; most recent run 2026-11-21 12:52 Asia/Manila.
- `npm.cmd test -- --reporter=dot` (with loopback permission) — **passed**, 29 files / 475 tests, exit code 0, duration 12.63s. Two existing RPC fail-closed tests emitted expected stderr for simulated missing-RPC and timeout cases; the tests passed.
- An earlier `npm.cmd test -- --reporter=verbose` without loopback permission failed with `connect EACCES 127.0.0.1` and unreachable configured PostgreSQL/Supabase integration (`fetch failed`). This earlier environment-limited run was superseded for application unit/API test outcomes by the successful elevated run above, but it does not establish a live database connection.
- `npm test` initially could not start because PowerShell blocked the `npm.ps1` script under its execution policy. `npm.cmd` was used thereafter.

## 7. Residual Risk Register

| Risk | Severity | Exploitability / impact | Required phase |
|---|---|---|---|
| No execution against the actual Supabase/PostgreSQL target; actual grants, policies and applied migration version unknown | Critical | Deployment drift or role inheritance can invalidate source-level conclusions | Phase 1.1 release gate: run against disposable local Supabase and staging, capture catalogs and behavior |
| Full test suite has environment failures | High | Middleware/API regressions remain unevaluated because local listeners are denied and remote DB is unreachable | Phase 1.1 release gate: rerun in an environment with permitted loopback and configured database |
| Transitional organization-admin authority remains in `organization_members.role_id` and `profiles.is_organization_admin`; `user_roles` assignment status is not represented | Medium | These remain additional mutable authority sources; migration 14 documents them and limits role path to active SYSTEM roles | Later RBAC consolidation, not Phase 1.1 containment |
| Self-registration now results in an inactive profile | Medium operational | Existing onboarding must use trusted activation after invitation/provisioning checks | Update/verify the intended provisioning workflow before deployment |
| New function default EXECUTE grants depend on PostgreSQL defaults; migration does not set schema-wide default privileges | Medium | Future SECURITY DEFINER functions may be executable by PUBLIC absent explicit revokes | Staging catalog/default-privilege review and a separately approved least-privilege default policy |
| Public `POST /api/auth/register` bypasses the new inactive self-registration rule through service-role provisioning, issues an active/admin profile, and creates no organization membership | Critical | Route accepts public registration; a successful response is returned, but strict membership authorization then denies normal tenant access. No invitation validation is visible before service-role profile elevation. | Correct the registration/provisioning workflow in a separately reviewed change: validate invitation and organization, validate same-organization department and role, atomically create membership and profile, activate only at the approved step, and return success only after all writes commit. |
| Public `/api/organizations/onboarding` provisions only in-memory organization/profile data and mirrors the organization only; it does not create Supabase Auth user/profile/membership records | High | Production process restart loses the in-memory records; organization admin onboarding cannot be established in PostgreSQL from this route as written | Persist the complete provisioning transaction through a trusted service and test it against PostgreSQL. |

## 8. Deployment and Rollback Instructions

No production deployment was performed. The local startup attempt was limited by missing prerequisites: there is no Supabase CLI (`supabase`), Docker (`docker`), or PostgreSQL client (`psql`) executable, and no service listening on the configured ports. The project config declares local PostgreSQL 17 on port 54322. To perform the required verification, install and start Docker Desktop, install Supabase CLI, then use a disposable database only (`supabase start`, followed by `supabase db reset` from the project root). `supabase db reset` is destructive to local database data; do not use it against a non-disposable database. Preserve all CLI output, check `supabase migration list --local`, then run the structural and behavioral scripts on that local PostgreSQL instance.

Before any staging deployment, review the inactive self-registration behavior with the provisioning owner, apply through the project's approved migration pipeline, and verify the migration ledger and catalog output. Do not deploy to production as part of this review.

If rollback is needed, use the reviewed SQL at the bottom of migration 17 to drop its trigger and function in a transaction. This restores prior client control of profile audit columns. Migration 17 changes no existing rows, so no data rollback is needed. Do not roll back migrations 13/14 to restore known vulnerabilities.

## 9. Final Recommendation

**Reject Phase 1.1 approval for now.** The application suite passes (29 files / 475 tests), and the embedded SQL suite passes (59 tests), but actual PostgreSQL integration runs and live catalog output are unavailable. The public registration path is also incompatible with the migration 17 expectation: it uses service-role writes to create an active admin profile without a membership and without invitation validation; the second onboarding path is only in-memory. Reconsider after the trusted provisioning flow is corrected and tested, migrations 1–17 are applied to disposable local Supabase with a verified ledger, and staging catalog/behavior evidence is captured.
