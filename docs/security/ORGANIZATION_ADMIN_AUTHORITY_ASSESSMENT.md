# Phase 3.0 — Organization Administrator Authority Assessment

**Assessment date:** 2026-11-21  
**Scope:** Read-only review of checked-in source, migrations, seeds, and tests. No application source, migrations, assignments, permissions, or database records were changed.  
**Recommendation:** **C. Another architecture** — active organization membership gates tenant access; `user_roles` and `role_permissions` grant organization-admin actions; `is_owner` models ownership and must not silently duplicate general role authority; remove profile and membership-role compatibility authority after a verified transition.  
**Deployed database:** Not queried; current deployed definitions and assignments are **NOT VERIFIED**.

## Executive findings

The repository has no single current source for organization administrator authority. The latest checked-in database helper (`is_organization_admin`, migration 14) requires the caller to have an active membership in an active, unexpired organization, then grants the administrator predicate if **any** of these are true: membership `is_owner`; an active SYSTEM administrator code in `user_roles`; an active SYSTEM administrator code in `organization_members.role_id`; or a scoped active `profiles.is_organization_admin` flag. Middleware separately resolves an active membership, then sets its admin context from `membership.isOwner` or the profile admin flag for the profile’s home organization. The membership `role_id` fallback does not participate in that middleware calculation, but it does participate in database authorization.

Provisioning writes redundant role references intentionally: first-owner onboarding writes `is_owner=true`, a SYSTEM `TENANT_ADMIN` to `organization_members.role_id`, and the same role to `user_roles`; employee invitation writes the custom role to both membership `role_id` and `user_roles`. First-owner provisioning sets the profile admin flag false, and new employee profiles also start false; an existing active profile is preserved rather than rewritten by member invitation. This makes new-account provisioning consistent, but does not establish that all deployed records have been synchronized or that the four sources are always equivalent.

`user_roles` has no active, revoked, or expiry field. A role assignment row remains effective until physically deleted, the role is made inactive, or the user’s membership/profile/organization fails validity checks. `organization_members.is_active=false` blocks tenant access and the current SQL admin helper/effective-permission function, even if an admin assignment or profile flag remains. The legacy profile path is therefore not an independent way to enter an organization in the latest code, but it can still grant admin privilege to an active member. The membership `role_id` can similarly preserve admin status after the matching `user_roles` row is removed.

## Authority source matrix

| Authority Source | Grants Admin? | Organization Scoped? | Revocable? | Authoritative or Transitional? |
|---|---|---|---|---|
| `organization_members.is_owner` | Yes in migration 14 `is_organization_admin()`; yes in Express middleware and organization switching; local repository treats owner as full tenant module access. | Yes, stored on `(organization_id,user_id)` membership and only evaluated after active membership validation in latest helper/middleware. | Membership can be updated/deleted by privileged paths. RLS restricts setting it true, but an organization admin can set it false; delete policy blocks direct owner deletion except SuperAdmin. No last-owner protection is visible. | Ownership should be authoritative for ownership itself. Current use as a general administrator grant overlaps role authority. Migration 14 labels it target-authoritative. |
| `user_roles` | Yes when an assignment references an active global SYSTEM role with an admin code; latest SQL helper checks this path. It also supplies durable role permissions. | Yes by `user_roles.organization_id`; current schema does not ensure this equals the role/membership organization with a composite FK. Helper requires active membership in that organization. | Physical deletion is supported by RLS; no assignment active/expiry field exists. Role deactivation also prevents role-derived effective permissions and admin helper recognition. | Intended role-assignment and permission source; likely canonical for organization-admin role authority, but still coexists with fallbacks. |
| `organization_members.role_id` | Yes in current SQL admin helper if it references an active global SYSTEM admin role. It is not used by current auth middleware to set admin status. | Attached directly to organization membership. Current core schema has a simple role FK, not a composite scope FK. | Can be changed through membership update policy and becomes NULL if role is deleted (`ON DELETE SET NULL`). No independent active status; membership active status gates use. | Transitional/compatibility duplicate. Current invitations mirror the assigned role here and in `user_roles`. |
| `profiles.is_organization_admin` | Yes in current SQL admin helper and in Express auth/session context, for a profile whose home organization matches the requested organization. | Profile has one `organization_id`, so it cannot represent different admin flags by membership for users in multiple organizations. Latest helper requires active membership separately. | Profile update policies/trigger constrain changes; administrative workflows may still change it. Membership revocation blocks current helper/context before flag is used. | Transitional compatibility flag. Current invitation provisioning explicitly sets it false; not suitable as multi-organization role authority. |

