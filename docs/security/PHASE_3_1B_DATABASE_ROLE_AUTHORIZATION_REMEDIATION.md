# Phase 3.1B — Database Role Authorization Boundary Remediation

**Work type:** Implementation and local review preparation  
**Reviewed:** 2026-11-21 (Asia/Manila)  
**Determination:** **NOT READY**  
**Remote migration applied:** No  
**Production approval:** **Not granted**

## Executive summary

Phase 3.1B adds a forward-only migration (migration 21) to close the role-assignment boundary gaps found in the Migration 20 review. The remediation layers role validation in the service, request controller, in-memory repository methods, PostgreSQL triggers, invitation validation, and RLS. It preserves the authorized first-owner `TENANT_ADMIN` assignment and leaves migrations 1–20 untouched.

The available local verification is useful but does not establish PostgreSQL deployment readiness: the database integration suite runs on PGlite, the host has no `psql`, `pg_ctl`, or Docker runtime for a real two-session test, and no external Supabase project was verified or queried. The required concurrent assignment/role-code-change behavior therefore remains unverified on PostgreSQL. The new migration must receive a real PostgreSQL development review and concurrency run before it is applied.

## Root cause and authorization model

The authorization gap had multiple sources:

- Migration 10's `user_roles` and `organization_members` write policies authorized by organization-admin status but did not require a same-organization, active, custom role on the resulting row.
- Migration 20 rejected a small set of SuperAdmin spellings on role-id writes, but did not cover the full protected-role policy, all whitespace, role scope changes, or the trusted onboarding exception as a distinct path.
- The role service and controller had inconsistent actor context and role validation. The controller did not pass `userId` into create/update service calls, so service-level self-assignment rules could not reliably operate through HTTP.
- A repository seeded a platform `SUPER_ADMIN` role assignment despite platform authority being profile-based.

The authority model is: `profiles.is_super_admin` (and the active-profile check in `public.is_super_admin()`) is the platform SuperAdmin authority. Role records and `user_roles` do not confer that authority. Ordinary organization-role assignment cannot use any protected code in the canonical set below. `TENANT_ADMIN` remains a system role for the trusted first-owner provisioning transaction only; it is not platform SuperAdmin authority.

Migrations 13/14 already corrected `public.is_super_admin()` to use the active profile flag; migration 21 does not redefine it. This source review confirms the later function definition takes precedence over the earlier migration 12 JWT claim implementation. Migration 21's assignment triggers independently reject protected role codes regardless of actor, including platform SuperAdmins using ordinary assignment paths.

## Canonical protected-role policy

The shared application helper strips whitespace, underscores, and hyphens, then uppercases. The database migration implements the equivalent normalization with `upper()` and removal of POSIX whitespace, `_`, and `-`. The resulting protected set is:

- `SUPERADMIN` (`SUPER_ADMIN`, `SUPER-ADMIN`, and whitespace variants)
- `PLATFORMSUPERADMIN`
- `TENANTADMIN`
- `ORGANIZATIONADMIN`
- `ORGADMIN`
- `ADMIN`

This policy is shared by the frontend dropdown, role service, in-memory repository methods, database assignment helper, triggers, RLS checks, and member-invitation eligibility trigger. PostgreSQL locale behavior for non-ASCII Unicode whitespace is not proven equivalent to JavaScript `\s`; the real PostgreSQL test should include the whitespace characters the product accepts (at minimum space, tab, CR, LF and other POSIX whitespace). Do not broaden one layer without updating the same policy and tests in every layer.

## Changes prepared

### Application and API

- `src/shared/constants/role-security.ts` provides one canonical protected-code set and normalization helper for client/server code.
- `RoleService.createUserRole` and `updateUserRole` reject protected roles regardless of the actor; validate active custom role, matching organization, target membership and resulting references; and prevent organization-admin scope moves and self-assignment.
- `user-role.controller.ts` now passes the authenticated actor `userId` into create and update calls, allowing controller-path self-assignment checks to run.
- The role dropdown filters protected codes using the shared helper. This is usability only; the API and database remain enforcement boundaries.
- In-memory repository assignment methods validate role and membership references. Default data no longer creates a SuperAdmin `user_roles` grant.

