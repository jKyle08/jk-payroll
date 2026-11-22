# Phase 3.0.2 — Single-Organization Authorization Architecture and Authority Consolidation

**Status:** Design and checked-in-source review only; no database connection or deployed-state verification was performed.  
**Production approval:** Not granted.  
**Implementation:** Not started. This document does not authorize Phase 3.1 work.

## 1. Executive decision

Adopt the existing `profiles.is_super_admin` and `profiles.is_organization_admin` columns as the intended canonical administrative authorities, subject to live database preflight, correction of transitional authorization paths, and implementation of database-enforced single membership. Keep functional permissions in `user_roles`, `role_permissions`, and `user_permissions`. Treat `organization_members.is_owner` as an ownership fact and `organization_members.role_id` as legacy/compatibility data; neither is an independent source of administrator authority in the target model.

The checked-in schema has the necessary profile flags, membership table, organization-scoped functional RBAC tables, and invitation workflows. It does **not** currently enforce one membership per user, does not enforce profile/membership organization consistency, and the current request and SQL authorization flows retain legacy admin sources and organization selection/switching. The target architecture is feasible, but it is not currently implemented end-to-end.

Do not delete `TENANT_ADMIN`, rewrite assignments, reconcile inconsistent profiles, or change admin flags until read-only deployed inventory, a reviewed mapping, and an approved transactional transition plan exist. The master tracker says checked-in implementation is not proof of deployment and production approval is not granted.

## 2. Evidence boundaries and checked-in schema findings

Findings below are from the repository files named in this document. They describe the checked-in migration history as currently inspected, not necessarily the deployed database. The migration chain includes `20261104000001` through `20261121000019`; no deployed migration ledger, catalog, rows, policies, function definitions, grants, or Supabase project state was queried.

| Question | Verified checked-in finding |
|---|---|
| Does `profiles.organization_id` exist? | Yes. Migration `20261104000001_core_schema.sql` defines a nullable FK to `organizations(id)` with `ON DELETE SET NULL`. The same table already defines `is_super_admin` and `is_organization_admin`; no duplicate admin columns are needed. |
| Does `organization_members` have unique `(organization_id,user_id)`? | Yes. Migration `20261104000003_audit_logs.sql` defines `uq_organization_members_org_user UNIQUE (organization_id, user_id)`. |
| Does that prevent multiple organizations per user? | No. It prevents duplicate membership in the same organization only. There is a normal index on `user_id`, but no unique constraint on `user_id` in checked-in migrations. |
| Can profile and membership organization disagree? | Yes. `profiles.organization_id` and `organization_members.organization_id` are separate references. The inspected schema has no composite FK or cross-table invariant keeping them equal. The membership migration does not add one. |
| Does `user_roles` enforce user membership in that organization? | Not by a composite FK to `organization_members`. It uses `(organization_id,user_id,role_id)` as its PK and separate FKs, so consistency is principally workflow/policy dependent. |
| Does the database currently make profile admin flags immutable to ordinary users? | Checked-in migrations 12–14 add profile RLS restrictions and `fn_enforce_profile_security_fields()`. Migration 14 explicitly blocks self flag changes, blocks an organization admin from changing another user's flags, and permits platform SuperAdmin bypass based on `profiles.is_super_admin`. This is meaningful protection for authenticated table updates. It does not itself establish a reviewed, narrowly authorized promotion/demotion RPC or protect privileged service-role/direct SQL access from misuse. Verify deployed grants, policies, trigger state, owner/bypass roles, and every privileged write path before relying on it. |
| Can invitation redemption create a second-organization membership? | The checked-in migration 19 workflow checks for a membership in the target organization, not for any membership for that user. It accepts an existing profile after checking active state and email, but does not require its `organization_id` to match the invitation. No unique user-only membership constraint closes this gap. |
| Do provisioning functions independently check intended actor authority? | Migration 18 checks actor ID against an active `profiles.is_super_admin` row for platform onboarding. Migration 19's service-role invitation creation function calls `is_active_org_admin_for_user(actor, organization)`, and redemption validates invitation/email/organization/role. However, the admin predicate is transitional and accepts owner/role/profile sources. Recheck exact deployed function ACLs and call paths. |
| Are row-level admin flags on the base membership? | `organization_members` has `is_owner`, `role_id`, `department_id`, `is_active`; no admin boolean. |