## Current authority paths

### Database helper and RLS

- The original helper in `supabase/migrations/20261104000002_functions_and_rls.sql:39-52` used the profile flag only. It did not use membership, owner, or role assignments.
- Migration 10 introduced broader helper logic in `supabase/migrations/20261119000010_remediate_database_rls.sql:47-82`, including profile and membership ownership/role checks. It is superseded by migration 14’s function definition in the checked-in migration sequence.
- The migration 14 helper in `supabase/migrations/20261121000014_security_corrections_phase1_1_1.sql:210-265` checks active organization, active membership, and then all four sources. In its role paths it requires an active SYSTEM global role with one of the accepted admin codes. The membership role and user_roles paths can diverge.
- Policies in migration 10 call `is_organization_admin()` for organization data, user/role management, modules, and settings. Membership RLS is also defined there (`:238-283`). Migration 12 (`20261121000012_remediate_critical_containment.sql:251-263`) narrows raw membership insertion so organization admins cannot set `is_owner=true`; it does not remove the helper’s owner authority. The exact effective policy set on a deployment depends on which migrations actually ran.
- `get_user_effective_permissions` in migration 14 (`:393-503`) requires active organization membership, active profile and organization, and an active in-scope department; derives role permissions from `user_roles` and direct grants from `user_permissions`; and applies module/department eligibility. It does not use `organization_members.role_id` as a permission assignment or grant permissions based on `is_owner`/profile admin. The separate `is_organization_admin` helper can still authorize broad RLS operations outside this permission calculation.
- The earlier audit-log policies/functions in migration 3 (`20261104000003_audit_logs.sql:422-445`) directly checked profile flags, ownership, and role references. Migration 11 hardens audit attribution and policy definitions, but source history indicates these are not all one centralized authority path. Verify deployed `pg_policies` and function definitions before any transition.

### Express authentication, context, and guards

- `src/features/organizations/organization-context.service.ts:187-256` validates a target membership and rejects missing/inactive memberships. In production it fetches `organization_members`; profile organization or token claims are not membership proof. `:281-340` resolves the selected organization, validates membership (except platform SuperAdmin), and checks organization status/expiration.
- `src/server/middleware/auth.middleware.ts:184-202` loads profile flags from PostgreSQL when not in local/test mode. It then resolves organization context (`:268-288`) and sets `isOrganizationAdmin` and `isTenantAdmin` from `membership.isOwner` or the profile flag when `profile.tenantId` equals the validated organization. It does **not** query `user_roles` for this boolean. An active role-only administrator may therefore have SQL admin authority without the same Express admin flag unless another path or token supplies it.
- Organization switching in `src/features/auth/auth.service.ts:430-478` requires active membership for non-SuperAdmins, then sets the new token’s tenant-admin boolean from owner status or the profile flag scoped to the profile’s home organization. It does not grant admin based on that organization’s `user_roles` row.
- `src/server/middleware/rbac.guard.ts:105-123` checks the derived `req.user.isTenantAdmin` boolean or SuperAdmin status. `requireTenantAdmin` / `requireOrganizationAdmin` aliases are also exposed in `src/server/middleware/auth.middleware.ts:64-80`.
- The role assignment service (`src/features/roles/role.service.ts`) is currently in-memory. Its create/reassign paths check supplied actor flags, role type/code, profile tenant, and self-assignment (`:440-540`); they do not establish durable database authority. No service implementation found here provides authoritative membership lifecycle management.