### Migration 21 and database boundaries

The CLI-created forward migration is `supabase/migrations/20261121153500_phase_3_1b_database_role_authorization_boundary.sql`. It supplements migration 20 without editing it, and:

- Adds a SQL normalizer and `is_assignable_organization_role(role_id, organization_id)` helper. Eligible ordinary assignments require an active, same-organization `CUSTOM` role whose normalized code is not protected.
- Adds `BEFORE INSERT/UPDATE` guards to `user_roles` and `organization_members`; the guards validate the final role and organization together, reject protected codes, require active membership for user-role rows, and reject ordinary cross-organization moves.
- Takes a `FOR SHARE` lock on the referenced role row during assignment validation.
- Adds a role identity/scope trigger to prevent changing the organization or role type of assigned roles, or renaming an assigned role across the protected-code boundary.
- Adds a member-invitation eligibility trigger so migration 19's `upper(code)` check cannot be bypassed with whitespace aliases at invitation issuance. Migration 19 itself remains unchanged.
- Replaces migration 10's insert/update policies for `user_roles` and `organization_members`. `USING` limits which existing rows an authenticated org admin can target; `WITH CHECK` validates the resulting row and role eligibility. SuperAdmin policy branches do not bypass the database trigger.
- Restricts authenticated owner membership creation/owner-flag changes to service-role provisioning. Existing trusted owner `TENANT_ADMIN` records can be preserved on update only when the current row matches the exact trusted role/membership predicates.
- Keeps existing DELETE policy behavior. Role deletion retains the schema's existing FK semantics: `user_roles` cascade and `organization_members.role_id` becomes NULL. Deactivation leaves assignments in place and prevents new assignments. No cleanup or data rewrite is included.

### Trusted onboarding

Migration 18 is not modified. Its provisioning function remains `SECURITY DEFINER`, has a fixed `search_path`, uses `FOR UPDATE` on the invitation row, and performs organization, department, profile, owner membership, `TENANT_ADMIN` assignment, and redemption update in one transaction. Execute remains granted to `service_role`, not `authenticated` or `anon`. Migration 21 permits the exact active SYSTEM/global `TENANT_ADMIN` role only when the writer is `service_role` and the first-owner/profile/membership conditions match. It requires the resulting profile to be active and `is_super_admin = false`.

Migration 19 is also unchanged. Same-identity retries and different-identity rejection remain intact. The migration 21 invitation trigger adds a database-level active/same-org/custom/non-protected check before an invite can be stored.

## RLS and direct-write review

Both inserts and updates are covered. The update policy's `USING` tests the old row's organization-admin access; `WITH CHECK` tests the resulting organization-admin scope and assignable role (or, for unchanged existing trusted onboarding rows, the narrow preservation predicate). The trigger validates organization and role on the final tuple, so simultaneous role and organization changes are checked together. `organization_members` may retain a NULL role; any non-NULL role must be eligible or an unchanged trusted owner assignment.

The trigger functions are `SECURITY DEFINER` with pinned search paths and fail closed on missing roles, protected codes, invalid scope, or missing active membership. Trigger function `EXECUTE` is revoked from `PUBLIC`, `anon`, and `authenticated`; PostgreSQL triggers invoke them as attached triggers. Policy helper execution is revoked from `PUBLIC`/`anon` and granted to `authenticated`/`service_role`. No new RPC is exposed to clients.

The row lock is intended to serialize role assignment against role-code/scope changes. PGlite cannot prove PostgreSQL MVCC lock/snapshot behavior under two concurrent sessions. A real PostgreSQL test must race the assignment and rename/scope update in both commit orders and assert that no invalid assignment or protected rename can commit.