The file `docs/security/SECURITY_REMEDIATION_MASTER_TRACKER.md` is authoritative for phase status. It records migrations 12–19 as implemented, notes partial Phase 1.2 verification, says live PostgreSQL/Supabase is unverified, and says production approval is not granted. Historical security documents remain unchanged.

## 3. Three-level authorization architecture

Keep three distinct concepts and evaluate them in this order:

1. **Platform authority:** `profiles.is_super_admin = true` on the trusted, active profile. This is platform-wide authority and does not require ordinary membership. It must be checked from PostgreSQL or an equivalently trusted backend query, never from client state or user-editable metadata.
2. **Organization administration:** for a non-SuperAdmin, require the user's sole active membership in the requested organization and an active, eligible organization, then check the trusted profile's `is_organization_admin = true` and its organization association matches that membership. This authority applies only to that organization.
3. **Functional capabilities:** for an ordinary member, evaluate direct `user_permissions` and functional `user_roles` → `role_permissions`, within the validated organization, department, and module entitlement boundaries. Role codes and display names do not grant administration.

Organization licensing (`organization_modules`) and department allocation (`department_modules`) remain entitlement gates preceding user action permission. An admin may receive functional permissions through roles independently of admin status. Admin status must not be inferred from functional assignments.

## 4. Existing profile flag responsibilities

- **`profiles.is_super_admin`:** canonical platform administrator authority. It is independent of membership and ordinary role assignment. Only a narrowly controlled platform provisioning/revocation operation should change it.
- **`profiles.is_organization_admin`:** canonical organization administrator authority for the user's one assigned organization. The target invariant requires a non-null matching `profiles.organization_id`, one matching membership, and an eligible active account/organization for ordinary admin actions.
- **`profiles.organization_id`:** canonical association/consistency attribute, but not by itself proof of active membership.
- **`profiles.is_active`:** account activation gate; an inactive account cannot exercise either administrative or ordinary access.

The flags are not credentials if read from a client payload or JWT metadata. They are authority only when resolved from the trusted profile row under a protected path. A SuperAdmin can theoretically be present without membership; the design should permit that. Whether a profile may have both flags set, and whether SuperAdmin profiles may carry a normal organization association, needs an explicit policy. Until decided, do not add a restrictive check or silently normalize rows.

## 5. Functional RBAC separation and legacy authority

### Intended responsibilities

- `user_roles`: assignments of functional roles to a user within an organization.
- `role_permissions`: action permissions belonging to a functional role.
- `user_permissions`: direct functional action grants.
- `organization_members.role_id`: legacy/compatibility field only during transition; it must not provide admin authority.
- `organization_members.is_owner`: ownership metadata and any separately defined ownership workflow; it must not automatically grant admin authority.
- Role labels/codes such as `TENANT_ADMIN`, `ORG_ADMIN`, `ORGANIZATION_ADMIN`, `ADMIN`, or `SUPER_ADMIN`: not authority sources in the final design.

### Verified transitional dependencies

Migration 14's `is_organization_admin(p_org_id)` still permits active owner membership, admin-coded SYSTEM assignments in `user_roles`, admin-coded `organization_members.role_id`, and the profile flag. Its comments explicitly call several sources transitional. Migration 19 duplicates this logic in `is_active_org_admin_for_user` for service-role invitation operations. Migration 18's SuperAdmin onboarding requires an active SYSTEM `TENANT_ADMIN` role, stores it in both membership `role_id` and `user_roles`, marks the member owner, and sets `is_organization_admin`. This is a material provisioning dependency.

