# PayPulse Phase 1.2 Registration and Provisioning Security

> Archived historical report. Its phase statuses and recommendations are not current; use [`SECURITY_REMEDIATION_MASTER_TRACKER.md`](../../security/SECURITY_REMEDIATION_MASTER_TRACKER.md) for authoritative status. Original report content is preserved below.

**Review date:** 2026-11-21 (Asia/Manila)  
**Scope:** public registration, SuperAdmin organization onboarding, member invitations, membership/RBAC guards, new SQL migrations 18–19.  
**Recommendation:** **REJECT production approval for now.** The remediation is implemented in the workspace and its embedded SQL suite passes, but the full suite still has four expectation failures and no live PostgreSQL/Supabase verification was possible.

## Executive summary

Public registration now requires a SuperAdmin-issued, email-bound, one-use invitation. Organization onboarding links expire after 24 hours and atomically create the organization, initial department, active profile, owner membership, and `TENANT_ADMIN` assignment when redeemed. Organization administrators can create employee invitations only for an active custom role and department in their own active organization. User and organization records are no longer treated as provisioned by the in-memory repository in these production paths.

The product flow follows the clarified requirement: the SuperAdmin creates an onboarding link and sends it to the intended organization administrator. The recipient enters organization details and registers their account. The employee invitation flow remains separate at `/register?token=...`.

## Data-flow analysis

### First organization and owner

1. An authenticated SuperAdmin calls `POST /api/organizations/onboarding-invitations` with the intended administrator email.
2. Express generates a cryptographically random bearer token, stores only its SHA-256 hash through a service-only RPC, and returns a frontend URL. PostgreSQL sets a 24-hour expiration and invalidates an older pending invitation for that email.
3. The invitee submits the token, organization details, and password to public `POST /api/organizations/onboarding`.
4. The service verifies the token and exact email binding, creates or authenticates the Supabase Auth identity, then calls one transaction-backed provisioning RPC.
5. PostgreSQL inserts the active organization, its initial department, profile, owner membership, and `TENANT_ADMIN` assignment, and marks the invitation redeemed. The cache is updated only after database commit.

The SuperAdmin may also use the authenticated `POST /api/organizations` provisioning route, which uses the same invite and atomic provisioning path.

### Existing organization member

1. An authorized organization administrator calls the protected user creation route with name, email, department, and role.
2. PostgreSQL verifies the active actor, active organization, department ownership, and active custom role ownership; owner/system/admin roles are not assignable by tenant administrators.
3. The service returns a single-use, 24-hour registration URL bound to the invited email. No profile or membership is created yet.
4. The invitee registers through `POST /api/auth/register`. The transaction creates/activates only the invited profile, membership, and role assignment. Replay by the same user is idempotent; mismatched email, expired token, revoked role, duplicate membership, or invalid department fails without partial database writes.

### Authoritative data and authorization

Supabase PostgreSQL is authoritative for production authentication context and provisioning. In-memory `DatabaseRepository` records remain useful to tests and local behavior but are not consulted as production authorization evidence: production auth middleware and organization context read PostgreSQL, and permissions fail closed on RPC error. The invitation tables are inaccessible to `anon` and `authenticated`; only service-role operations call the guarded RPCs. Service role is treated as a privileged transport credential, not as proof of actor authority: the RPC checks the actor/invitation itself.

Administrator authority for the invitation flow requires an active user and organization membership with an owner/admin source. Legacy profile flags are still recognized as transitional authority by the current helper only when the user has active membership in the same active organization; profile flags alone do not establish membership. Remove that transitional source in a later migration after legacy data is normalized.

## Changed files