## Local test evidence

Executed focused suites after the latest migration/test edits:

- `npx vitest run tests/integration/security-phase1-2-provisioning.integration.test.ts tests/user-roles.test.ts` — **23 passed** (12 PGlite integration cases and 11 repository/UI cases).
- `npx vitest run tests/security-phase1.test.ts` — **31 passed** in an earlier focused run covering API/controller authorization cases. A later rerun in the current sandbox was blocked on loopback server setup (`connect EACCES`), so no new result was obtained.
- `npm run build` — completed successfully in an earlier run.

Coverage includes protected spelling/case/separator/ASCII whitespace assignment aliases, direct authenticated insert/update attempts, cross-org role and organization changes, valid custom assignment, role rename/scope/deactivation, first-owner `TENANT_ADMIN` creation with `is_super_admin=false`, profile authority checks, same-identity replay, different-identity rejection, invitation rejection, and HTTP controller actor propagation.

Limitations and gaps:

- These database integration cases use PGlite. They are not live Supabase verification and do not prove PostgreSQL locking or RLS parity in a hosted instance.
- The migration 21 invitation trigger's tab/newline alias rejection should have a dedicated test. Current alias tests exercise assignments; invitation issuance tests cover privileged exact role behavior from migrations 18/19.
- No two-session PostgreSQL concurrency test was run.
- The API/controller suite rerun could not start its loopback test server in the current sandbox (`connect EACCES`); an earlier run passed all 31 tests. The affected PGlite and repository suites were rerun after the invitation-trigger addition.
- The full test suite was not run because it includes writes to an unverified external Supabase project. No external project was inspected or changed.

## In-memory repository risk

The in-memory repository is not a durable authorization boundary. Its repository methods now validate assignment eligibility, but direct mutation of its publicly reachable `userRoles` map or a future code path bypassing those methods can bypass the checks. PostgreSQL triggers/RLS protect only requests that reach PostgreSQL. Track durable repository replacement and encapsulation as a separate remediation; do not claim this migration secures writes that never reach the database.

## Migration strategy and environment requirements

Migration 21 was created with the Supabase CLI migration-creation workflow. Migrations 1–20, including finalized migration 20, were not changed. Preserve history by applying migration 20 followed by migration 21 in order on a verified development project; do not edit, squash, or replace migration 20. No cleanup of existing role assignments is automated. Use the read-only inventory from the Migration 20 pre-deployment review before development application, and review any findings explicitly.

Before applying to development:

1. Positively identify the intended local/development Supabase environment and project reference using the configured CLI project link and project status. Capture the exact project reference and environment in the deployment record; do not infer it from `.env` alone.
2. Confirm the target is not staging/production and inspect migration history to ensure migrations 1–20 are in the expected state.
3. Run the new migration on a disposable/local real PostgreSQL instance and the two-session race test; verify helper ACLs, RLS behavior, M18 onboarding and M19 idempotency.
4. Run the migration 21 invitation-alias test and the focused security suites against that local PostgreSQL instance; inspect role inventory read-only before any deployment.
5. Review SQL syntax/behavior and resulting policies with the database owner before a development apply.

Production approval is **not granted**. Production requires a separate review, explicit environment/data inventory, approved rollout and rollback plan, and successful development/staging evidence.

## Blockers before development application

- Real PostgreSQL migration execution and two-session concurrency verification have not been performed.
- Add and pass a dedicated member-invitation alias test for tabs/newlines (and agreed other whitespace) against migration 21.
- Verify the exact development target and migration history before any apply; no target has been verified in this task.
- Review existing protected assignments with read-only inventory SQL and determine disposition manually; migration 21 intentionally performs no cleanup.

**Final determination: NOT READY.** The code and local tests are prepared for continued review. Do not apply migration 21 to a development database until the blockers above are resolved. Production approval remains **not granted**.