`src/features/roles/role.service.ts` rejects assigning certain privileged role codes at some assignment paths, but remains a functional-role service with actor-context checks and in-memory repository behavior. It is not evidence that all database/service paths are consolidated. `src/server/middleware/auth.middleware.ts` derives organization admin from `membership.isOwner` or the profile flag. Thus owner state independently grants admin in the Express context. `requireTenantAdmin` then authorizes from this derived request boolean (or SuperAdmin).

### Retirement decision and safe plan

Do not immediately delete or deactivate `TENANT_ADMIN`. First inventory role definitions, all assignment sources, role permissions, membership legacy values, RLS/function dependencies, service code, invitations, seed files, tests, and deployed objects. Then:

1. Agree what functional capabilities former `TENANT_ADMIN` assignees require after admin authority is separated. Map only reviewed, least-privilege functional permissions into a new functional role when necessary.
2. Establish profile-admin truth from reviewed source records; do not infer it automatically from owner flags or role assignments.
3. Update invitation/onboarding and admin helper paths to use profile authority only, with a trusted controlled admin lifecycle operation. Keep compatibility reads only for an explicitly bounded transition window and record their removal condition.
4. Verify all data and policy consumers no longer depend on the role before removing assignments/permissions or retiring the role definition in a later approved migration.
5. Preserve rollback/evidence and audit changes. Do not delete assignments or role definitions as part of this design task.

## 6. Single-organization enforcement design

### Database invariants

The desired steady-state invariants are:

1. At most one row per `user_id` in `organization_members`, regardless of active state, enforced by a unique constraint/index on `user_id`. This closes concurrent insert races at the database boundary. If historical inactive membership rows must be retained while a user moves organizations, the business rule needs clarification: a full unique constraint disallows historical second-organization rows too. Do not use a partial active-only unique index unless the business explicitly allows historical memberships and defines reactivation semantics.
2. For ordinary member profiles, exactly one matching membership organization and `profiles.organization_id` equals that membership organization. Use appropriate composite uniqueness/FKs (for example, unique `(user_id, organization_id)` on membership and a composite reference from profile `(id, organization_id)` to it) only after checking nullable/unassigned and SuperAdmin requirements. A constraint cannot express active status, so active membership remains an authorization check.
3. Prevent a member's organization association from being reassigned through self-service. A cross-organization move, if any future policy permits it, should be an explicit privileged transfer transaction with audited removal/replacement, not a switch.
4. SuperAdmins may exist without ordinary membership; do not create a dummy organization membership to satisfy constraints. Define whether they may also be ordinary members independently.
5. Ensure role assignments and direct grants are organization-consistent with the user's only membership. Consider composite FKs after data preflight; do not introduce broad cascades that silently erase audit/authorization history.

### Invitation issuance, redemption, and concurrency

Issuance should reject an already-provisioned user or any outstanding invitation that conflicts with the one-organization policy, unless a separately approved reservation policy says otherwise. Redemption must re-check the authenticated identity/email, account status, existing membership in *any* organization (including inactive records under the strict rule), profile organization association, target organization and department/role scope, and invitation status inside one transaction. Lock the user/profile identity row to serialize concurrent redemptions for different organizations; then insert membership and role assignment atomically. The unique `organization_members.user_id` constraint is the final race-safe arbiter even if advisory checks race. Catch unique violations and fail closed. Recheck invitation actor authority at issuance, and ensure service-role RPC entry points bind actor identity from verified backend context rather than caller-controlled data.

The existing migration 19 redemption RPC locks the invitation row (`FOR UPDATE`) but different invitations for one account are different rows; that lock alone does not serialize cross-organization redemptions. Its current membership test is scoped to the invited organization. Both require redesign before this policy is enforced.

## 7. Express authorization flow

Target request sequence:

