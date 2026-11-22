# Phase 3.1 — SuperAdmin Role Assignment Security Remediation

**Status:** Implemented and locally verified.  
**Production approval:** Not granted.  
**Migration scope:** Forward-only migration 20. Migrations 1–19 are unchanged.

## Root cause

`RoleService.createUserRole` and `updateUserRole` guarded role scope and privileged role codes only inside `actor && !isSuper`. A platform SuperAdmin therefore bypassed validation for every SYSTEM role and for privileged role-code aliases, and could assign the seeded `SUPER_ADMIN` role through the ordinary user-role API. The UI compounded this by keeping SYSTEM roles in the organization assignment dropdown; the fallback role list included `SUPER_ADMIN`.

The intended platform authority is `profiles.is_super_admin`. A `roles` row is not a grant of platform authority and must not be used to assign that authority through ordinary organization membership or user-role paths.

## Accepted invitation security design

Migrations 18 and 19 are accepted as designed and were not modified. Provisioning locks each invitation row with `SELECT ... FOR UPDATE`, validates it, writes provisioning records and marks redemption in the same transaction. A different identity is rejected after redemption. A retry by the same identity returns the already-provisioned result without provisioning twice; this is an intentional idempotency exception to single-use provisioning, not a second redemption. The existing expiry, invited-email checks, and migration 19 role eligibility checks remain in place. Migration 18's first-owner path continues assigning `TENANT_ADMIN` while setting `profiles.is_super_admin = false`.

## Affected components and changes

- `src/features/roles/role.service.ts`: validates platform-protected role codes for every actor, including SuperAdmins, before create and update writes. Update checks the assignment's resulting role even when the request changes only another field. Legitimate organization-scoped custom roles remain assignable. SuperAdmins retain their existing cross-organization scope behavior for non-protected roles.
- `src/features/roles/components/UserRoleFormPage.tsx`: organization role choices now include only custom roles belonging to the selected organization and exclude protected platform role codes. This is UI filtering only; the service and database enforce the boundary.
- `src/features/roles/user-role.routes.ts` and `user-role.controller.ts`: existing authenticated POST/PUT endpoints continue routing through the guarded service. No bypass endpoint or alternate role write RPC was found in the current checked-in app. API regression tests exercise direct POST/PUT requests.
- Role dropdown source: `/api/roles?organizationId=...` is read by `UserRoleFormPage`; legacy/default role data also contains SYSTEM roles. The final organization selector now filters both sources to organization-scoped custom roles.
- `supabase/migrations/20261121000020_separate_superadmin_role_authority.sql`: adds database triggers rejecting `SUPER_ADMIN` and explicit platform-SuperAdmin aliases on direct writes to `user_roles` and `organization_members`, and prevents renaming an already assigned role to those aliases. Assignment checks lock the referenced role row while reading its code. The trigger is role-code specific and leaves migration 18's `TENANT_ADMIN` onboarding assignment intact. The SQL tests cover direct writes and the pre-existing onboarding suite covers the authorized RPC path.

The repository's ordinary role-management service currently writes through its in-memory repository, not a Supabase RPC. No general role-assignment RPC appears in the checked-in migration chain; the invitation provisioning functions in migrations 18 and 19 are the SQL assignment paths. The database trigger therefore protects direct database writes and any future database-backed path; it does not make the current in-memory service durable. The canonical SQL `public.is_super_admin()` function in migration 13 reads the active caller's `profiles.is_super_admin` flag, and auth middleware hydrates its `isSuperAdmin` value from the profile record.

## Migration requirements

Apply migration 20 only after reviewing its source and confirming a development/staging target. Do not reset Supabase, edit migrations 1–19, or deploy this migration to a remote database as part of this work. No data cleanup is included. Existing unauthorized `SUPER_ADMIN` assignments, if present in a database, require a separate read-only inventory and reviewed remediation; the migration prevents new assignment writes and unsafe code renames.

## Security test results

Pending execution in this workspace. Planned evidence:

1. SuperAdmin POST cannot assign `SUPER_ADMIN`.
2. SuperAdmin PUT cannot change an existing assignment to `SUPER_ADMIN`.
3. Organization Admin POST cannot assign `SUPER_ADMIN`.
4. Organization Admin cannot assign other privileged codes, including an organization-scoped `ORG_ADMIN` alias.
5. A valid organization custom-role assignment succeeds.
6. Existing Phase 1.2 first-owner provisioning still assigns `TENANT_ADMIN` and marks the profile `is_super_admin = false`.
7. Tests assert platform authority comes from the profile flag and direct role writes cannot grant it.
8. Direct API POST/PUT tests ensure client requests traverse the service guards.
9. Existing same-identity idempotency and different-identity rejection tests for migrations 18 and 19 remain unchanged and must pass.

**Results:** Focused API and PGlite regression run passed: 2 files, 37 tests. This includes 29 API security tests, 8 Phase 1.2 provisioning SQL tests (same-identity retry/different-identity rejection and first-owner `TENANT_ADMIN` flow), and direct database attempts against both assignment tables. `npm run build` passed (`tsc`). No live database migration was applied or checked in this task.

The full `npm test` suite was not run. The existing full suite includes a configured Supabase integration test that performs service-role writes, while the repository's Phase 3.1 preflight documents that the configured project environment and fixture cleanup are not verified. Running it here would cross into an unverified external database. No full-suite pass is claimed.

## Remaining risks

- The application service uses in-memory role data in this repository; the SQL migration does not retrofit that repository into a durable transaction boundary.
- `service_role` and database owners can disable triggers or alter schema. Operational control of privileged database credentials remains necessary.
- Existing database assignments are not automatically deleted. Inventory the target before applying any follow-up cleanup.
- The checked-in API and PGlite evidence does not verify a deployed database's migration ledger, trigger state, grants, or data.

## Recommendation

Review the code, migration 20, and test evidence before applying it to development. Confirm the development database inventory and migration target, then apply and verify the forward migration there. Production approval remains separate and is not granted by this remediation.
