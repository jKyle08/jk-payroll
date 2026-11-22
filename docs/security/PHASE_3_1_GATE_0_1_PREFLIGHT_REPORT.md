# Phase 3.1 Gate 0–1 Preflight Report

**Date:** 2026-11-21 (Asia/Manila)  
**Phase status:** Gate 0 source review complete; deployed database preflight **NOT VERIFIED / BLOCKED**. Gate 1 test alignment **PASS**.  
**Production approval:** Not granted.  
**Scope:** Repository review and test updates only. No application authorization code or SQL migration was changed.

## Executive summary

The checked-in source confirms the Phase 3.0.2 gaps remain. The schema has no user-only unique membership constraint or profile/membership association invariant. Migration 14 and invitation helper migration 19 retain owner and legacy role-code admin bypasses. Express derives organization admin from owner/profile state and applies the broad tenant-admin guard to user and role-management routes. Functional role operations still use the in-memory repository. The first-owner onboarding SQL sets `is_organization_admin = false` while setting `is_owner = true` and assigning `TENANT_ADMIN`, so removing legacy admin sources without an onboarding decision would leave newly onboarded owners without Organization Admin authority.

The configured Supabase project was not established to be disposable staging or production-safe for the requested inventory. The full test suite's real Supabase integration file successfully used its service-role client to insert a disposable organization and audit record; its `afterAll` cleanup is best-effort and does not check returned delete errors. Treat cleanup status and the environment classification as **NOT VERIFIED**. No profile, membership, role, permission, policy, grant, function, or migration-ledger inventory was queried. Do not proceed with schema or authorization changes until a staging target and read-only inventory access are confirmed and results reviewed.

## Gate 0 — repository and database preflight

### Checked-in findings

- `profiles.organization_id`, `is_super_admin`, and `is_organization_admin` already exist. Do not add duplicate admin booleans.
- `organization_members` has `UNIQUE (organization_id, user_id)`, which does not prevent one user from having memberships in different organizations. There is no checked-in unique constraint on `organization_members.user_id`.
- The profile and membership organization references are separate; no checked-in composite constraint guarantees they agree. `user_roles`, `role_permissions`, and `user_permissions` likewise need relational scope review before a hardening migration.
- Migration 14's `is_organization_admin(uuid)` can authorize via owner flag, admin-coded SYSTEM `user_roles`, legacy `organization_members.role_id`, or the profile flag (with active membership/lifecycle checks). Migration 19's `is_active_org_admin_for_user` duplicates transitional owner/role/profile sources for privileged invitation calls.
- Migration 18 first-owner provisioning creates an owner membership and SYSTEM `TENANT_ADMIN` assignment, but writes `profiles.is_organization_admin = false` and `profiles.is_super_admin = false`. Under the approved target authority this is not an Organization Admin unless a separate controlled promotion occurs.
- Migration 19's member invitation issuance uses transitional admin sources. Redemption locks only the invitation row and checks existing membership only in the invited organization. It does not serialize different invitations for the same user or reject an existing membership in another organization. A user-only unique constraint plus identity-level locking is needed as a race-safe backstop.
- `auth.middleware.ts` derives `isTenantAdmin` from `membership.isOwner` or the profile flag; `organization-context.service.ts` permits a requested organization header when membership exists; `auth.service.ts` contains an organization-switch flow. These conflict with no-switching and canonical authority requirements.
- `requireTenantAdmin` is used on user creation and direct permission endpoints, and role routes use tenant-admin checks. Those broad guards conflict with the new rule that Organization Admin alone authorizes only organization profile/settings edits.
- `role.service.ts` uses `db` repository reads/writes for role assignments and scoped actor checks. Durable Supabase-backed role/permission transactions and cache invalidation are not established by this service.
- Profile RLS and migrations 13/14 triggers restrict authenticated profile flag mutation, but service-role/database-owner bypasses are explicit. Deployed ACLs, trigger state, policies, and all privileged writer paths remain unknown.
- The repository migration chain ends at migration 19. No migration ledger or actual deployed function/grant definition was inspected. Source files are not deployment evidence.

### Deployed-state findings

**NOT VERIFIED:** profile flags, duplicate memberships, profile/membership mismatches, orphan role assignments, role/permission grants, owners, pending invitations, organizations without active admins, RLS policy combinations, function definitions/ACLs, triggers, grants, and actual migration version. The full-suite remote integration test is not an inventory and did not establish the configured project's environment classification.