1. Verify Supabase Auth identity and resolve `auth.uid`; reject invalid/expired tokens.
2. Fetch the current trusted profile from PostgreSQL on protected requests (or use a cache with explicit revocation/short TTL guarantees). Do not use a production process-local profile cache as the authority source.
3. If trusted profile says active SuperAdmin, authorize platform routes according to the approved platform policy without requiring ordinary membership. Use the profile row so revocation takes effect without relying on stale admin claims.
4. Otherwise resolve the sole organization association from the profile/database. If a request organization is supplied, require exact equality to that association. Fetch and validate that organization's lifecycle, and require an active membership matching both user and organization. Missing context, mismatch, inactive membership, data-source error, or ambiguity denies access.
5. If trusted profile admin flag is true and the profile organization equals the verified membership organization, derive organization-admin authority for that organization. Otherwise preload/evaluate functional permissions through roles/direct grants and licensing/department gates.
6. Route-specific organization checks must ensure the target entity belongs to `req.user.organizationId`; never treat a caller-supplied header as authority.

**Current source gap:** `organization-context.service.ts` accepts `x-organization-id`/`x-tenant-id` and validates membership in the selected organization. `auth.service.ts` contains a “switch organization” flow that validates any target membership and issues a new target-scoped token. These permit selection across memberships; removing them from ordinary-user behavior is necessary even after a DB unique constraint. The SuperAdmin may still select organizations for platform administration.

`req.user.isTenantAdmin` / `isOrganizationAdmin` may remain as derived request convenience fields if populated only after the trusted checks above, bound to the validated organization, and never trusted if supplied by a caller or accepted as independent evidence by shared service APIs. Rename generic `isTenantAdmin` usages over time to reduce ambiguity. Guard failures and permission RPC errors fail closed. SuperAdmin route authority should also be based on the trusted request context, not token claims.

## 8. PostgreSQL and RLS authorization flow

### Target helper semantics

- `is_super_admin()`: active profile row for `auth.uid()` with `is_super_admin = true`; no JWT metadata fallback.
- `current_user_organization_id()`: return the ordinary user's sole eligible membership association, while not treating a JWT organization claim as proof or allowing it to select another organization. A claim may at most be compared for consistency. Under enforced one-membership, no arbitrary `LIMIT 1` or “first membership” fallback is required.
- `is_organization_member(org)`: active, matching membership plus eligible organization/account for ordinary user; platform SuperAdmin bypass only where the policy explicitly allows it.
- `is_organization_admin(org)`: trusted profile flag and matching organization association plus active matching membership and active profile/eligible organization; SuperAdmin bypass only for platform policy. No owner or role-code fallback.
- `get_user_effective_permissions(org,user)`: ensure the function only returns permissions for the actor authorized by its call contract. In particular, service-role access must not mean arbitrary caller-supplied `user_id` can obtain or act on another user's permissions without a separately validated trusted workflow. Enforce organization membership, activity, and functional grants.

Migration 14 currently updates `current_user_organization_id()` to use eligible memberships and consult `auth.jwt()->'app_metadata'->>'organization_id'` as a selector; it returns a deterministic organization only when a single eligible membership exists otherwise. That is a mitigation against arbitrary membership selection, but it is not the target no-switching contract when multiple memberships exist. Migration 14's `get_user_effective_permissions(UUID,UUID)` revokes execution from `PUBLIC`, `anon`, and `authenticated`, granting it to `service_role`; inspect the exact body and trust boundary in that privileged call path before treating it as safe.

### RLS, SECURITY DEFINER, grants, and service role

The base migration 2 defines SECURITY DEFINER helpers and RLS policies. Migration 10 rebuilds RLS; migrations 12–14 revise helpers and policies; migrations 18–19 add service-role invitation functions. Every SECURITY DEFINER function must have a fixed safe `search_path`, minimal EXECUTE grants, and independent validation of actor and target organization. Revoke default `PUBLIC` execution where not required. Review object ownership and `BYPASSRLS` implications because service-role operations may bypass table RLS entirely.

Profile RLS and the migration 13/14 trigger restrict authenticated updates to admin flags. The source comments and trigger recognize `postgres`/`service_role` as privileged bypasses, so those credentials are a high-trust boundary: no client-provided boolean may be forwarded as proof, and privileged admin mutation should occur only through narrow functions that validate the actor and target and write an audit event. Verify both table grants and the final deployed policy/trigger/function ACL state.