### Invitation provisioning and frontend

- First-owner provisioning in `supabase/migrations/20261121000018_superadmin_onboarding_invitations.sql:140-201` requires the canonical active global SYSTEM `TENANT_ADMIN`, then atomically inserts a profile with admin/super flags false, membership with `role_id=TENANT_ADMIN`, `is_owner=true`, `is_active=true`, and a `user_roles` row for the same role. This is direct evidence that ownership and assigned admin role are modeled separately but co-granted for the initial owner.
- Employee invitation in `supabase/migrations/20261121000019_authorized_member_invitations.sql:47-89,98-150,161-230` authorizes the inviter via the broad helper; permits only active same-organization CUSTOM roles; and creates an active non-owner membership plus `user_roles` assignment. Profile admin remains false for newly created profiles. This is an invitation-controlled creation path, not a general membership suspension/revocation service.
- Frontend navigation primarily gates items with permission keys (`src/client/components/layout/sidebar.tsx:100-149,225-278`), rather than proving role authority. `src/client/RootApp.tsx:81` displays an admin label from `isTenantAdmin`. UI visibility is not an authorization boundary.

## Membership lifecycle

| Lifecycle event | Checked-in behavior | Security implication |
|---|---|---|
| Membership creation | Migration 18 creates the first owner membership and paired role assignment. Migration 19 creates employee memberships only from valid invitations and pairs `organization_members.role_id` with `user_roles`. Migration 3 originally backfilled membership rows from profiles/user_roles and derived `is_owner` from profile admin/super flags (`20261104000003_audit_logs.sql:33-49`). | Provisioning is atomic in current invitation flows; legacy backfill may have materialized profile flags into owner status. |
| Activation | New invitation memberships start `is_active=true`. Schema defaults active. No separate member-activation service was found. | Active membership is the essential tenant-context gate. |
| Suspension | Membership RLS allows organization admins to update membership rows; the `WITH CHECK` rule blocks non-owners from setting `is_owner=true`, but allows them to set it false (`20261119000010_remediate_database_rls.sql:254-272`). No durable Express member suspension workflow was found. | If `is_active=false`, latest helper/context and effective permission function deny ordinary tenant use even if role/flag data remains. |
| Revocation | Membership RLS allows deletion of non-owner rows by an org admin and owner-row deletion by SuperAdmin (`:274-283`). The in-memory repository has update/delete methods (`src/server/db/repository.ts:1245-1263`) but no production PostgreSQL service was found here. | Deleting membership blocks ordinary access but leaves `user_roles` rows unless explicitly cleaned. The role rows have independent FKs and can persist. |
| Owner grant/removal | Onboarding sets owner true; raw authenticated insertion is restricted so admins cannot create owner memberships. Update policy blocks a non-owner from promoting a row to owner, but permits an organization admin to demote an owner by setting `is_owner=false`. Delete policy blocks direct org-admin deletion while the row is still an owner; SuperAdmin can delete it. | No invariant limits an organization to one owner; no last-owner/last-admin lock is present. A tenant admin can demote the last owner, then remove that membership. |
| Organization switching | Active membership is validated for the selected organization. Admin boolean is then recomputed from that membership’s owner bit or the single profile-home-org flag. | Switching itself does not transfer an admin role; profile flags are not organization-multi-scoped and role-only admin may diverge between DB and Express. |

The in-memory profile repository defaults to creating a membership and sets `isOwner` from `isTenantAdmin || isSuperAdmin` (`src/server/db/repository.ts:1152-1204`). Hydration from Supabase explicitly opts out of this synchronization. Treat these fixture/local semantics separately from production provisioning.