- `supabase/migrations/20261121000018_superadmin_onboarding_invitations.sql`: invitation table, service-only issuance and transactional first-owner provisioning RPCs, preflight checks, and rollback guidance.
- `supabase/migrations/20261121000019_authorized_member_invitations.sql`: member invitation table, authorization helper, constrained issuance, transactional member provisioning, privileges, and rollback guidance.
- `src/features/organizations/organization.schema.ts`, `organization.routes.ts`, `organization.controller.ts`, `organization.service.ts`: token-required public onboarding, SuperAdmin invitation issuance, persistent RPC flow, and post-commit cache synchronization.
- `src/features/organizations/services/client.ts`, `hooks/useOrganizationMutations.ts`, `components/OrganizationMain.tsx`, `src/client/pages/onboarding/StandaloneOnboardPage.tsx`, and `src/client/components/onboarding/OrganizationOnboardingWizard.tsx`: invitation UI/API and token-aware onboarding.
- `src/features/auth/auth.controller.ts`, `auth.service.ts`, `types.ts`, and `components/InvitationRegistrationPage.tsx`; `src/client/RootApp.tsx`: invitation-only member registration and acceptance UI.
- `src/features/users/user.controller.ts`: protected user creation now issues an invitation instead of creating a local profile.
- `src/features/roles/role.service.ts` and `src/features/roles/user-role.controller.ts`: tenant administrators cannot assign a global/system or privileged role, change their own role assignment, or cross organization boundaries.
- `src/server/middleware/auth.middleware.ts` and `src/features/organizations/organization-context.service.ts`: production authorization context comes from PostgreSQL and permission RPC failures deny access.
- `tests/integration/security-phase1-2-provisioning.integration.test.ts`: PGlite transaction, expiry, authorization, replay, and privilege-boundary checks.

## Before and after

| Flow | Before | After |
| --- | --- | --- |
| Public registration | Service role could create an active administrator profile from public input, without membership | Requires a valid email-bound invitation; role and organization come from the invitation |
| First organization | Onboarding wrote in-memory organization/admin records without durable profile/membership provisioning | SuperAdmin-issued 24-hour token redeems through a single PostgreSQL transaction |
| Employee provisioning | User endpoint could create local users independently of durable membership | Admin issues a constrained link; member profile, membership, and assignment commit together |
| Production access | In-memory state could influence authorization context | PostgreSQL-backed checks; failures deny access |

## Compatibility and migration impact

- Existing self-service organization-admin registration is intentionally retired. New organization creation now requires the SuperAdmin invitation flow.
- Existing direct `/api/auth/register` clients must supply a valid member invitation token. This is a deliberate behavior change from the insecure uninvited registration path.
- Existing users are not migrated, disabled, or removed by migrations 18–19. They must already have valid active membership for tenant access. Legacy profile-only authority does not satisfy production membership checks.
- Invitation links are bearer credentials, bound to an email, stored as hashes, single-use, and expire after 24 hours. The current UI returns a link for the SuperAdmin to send; no email delivery integration was added.

## Verification evidence

- `npm.cmd run build`: **passed** (`tsc`, 2026-11-21).
- `npm.cmd test -- tests/integration/security-phase1-2-provisioning.integration.test.ts --reporter=verbose`: **passed**, 1 file / 7 tests. This is PGlite embedded-engine evidence only.
- `npm.cmd test -- --reporter=dot` in the restricted sandbox: **149 failures / 333 passes**, chiefly because local test servers could not bind (`EACCES 127.0.0.1`) and Supabase was unreachable. This run is not a valid code regression signal.
- The same full suite with loopback permission: **478 passed / 4 failed**, 30 test files. Three Phase 1 expectations still assert the retired behavior that `/api/users` creates profiles, and one Phase 5 audit test expects old direct organization creation without the now-required owner credential. These tests need migration to the invitation workflow or equivalent valid provisioning input before approval.
- No local PostgreSQL/Supabase service or CLI was available. No claim of live PostgreSQL verification is made. `tests/integration/security-postgres.integration.test.ts` could not reach its configured Supabase host.

## Remaining risks and deployment

- Run migrations 18 and 19 against a disposable staging PostgreSQL/Supabase database and execute real RLS, grants, rollback, and transaction-failure checks before production approval.
- Complete the four existing regression test updates and rerun the full suite. Add missing source-level/API tests for profile-flag-without-membership denial and onboarding failure compensation where possible.
- Verify each deployed environment has the expected active global `SYSTEM TENANT_ADMIN` role and configured approved frontend origin before applying these migrations.
- Deploy migrations before the application code that uses their RPCs. Do not apply these migrations directly to production as part of this work.
- Rollback guidance is included at the end of each migration. Rollback removes the invitation tables/functions; only after rolling back the application can the invitation-only endpoints be retired. Redeemed organization/member data is not automatically deleted by rollback.

## Final recommendation

**REJECT Phase 1.2 production approval pending** (1) updates to the four obsolete full-suite expectations, (2) passing full regression suite, and (3) real staging PostgreSQL/Supabase verification. The workspace implementation is materially safer and the embedded provisioning tests pass, but these checks do not establish production database behavior.