Every service-role RPC must validate actor authority from database rows (the actor ID comes from a verified server identity, not an untrusted request field), target organization match, target lifecycle, membership status, and allowed operation. For cross-tenant SuperAdmin operations, check `profiles.is_super_admin` in PostgreSQL and bind requested organization to the operation. A service key is not an authorization policy.

## 9. SuperAdmin JWT metadata assessment

The exact claim in the historical issue is `auth.jwt()->'app_metadata'->>'role' = 'SUPER_ADMIN'`, introduced as an OR grant in migration 12's `is_super_admin()`. Migration 13 replaced that helper with an active `profiles.is_super_admin` row as sole authority. Migration 14 retains this profile-backed helper and its token hook writes `app_metadata.role = SUPER_ADMIN` as an informational label from the profile. Thus, in the checked-in final migration definition, the claim is not an independent grant.

Supabase `app_metadata` is generally controlled by privileged Auth/admin operations rather than ordinary user metadata APIs, unlike `user_metadata`; however, the deployed Auth configuration, token hook, grants, actual helper definition, and ability of users or connected services to mutate the claim source were not verified here. A signed token proves the issuer signed its contents, not that the role source was authorized or still current. Therefore classify the historical helper as a real dangerous authority pattern if deployed while present; whether the deployed system remains vulnerable is **BLOCKED pending deployed function and metadata-source verification**. Do not state that the live system is vulnerable or fixed based solely on repository migrations.

The Express production path validates the Supabase user and then fetches the profile; it derives `isSuperAdmin` from that profile. Local JWT mode exists only for non-production configured environments. Keep token metadata informational and ensure all privileged authorization re-reads the profile or uses a rigorously revocation-aware trusted context.

## 10. Administrator promotion, revocation, and ownership lifecycle

Required target controls:

- **Create/promote Admin:** The business delegation policy is not specified. **BLOCKED:** decide whether only SuperAdmins can promote, or whether organization Admins may promote in their own organization. Until decided, use the safer rule: only SuperAdmin-controlled backend operation can set `is_organization_admin`; no ordinary organization Admin promotion path is assumed. Promotion must verify target's sole active membership and matching profile organization in a transaction.
- **Demote Admin:** Authorized actor under the approved delegation policy; transaction locks the organization/admin set, checks last-active-Admin invariant, flips the canonical profile flag, audits the change, and invalidates/reloads sessions. Do not rely on a stale JWT.
- **Suspend/reactivate membership:** Inactive membership blocks ordinary access even if profile flag remains true. On reactivation, the same matching single organization must be checked. The policy for reactivation authority is an unresolved delegation decision.
- **Remove Admin/member:** Deactivate/remove membership only through an audited transaction. Removing membership must not leave a usable organization-admin profile association. Define whether historical membership is hard-deleted or retained inactive before choosing the unique-index semantics.
- **Ownership transfer/removal:** Treat owner as a business ownership field, not access authority. Transfer ownership through explicit audited workflow with consistency checks. The source does not define legal/operational owner-transfer authority; **BLOCKED** until decided. Never auto-promote owners.
- **Last active Admin:** Prevent removal, demotion, or suspension of the last active organization Admin. Use a transaction-safe lock shared by all admin lifecycle writes (for example, lock the organization row before counting and mutating) and enforce through a single database operation. A count followed by separate writes is racy. Decide whether Admin means profile flag + active membership + active profile + eligible organization.
- **SuperAdmin lifecycle:** Separate platform-level provisioning/revocation, multi-party approval/audit expectations, and emergency access policy are not specified. Do not infer these from organization Admin rules.

The checked-in source does not show a complete canonical admin lifecycle RPC implementing these requirements.

## 11. Read-only deployed database preflight inventory

Run only against the intended deployed project using a read-only role/session. Save timestamp, project/ref, identity/role, and query output; do not run updates, repairs, seed scripts, or migrations. These query sketches must be adapted to deployed naming/version and checked for safe access before execution.