### Migration prerequisites and risks

1. Run the required read-only inventory on a confirmed disposable staging project. Save migration ledger, schema/constraint catalog, actual policies, function definitions/config/ACLs, trigger state, role attributes, grants, and data summaries.
2. Report and manually reconcile duplicate memberships, association mismatches, orphan assignments, role aliases, pending invitation conflicts, owner/admin conflicts, and organizations without an active profile-flag Admin. Do not auto-promote, delete, or reassign.
3. Decide membership-history semantics before choosing full `UNIQUE(user_id)`: under the strict lifetime rule this disallows inactive historical membership rows for another organization too. If audit history must be retained, move history to a separate append-only record; do not weaken the constraint with a partial index without a policy decision.
4. Decide whether the SuperAdmin-issued first-owner onboarding invite itself promotes a new profile to Organization Admin. Existing migration 18 writes the flag false; changing this to true is a privileged promotion decision and must be explicit and audited.
5. Decide who may issue member invitations. The approved restriction prohibits Organization Admin from managing invitations; migration 19 currently grants invitation issuance through transitional admin sources. Any new authority (SuperAdmin-only or a delegated functional permission) must be explicit.
6. Derive safe composite constraints for memberships, roles, role permissions, and direct grants only after data review. Existing inconsistent rows may cause a preflight failure. A migration must abort without cleanup if violations remain.
7. Protect the last active Organization Admin with one transaction-serialized operation and a deliberate recovery route. Define eligibility counting (active profile, active membership, active organization) and emergency behavior.
8. Confirm the integration test target and inspect the `TEST_INT_ORG_*` fixture and associated audit rows read-only before any migration work. Do not manually delete any test rows without authorization.

## Gate 1 — Phase 1.2 regression tests

### Changes made

- Updated the Phase 1 security tests around the member-invitation endpoint: privileged fields are rejected, regular users cannot issue invitations, public registration rejects client-supplied authority/organization selectors, and no profile is created by invalid public registration.
- Updated the Phase 5 SuperAdmin audit test to assert that authenticated organization creation requests an onboarding invitation and redeems it through the invited-onboarding operation before recording the SuperAdmin audit actor.
- No test was skipped, disabled, or weakened. Existing Phase 1.2 PGlite tests still cover token issuance, invitation provisioning, expiry, replay, and RPC privileges.

### Test evidence

- Baseline full suite before test changes, with loopback access: **30 files passed; 482 tests passed**. The sandbox-only attempt was invalid as a regression signal: loopback binding failed and remote calls timed out.
- Focused after-change run: **3 files passed; 62 tests passed** (`security-phase1`, `security-audit-integrity-phase5`, and `security-phase1-2-provisioning.integration`).
- Full suite after changes: **30 files passed; 482 tests passed**.
- The full suite includes `tests/integration/security-postgres.integration.test.ts`. That test inserts a disposable organization and audit row through service role. Cleanup is best-effort and does not validate returned deletion errors. This is limited integration evidence, not the requested read-only preflight or live migration/RLS verification.
- No application build was needed for test-only edits. No migration was applied.

## Gate status and next action

| Gate | Result | Reason |
|---|---|---|
| Gate 0: repository review | PASS (source only) | Checked-in implementation and migration gaps documented. |
| Gate 0: deployed database inventory | NOT VERIFIED / BLOCKED | Configured project is not confirmed as staging; no authorized read-only inventory was run. Integration fixture cleanup is unverified. |
| Gate 1: update four legacy expectations | PASS | Test expectations now exercise invitation issuance/provisioning semantics. |
| Gate 1: full suite | PASS | 482/482 tests passed. |
| Gates 2–8 | NOT STARTED | Require review of this preflight, confirmed staging inventory, and decisions listed above before source/schema changes. |

**Approval/input needed to continue:** identify or provide a confirmed disposable staging Supabase/PostgreSQL target with read-only inventory access, and authorize read-only verification of any remaining `TEST_INT_ORG_*` fixture rows. Do not provide service-role credentials in chat. Once inventory is available, review conflicting rows and the listed invitation/first-owner/lifecycle decisions before preparing migrations.