## Role assignment lifecycle

The base `user_roles` definition in `supabase/migrations/20261104000001_core_schema.sql:225-237` has `organization_id`, `user_id`, `role_id`, assignment timestamp/actor, and primary key `(organization_id,user_id,role_id)`. It has **no active flag, revoked timestamp, expiration, or history table**. Assignment rows are physically removed to revoke; making the referenced role inactive also disables role-derived permissions/admin-code checks. Membership inactivity separately gates the user. Role deletion cascades the `user_roles` row; `organization_members.role_id` uses `ON DELETE SET NULL`.

There is no distinction between an assigned-but-inactive and active `user_roles` row because no such state exists in the schema. Consequently, one cannot infer active admin assignment merely from a row when the user has no active membership, inactive profile/role, or inactive/expired organization. Historical assignment records are not preserved by the base table when deleted. Direct RLS writes can physically delete rows; the in-memory role service does likewise in its repository. No supported, durable Express database revocation operation was found in `src/features/roles`.

## Required security scenarios

| Scenario | Current behavior inferred from checked-in source | Risk / verification need |
|---|---|---|
| Admin role revoked while membership remains active | Deleting `user_roles` removes that path, but a matching active SYSTEM role in `organization_members.role_id`, owner bit, or profile flag can keep `is_organization_admin()` true. | Revocation does not necessarily demote; test each fallback and remove/synchronize it under a controlled workflow. |
| Membership suspended while admin role remains assigned | Latest SQL helper, context validator, and effective-permission function require active membership; the user_roles record alone does not grant access. | Fail-closed provided deployed function/policy matches current source. Role row remains. |
| Profile admin flag remains true after membership revocation | Latest DB helper requires active membership before considering profile flag; middleware rejects inactive/missing membership before deriving admin status. | Flag is latent stale authority if membership is reactivated; ensure profile flag is cleared/deprecated. |
| Owner loses administrator role | `is_owner` independently grants current SQL and middleware admin authority. | Role removal alone does not demote owner. Whether owners should retain broad admin power is a business decision. |
| Organization has multiple owners | Schema allows multiple owner memberships; no uniqueness constraint or last-owner guard was found. | Removal of one owner may be safe if another exists; concurrent removal of all owners/admins is not protected by the inspected policies. |
| User belongs to multiple organizations with different roles | Membership rows are organization-scoped and can differ; role permissions resolve by requested organization. Profile admin flag/profile organization are single-valued and cannot accurately encode different roles. | Middleware’s profile-admin path is home-organization-only; owner path is membership-specific; SQL role path is organization-specific. Keep profile flag out of final model. |
| User switches organizations | Active target membership and organization status are validated. Request admin flag is recomputed but only from owner/profile sources, not user_roles. | Express and SQL admin authority can disagree for role-only admins or multi-org users. |
| Tenant administrator is demoted | Current service may delete/reassign in-memory only. Database direct writes can delete role rows, but mirror/owner/profile sources may preserve access. | No durable transactional demotion workflow or cache invalidation evidence in this feature service. |
| Last active administrator is removed | No last-admin check/lock in inspected membership or role RLS policies; helper simply evaluates current sources. | Could strand an organization; race-safe last-admin protection is required before implementing revoke operations. |

## Recommendation and target architecture

**Recommendation C — another architecture:**

1. Every organization operation requires an active, organization-scoped membership and an eligible organization.
2. `user_roles` plus `role_permissions` is the sole general organization-admin *role* authority. Database checks should resolve it for the requested organization from committed rows; no profile flag or membership role mirror should independently grant that role authority.
3. `organization_members.is_owner` remains an ownership attribute. The business must define whether ownership itself carries any narrow owner-only operations. General organization-admin actions should be represented by the explicit `TENANT_ADMIN` assignment (or approved custom admin role) so owners can be distinguished from administrators and safely demoted without changing ownership.
4. Retire `organization_members.role_id` after migration/verification because it duplicates `user_roles`; keep membership identity, department, active status, and owner status in `organization_members`.
5. Retire `profiles.is_organization_admin` as an authorization input. It is single-organization state, conflicts with multi-org membership, and is already false in current invitation provisioning.
6. Add a durable transactional membership/role management workflow with last-active-admin and last-owner safeguards as approved; do not allow raw service-role bypass to stand in for authorization.