### Data inventory

```sql
-- Profiles and both existing authority flags / associations
SELECT id, organization_id, department_id, is_super_admin,
       is_organization_admin, is_active, email
FROM public.profiles
ORDER BY organization_id, id;

-- All memberships, including inactive; identify users with multiple org rows
SELECT user_id, count(*) AS membership_rows,
       count(DISTINCT organization_id) AS organization_count,
       array_agg(organization_id ORDER BY organization_id) AS organizations
FROM public.organization_members
GROUP BY user_id
HAVING count(*) > 1 OR count(DISTINCT organization_id) > 1;

-- Profiles without membership (exclude SuperAdmins for ordinary-member review)
SELECT p.id, p.organization_id, p.is_super_admin, p.is_organization_admin, p.is_active
FROM public.profiles p
LEFT JOIN public.organization_members om ON om.user_id = p.id
WHERE om.user_id IS NULL;

-- Profile/membership organization mismatch and orphan association cases
SELECT p.id, p.organization_id AS profile_org,
       om.organization_id AS membership_org, om.is_active, om.is_owner, om.role_id
FROM public.profiles p
JOIN public.organization_members om ON om.user_id = p.id
WHERE p.organization_id IS DISTINCT FROM om.organization_id;

-- Memberships with no profile
SELECT om.*
FROM public.organization_members om
LEFT JOIN public.profiles p ON p.id = om.user_id
WHERE p.id IS NULL;

-- Admin-coded role definitions and assignments (include SYSTEM/CUSTOM and inactive)
SELECT r.id, r.organization_id, r.code, r.name, r.role_type, r.is_active,
       ur.user_id, ur.organization_id AS assignment_org,
       om.role_id AS membership_role_id, om.user_id AS member_user_id,
       om.organization_id AS member_org, om.is_owner, om.is_active AS member_active
FROM public.roles r
LEFT JOIN public.user_roles ur ON ur.role_id = r.id
LEFT JOIN public.organization_members om ON om.role_id = r.id
WHERE upper(r.code) IN ('TENANT_ADMIN','ORG_ADMIN','ORGANIZATION_ADMIN','ADMIN','SUPER_ADMIN')
ORDER BY r.code, r.organization_id;

-- Permissions attached to admin-coded roles
SELECT r.id, r.organization_id, r.code, rp.module_action_id, ma.full_key
FROM public.roles r
LEFT JOIN public.role_permissions rp ON rp.role_id = r.id
LEFT JOIN public.module_actions ma ON ma.id = rp.module_action_id
WHERE upper(r.code) IN ('TENANT_ADMIN','ORG_ADMIN','ORGANIZATION_ADMIN','ADMIN','SUPER_ADMIN')
ORDER BY r.code, ma.full_key;

-- Organizations with no active profile-flag Admin and active membership
SELECT o.id, o.name
FROM public.organizations o
LEFT JOIN public.organization_members om
  ON om.organization_id = o.id AND om.is_active = true
LEFT JOIN public.profiles p
  ON p.id = om.user_id AND p.is_active = true
 AND p.organization_id = o.id AND p.is_organization_admin = true
GROUP BY o.id, o.name
HAVING count(p.id) = 0;

-- Existing ownership (not proof of admin authority)
SELECT organization_id, user_id, is_active
FROM public.organization_members
WHERE is_owner = true
ORDER BY organization_id, user_id;
```

### Catalog and authority inventory

Inspect `pg_constraint`, `pg_indexes`, `information_schema.columns`, `pg_policies`, `pg_class.relrowsecurity/relforcerowsecurity`, `pg_proc`/`pg_get_functiondef`, `pg_proc.prosecdef`, `pg_proc.proconfig`, `pg_proc.proacl`, `pg_default_acl`, table/sequence grants, object owners, and role attributes for at least `profiles`, `organizations`, `organization_members`, `roles`, `user_roles`, `role_permissions`, `user_permissions`, invitation tables, and all authorization helpers. Capture actual deployed definitions and grants for:

- `is_super_admin()`
- `is_organization_admin(uuid)`
- `is_organization_member(uuid)`
- `current_user_organization_id()`
- `get_user_effective_permissions(uuid,uuid)`
- `is_active_org_admin_for_user(uuid,uuid)`
- invitation creation/redemption and onboarding/provisioning RPCs
- profile protection and audit triggers

Also inventory actual Auth hook configuration and the source/writability of `app_metadata.role` and `app_metadata.organization_id`; read-only review only. Compare deployed migration ledger to checked-in migrations, inspect all RLS policies including permissive policy combinations, test-role ACLs without mutating data, and list service-role callers/configured privileged services. Query actual active invitation reservations as well. This source document does not assert any deployed result.

## 12. Transition plan and manual review requirements

After preflight, classify rows without changes:

1. Multi-membership users (including inactive memberships): manual decision whether preserve historical membership, revoke, or conduct a separately approved transfer. Do not silently pick one organization.
2. Profile/membership mismatches, profiles with no membership, memberships with no profile, missing profile organization IDs, and organization/department mismatch: manual resolution against trusted business records.
3. SuperAdmin/admin flags versus owners and role assignments: determine intended authority from approved evidence; do not promote every owner or remove any existing administrator automatically.
4. `TENANT_ADMIN` and aliases: enumerate system/custom role, assignment, permission, RLS, invitation, onboarding, service and frontend dependencies; decide least-privilege replacement and staged retirement.
5. Organizations lacking a currently active profile-flag Admin: obtain an authorized business owner decision before any promotion or access change.
6. Existing invitation conflicts: decide how pending invitations to multiple organizations should be invalidated/resolved; do not alter them during inventory.
7. Admin lifecycle delegation, ownership semantics, SuperAdmin approvals, and retention of inactive membership history remain business decisions.

No data cleanup is authorized by this design deliverable. Cleanup must be a separately reviewed, auditable, reversible migration/procedure with backups and post-change verification.

## 13. Implementation sequence (future work only)

1. Complete deployed read-only preflight and resolve all `BLOCKED` policy decisions; record approved mappings and current production state.
2. Build non-mutating validation/reporting for duplicate memberships, inconsistent associations, legacy authority, and admin coverage. Obtain manual review for each affected identity/organization.
3. Define and test an audited, transaction-safe canonical admin lifecycle operation and service-role actor validation.
4. Add database invariants only after data is reconciled: unique user membership, profile/membership consistency, scoped role/grant relationships, and robust invitation serialization. Preserve SuperAdmin-without-membership behavior.
5. Update invitation issuance/redemption and onboarding provisioning to enforce one-org semantics in database transactions, with a unique constraint as the concurrency backstop.
6. Align SQL helpers/RLS and Express context to use trusted profile flags plus membership; remove role/owner admin fallbacks and organization switching for ordinary users. Keep SuperAdmin cross-org selection subject to platform policy.
7. Migrate/retire legacy admin assignments only after verified dependency removal and approved mapping. Retain rollback evidence.
8. Validate on disposable PostgreSQL/Supabase, then staging. Verify concurrency races, RLS as authenticated, function ACLs, service-role paths, revocation freshness, last-admin races, and migration rollback. Production approval is a separate decision.

This sequence is not a Phase 3.1 start authorization. Per the task restriction, no Phase 3.1 implementation was performed.

## 14. Risks and unresolved decisions