This recommendation preserves the observed first-owner provisioning intent: the first owner is given both ownership status and an explicit `TENANT_ADMIN` role. It makes their distinct meanings explicit instead of treating either as a hidden substitute. If product policy instead requires every owner always to be an administrator, that invariant should be stated and tested, rather than inferred from the current OR logic.

## Migration dependencies and risks

- Inspect deployed `pg_proc`, `pg_policies`, grants, table columns, constraints, and role/assignment counts first. Source migrations do not establish deployment state.
- Inventory users/organizations affected by each authority path and duplicates across user_roles, membership role_id, owner flag, and profile flag. Do not reveal personal data in the inventory.
- Decide owner-only semantics and what qualifies as an active administrator/owner before removing fallbacks.
- Snapshot effective permissions and authority outcomes before and after any proposed migration. Preserve role references until both assignment tables and invitation records are accounted for.
- Backfill or repair mismatches explicitly; do not silently set/clear flags or delete assignments. Include rollback procedure and staged compatibility period if needed.
- Composite scope constraints are absent in the base schema; role IDs in both assignment paths need same-organization/SYSTEM-aware validation.
- Last-admin and last-owner revocation must lock organization authorization state and be concurrency safe.
- No database was queried. Assignment counts, deployed status, actual migration level, and live permission outcomes are **NOT VERIFIED**.

## Required tests before implementation

- Database authority matrix for each of the four sources, with active/inactive membership, organization expiry/suspension, role active/inactive, and role scope cases.
- Verify role revocation while membership remains active, including stale membership `role_id`, owner bit, and profile flag.
- Verify membership suspension/deletion blocks API and effective permissions even when `user_roles` remains; reactivation behavior must be explicit.
- Verify owner-only behavior and multiple-owner transitions; reject removal of the last authorized administrator/owner, including concurrent removals.
- Multi-organization user with different admin/member roles: switch context and compare middleware, SQL helper, RLS, and effective-permission outcomes.
- Ensure profile admin flag cannot grant authority after final transition and profile updates cannot elevate users.
- Direct authenticated RLS operations and service-role RPC operations for assignment/revocation; test actor identity and tenant boundaries.
- Transaction rollback, durable persistence, cache update only after commit, immediate permission revocation, and audit trail.
- Staging verification against deployed schema; PGlite results alone must not be represented as live PostgreSQL verification.

## Unresolved business decisions

1. Does ownership inherently include general organization-administrator capabilities, or only ownership/continuity operations? Current onboarding assigns both owner and `TENANT_ADMIN`, but SQL treats owner alone as admin.
2. Can organizations have multiple owners, and who can transfer/remove the final owner?
3. What precisely counts as the final active administrator: only active `TENANT_ADMIN`, any role with a defined admin permission, owner, or a combination?
4. Are profile admin flags and membership `role_id` still needed for any deployed integration, or are they purely compatibility paths?
5. Is role revocation expected to preserve an audit/history record, and if so, what retention model should replace physical deletion?
6. Which database environment is approved for read-only inventory, and what migration set is actually deployed there?

## Final decision

**C. Another architecture**, as described above. `organization_members.is_active` is the required membership gate; role/permission rows should be the explicit authority for general administrator actions; ownership should remain separately modeled with documented semantics; the membership role mirror and profile admin flag should be retired only after deployed inventory and approved migration planning. This is an architectural recommendation, not an implementation or approval to migrate. No normalization or Phase 3.1 work was performed. The master phase tracker was not changed.