- **BLOCKED — deployed state:** actual migration ledger, constraints, rows, RLS policies, helper definitions, grants, triggers, and Auth hook settings are not available in the checked-in source.
- **BLOCKED — Admin delegation:** who may promote, demote, reactivate, suspend, and remove organization Admins is unspecified. Conservative recommendation is SuperAdmin-only promotion until approved.
- **BLOCKED — membership retention:** a unique index on all membership rows prohibits even retained inactive historical memberships across organizations. Decide whether one-org means lifetime history or one current membership plus archive/history elsewhere.
- **BLOCKED — SuperAdmin organization association:** the handling of both flags or an associated organization for platform admins is unspecified.
- **BLOCKED — owner lifecycle:** ownership transfer/removal authority, legal owner semantics, and whether ownership may be represented without an active membership are unspecified.
- **BLOCKED — last Admin definition:** determine if lifecycle-eligible organization and active account are both prerequisites for counting an active Admin; define exception/emergency handling.
- **BLOCKED — admin role mapping:** existing assignments and role permissions are unverified; no conversion to functional roles can be prescribed without inventory and least-privilege review.
- **Concurrency risk:** invitation row locks do not serialize different invitations for the same user. Only database uniqueness plus identity-level transaction coordination closes the race.
- **Privilege risk:** service-role and database-owner bypasses can circumvent RLS; narrow RPCs and audited credentials remain necessary.
- **Revocation risk:** preloaded request permissions and cached profile contexts must not preserve admin access after demotion. Define cache TTL/invalidation and verify cross-request behavior.

## 15. Acceptance criteria

The design is ready for implementation planning only when:

- The deployed read-only inventory is captured and reconciled against checked-in source; unknown facts are no longer represented as verified.
- No unexplained multi-organization memberships or profile/membership mismatches remain, or each has an approved handling decision.
- One-user/one-organization enforcement is database-level and race-safe, with explicit treatment of inactive history and SuperAdmin exceptions.
- Express and PostgreSQL both derive admin authority from the same trusted profile flags and valid association; role codes, owner, and membership role cannot grant admin.
- Invitation, onboarding, and service-role RPCs independently validate actor, target organization, profile, and membership and fail closed.
- Profile admin flag changes are restricted to the approved lifecycle operation; last-active-Admin protection is concurrency-safe and audited.
- SuperAdmin helper definition, JWT metadata source, Auth hook, execute grants, SECURITY DEFINER config, RLS, and service-role access are verified on the target database.
- Legacy role retirement has a reviewed assignment/permission mapping and no remaining live consumers before destructive cleanup.
- Staging evidence covers database constraints, RLS, RPC grants, races, revocation, and rollback. Production approval remains explicit and separate.

## 16. Final report

1. **Is the single-organization architecture supported by the existing schema?** Partially. Existing profiles and membership tables support the model, but the checked-in schema does not enforce one organization per user and does not enforce profile/membership consistency. Provisioning needs correction.
2. **Can existing profile flags safely serve as canonical admin authority?** They are suitable as the target canonical source and current migrations add meaningful authenticated-write protections. They are not yet a proven safe end-to-end authority: Express and SQL retain owner/role fallbacks, controlled privileged write paths and deployed grants need review, and deployed state is unverified.
3. **Can `TENANT_ADMIN` be retired from functional RBAC?** Potentially, but not safely yet. Migration 18 onboarding requires it and assigns it; migrations 14/19 use it as transitional admin authority; source and deployed assignments/permissions must be inventoried before staged retirement.
4. **Is the SuperAdmin JWT metadata issue a real vulnerability or does it require verification?** Migration 12's `app_metadata.role = SUPER_ADMIN` OR check is an unsafe independent authority pattern if deployed. Migration 13 removes that grant in checked-in source, and migration 14 retains profile-backed authority. Whether the deployed system has the vulnerable historical helper or safe final helper is blocked on live definition/grant/Auth metadata-source verification.
5. **Can Express and PostgreSQL enforce the same model?** Yes, in principle, using the same trusted profile values and association checks. Current checked-in behavior is not aligned and must be consolidated.
6. **What data cleanup is required?** Unknown until deployed inventory. At minimum report and manually resolve users with multiple memberships, profile/membership mismatches, orphan or unassigned profiles/memberships, pending cross-org invitations, organizations without an active profile-flag Admin, and legacy role/owner/admin-source conflicts. No automatic cleanup is recommended.
7. **Is Phase 3.1 ready to begin?** No. Deployed preflight, policy decisions, data review, and resolution of the listed blockers are prerequisites. No implementation or production readiness is claimed.
