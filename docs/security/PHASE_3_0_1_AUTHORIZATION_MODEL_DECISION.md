# Phase 3.0.1 — Authorization Model Decision and Transition Plan

**Date:** 2026-11-21  
**Type:** Design and read-only analysis. No source, migrations, records, roles, assignments, or permissions were changed.  
**Target direction:** Recommendation C from Phase 3.0.  
**Decision status:** Target model is recommended; implementation remains **BLOCKED** on the explicit business decisions and deployed database inventory listed below.

## 1. Executive decision

Adopt an authorization model in which active organization membership is a prerequisite for tenant access; `user_roles` identifies roles in that organization; and `role_permissions` plus `user_permissions` supply the action grants evaluated by PostgreSQL. Keep `organization_members.is_owner` as a distinct ownership fact, not as an implicit wildcard organization-admin grant. Retire `organization_members.role_id` and `profiles.is_organization_admin` as authorization sources after verified transition. Keep SuperAdmin as a separately authorized platform principal.

This is a target design, not a statement about deployed behavior. Current SQL and Express disagree: PostgreSQL’s `is_organization_admin()` recognizes admin roles in `user_roles` and legacy `organization_members.role_id`, plus owner and profile flags; Express derives `isTenantAdmin` from owner status or the home-organization profile flag and does not derive it from the active organization’s `user_roles` row. Some protected Express routes use this boolean while SQL effective permissions use role/direct permission rows. The difference can cause valid role-based admins to be denied in Express and can preserve owner/profile-based broad access after an admin role is removed.

**Permission design is not yet final.** No `INSERT INTO public.role_permissions` statement was found in checked-in migrations, `supabase/seed.sql`, or the catalog seed. The available catalog contains action keys, but does not define which belong to `TENANT_ADMIN`, which are owner-only, or which custom roles may receive. Accordingly, the matrix below is a proposed policy boundary using existing keys, not an assertion of current grants. Payroll action mappings and approval keys require catalog/deployment inspection before use.

## 2. Canonical authority model (Gate 1)

| Data object | Responsibility in target model | Does not establish |
|---|---|---|
| `profiles` | User-facing profile and account attributes; active account status; SuperAdmin flag remains a distinct platform authority only if retained by the approved platform model. A profile’s `organization_id` is a legacy/home-org attribute. | Tenant membership, tenant role assignment, or organization-admin authority. `is_organization_admin` must cease to grant authorization. |
| `organization_members` | Establishes the user’s relationship to a specific organization, department context, and membership active/suspended state. `is_owner` records ownership status. | General permission grants through a duplicate `role_id`; broad admin bypass merely because `is_owner=true`. |
| `roles` | Defines role identity, code, type, and scope. SYSTEM roles have `organization_id IS NULL`; custom roles belong to one organization. `TENANT_ADMIN` remains the canonical SYSTEM role by checked-in seed design. | An assignment to a user or a permission by role name/code alone. |
| `user_roles` | Assigns one or more roles to a user within an organization. Its organization and user must match an active membership; role must be global SYSTEM or owned by that organization. | Membership itself or effective permission without a valid active membership. |
| `role_permissions` | Maps role and organization to catalog actions. This is the durable role-grant source. | Authority to grant permissions beyond an actor’s delegation scope. |
| `user_permissions` | Direct user grants/overrides, additive under the current migration 14 evaluator. Must be explicitly included in the actor/delegation model. | A role assignment or owner status. |

### Ownership versus administration

Ownership and administration are different facts. Ownership concerns governance/continuity: who owns the organization, can transfer ownership, or may perform approved owner-only recovery actions. Administration concerns operational permissions such as managing departments, users, or role assignments. Current onboarding creates the initial membership with both `is_owner=true` and `TENANT_ADMIN` in `user_roles`, which demonstrates that the two data concepts can be recorded separately. Current helper code nevertheless treats owner status alone as general administrator authority.

The owner-only operation set is **BLOCKED** pending product/legal approval. The permission catalog has no owner-specific action keys, and no owner-transfer API is defined in the inspected code. Do not invent permission keys or promote every owner to `TENANT_ADMIN` during migration.

## 3. Permission catalog and proposed administrator permissions (Gate 2)

### Evidence from catalog and seed files

- `supabase/migrations/20261104000005_seed_default_user_roles.sql` seeds immutable SYSTEM `TENANT_ADMIN` (`organization_id=NULL`). Its descriptive text lists department/settings and invitation/role-assignment responsibilities, but the file inserts no `role_permissions` rows.
- The configured local seed is `supabase/seed.sql` (`supabase/config.toml:67-72`). It defines `Organization.*`, `Department.*`, `Profile.*`, `Role.*`, `UserRole.*`, `TenantModule.*`, `DepartmentModule.*`, `RolePermission.*`, and `UserPermission.*` View/Add/Edit/Delete action keys. It contains no `role_permissions` grants. The separate `supabase/seeds/20261101000001_seed_catalog.sql` defines legacy `Tenant.*` and the other listed administrative families, also without role grants; it is not the configured `db.seed.sql_paths` file.
- `src/shared/constants/permissions.ts` defines current application key families including `Organization.*`, `Department.*`, `Profile.*`, `Role.*`, `UserRole.*`, `OrganizationModule.*`, `DepartmentModule.*`, `RolePermission.*`, `UserPermission.*`, `TypeOfLeave.*`, `RequestForLeave.*`, and `PayrollComputation.*`. It also defines `RequestForLeave.Approval.Create`.
- The configured `supabase/seed.sql` contains a custom organization-scoped `ORG_ADMIN` role fixture (`:579`), a `user_roles` assignment to it (`:628-645`), and an earlier sample profile with `is_organization_admin=true` (`:274-289`). It uses legacy `tenants`/`tenant_id` schema naming, unlike current organization migrations; compatibility with the current migration schema has not been validated. It also begins with destructive truncation statements, which were not run. Its role/assignment/profile content is local seed evidence, not deployed state or a safe migration recipe.
- No role-permission matrix seeding was found in the checked-in migration/seed sources searched. Current permission contents in any deployed database are **NOT VERIFIED**.

### Proposed policy matrix

The table uses only existing permission keys. A “proposed” entry is a design recommendation to approve; it is not an existing grant. Tenant scope, module entitlement, department allocation, actor delegation authority, and database policy must still constrain each permission.

| Capability | Existing keys/evidence | Proposed `TENANT_ADMIN` | Custom role | Owner-only | SuperAdmin-only / blocked |
|---|---|---|---|---|---|
| View/manage organization operational settings | `Organization.View`, `Organization.Edit`; legacy alias `Tenant.*` | Propose View/Edit only for its own organization, pending field-level scope. | Permit only if explicitly delegated and organization-scoped. | No general admin authority. Ownership transfer may be owner-only but has no catalog key (BLOCKED). | Organization creation/deletion and cross-organization control remain platform operations. Exact actions/routes need review. |
| Manage departments | `Department.View/Add/Edit/Delete` | Propose View/Add/Edit; Delete requires approval because it can disrupt payroll data/structure. | May receive only the approved subset within delegated department scope. | None by ownership alone. | Cross-org operations are SuperAdmin-only. |
| Manage profiles/users | `Profile.View/Add/Edit/Delete` | Propose View/Add/Edit with field-level protections; Delete is not approved by this assessment. Invitation lifecycle should be the supported user-provisioning path. | Limited to explicit delegation and tenant/department scope. | No general user-management grant. | Platform identity, organization provisioning, and SuperAdmin changes remain SuperAdmin-only. |
| Assign/revoke nonprivileged roles | `UserRole.View/Add/Edit/Delete` | Propose View/Add/Edit/Delete for same-org active members and delegated roles, with self-change and last-admin safeguards. | May manage only lower/equal roles within its grant scope; no self-escalation. | Owner transfer/removal only by approved workflow. | SYSTEM role assignment and platform roles are SuperAdmin/privileged workflow only. |
| Create/modify custom roles | `Role.View/Add/Edit/Delete` | Propose View/Add/Edit/Delete for own-org CUSTOM roles, subject to active use, immutability, and delegation safeguards. | Custom role must not be allowed to exceed actor’s grant ceiling. | Ownership does not bypass role rules. | SYSTEM role definitions are SuperAdmin-only. |
| Modify role grants | `RolePermission.View/Add/Edit/Delete` | **Do not grant by default.** Approval needed for whether tenant admins can delegate permissions; if allowed, DB must ensure grants are a subset of actor-authorized grants and prevent privileged actions. | Same subset-only rule; no privilege amplification. | Owner status alone does not grant permission-delegation authority. | Mutating SYSTEM role permission definitions is SuperAdmin-only. |
| Direct user overrides | `UserPermission.View/Add/Edit/Delete` | **BLOCKED** pending additive override/delegation policy; no broad default admin grant. | No self-grant or bypass. | None. | Global or cross-tenant direct grants are platform-only. |
| Tier 1 organization modules | Legacy `TenantModule.*`; current `OrganizationModule.*` constant | Do not assign to `TENANT_ADMIN`; current RLS model reserves Tier 1 allocation to SuperAdmin. | No. | No. | SuperAdmin-only. Key naming mismatch must be reconciled in catalog before implementation. |
| Tier 2 department modules | `DepartmentModule.View/Add/Edit/Delete` | Propose View/Add/Edit for own org, subject to active Tier 1 entitlement. Delete requires approval. | May receive a scoped subset. | None. | Cross-organization allocation SuperAdmin-only. |
| Payroll data and approval | `PayrollComputation.*` constants; existing source includes `RequestForLeave.Approval.Create`, but the active SQL catalog seed does not seed these actions. | **BLOCKED** pending catalog/deployed mapping review. Do not assume organization admin should view payroll or approve payroll. | Only explicit payroll delegation after approval. | No implied payroll access. | Platform-wide payroll access must remain denied to SuperAdmin unless a separate approved platform policy says otherwise; canonical role description says SuperAdmin has no sensitive tenant payroll access. |

### Role type and custom-role rules

`TENANT_ADMIN` should remain a global immutable SYSTEM role with a per-organization assignment in `user_roles`, matching migration 5 and invitation migration 18. Its global definition does not mean global data access: the assignment, permissions, and every operation remain organization scoped. SuperAdmin remains distinct and must not be assigned through ordinary tenant workflows.

Custom roles can receive ordinary existing action keys only when authorized by the approved delegation model. They must never obtain a privileged bypass because their code/name is `ORG_ADMIN`, `ADMIN`, or similar. A custom role may perform a permission only through explicit `role_permissions`/`user_permissions` grants and the same membership, org, department, and module checks. Whether custom roles can hold the full set of tenant-admin actions is **BLOCKED** pending approval of delegation ceilings.

No new permission key is proposed here. Missing definitions include explicit owner transfer/ownership recovery, last-admin governance, service-role workflow actions, and potentially payroll actions absent from the active catalog seed. Those need catalog and business decisions before implementation.

## 4. Express/PostgreSQL authorization alignment (Gate 3)

### Current mismatch

| Layer | Current decision path | Alignment issue |
|---|---|---|
| `organization-context.service.ts` | Requires active membership for non-SuperAdmins and active/unexpired organization. | Membership is a sound context gate; it returns roleId/owner data but does not itself resolve role permissions. |
| `auth.middleware.ts` | After context validation, computes admin boolean from `membership.isOwner || (profile home organization matches && profile.isTenantAdmin)`. Loads role-based effective permissions separately. | Does not derive tenant-admin guard from `user_roles`; role-only administrator can pass SQL checks but fail Express `requireTenantAdmin`. Owner/profile grant broad guard independently of action permissions. |
| `rbac.guard.ts` | `requireTenantAdmin` checks boolean flag or SuperAdmin; `requirePermission` checks effective permission set. | Two competing authorization routes: role boolean bypass and action permission. Routes should choose the explicit permission contract, not use a legacy boolean as an alternate grant. |
| `auth.service.ts` | Session and organization switch place the profile flag/owner-derived boolean in user context/token. | Does not derive admin status from the selected organization’s role assignments; profile flag is single-org and potentially stale. |
| `role.service.ts` | Role/assignment/permission mutations and reads use in-memory `db`; actor checks use supplied boolean/context. | Not durable authorization; service role or cache must not become an alternate source of truth. |
| SQL `is_organization_admin()` | Accepts owner, admin code in `user_roles`, admin code in `organization_members.role_id`, or profile flag, after active membership/org checks. | Broader/multiple authority sources than Express; admin code can grant the predicate without an explicit action-level permission. |
| RLS | Many writes call the broad helper; direct role/permission policies do not enforce actor delegation limits. | Role-helper authorization is wider than permission grants; service-role bypass must use restricted transactional RPCs. |
| `get_user_effective_permissions` | Reads committed role/direct permission rows, requiring active org membership/profile/org/department and module eligibility. Additive role ∪ direct model in migration 14. | Correct durable permission direction, but separate broad helper and middleware booleans can still bypass or disagree. |

### Target enforcement

1. Resolve trusted actor identity from verified Supabase identity (`auth.uid()` in authenticated DB calls or a tightly controlled verified service execution context); never accept a caller-supplied actor id/boolean as authority.
2. Validate organization status and active membership for the requested organization before calculating any role or permission.
3. Resolve current role and direct grants from PostgreSQL for that organization. Keep `req.user` for identity/context; populate effective permissions only from the database evaluator. If any permission/RPC lookup fails, deny access.
4. Replace generic `requireTenantAdmin` gates on business routes with explicit `requirePermission(existingKey)` as appropriate. Keep exceptional ownership/platform workflows as distinct narrow guards and RPCs after business approval. Do not make `isTenantAdmin`/`isOrganizationAdmin` an alternate bypass.
5. Make `auth.service.ts` organization switching only validate membership and change context; it must not encode a role-derived authorization claim in a token. Any informational label must be refreshed from database state and never authorize.
6. Make role/permission services call narrow PostgreSQL transactions. Actor authorization, target validation, delegation ceilings, writes, audit, and invalidation must be in the transaction or follow commit safely. Keep cache updates post-commit only.
7. Narrow `is_organization_admin()` either to an explicitly approved compatibility phase or retire it from tenant RLS in favor of permission-aware policies. Avoid creating another general admin helper that duplicates the evaluator.
8. Preserve SuperAdmin as separate platform authority. Its cross-organization access must be limited to explicitly marked platform operations; a platform identity does not automatically imply sensitive payroll access.
9. `get_user_effective_permissions` remains committed-state evaluator for `user_roles`/`role_permissions` and direct `user_permissions`, with existing organization/module/department filters. Remove role-code implicit grants and stale role claims. Owner status must not inject general action keys.

## 5. Legacy authority transition (Gate 4)

No legacy data is to be modified by this design document. First perform a read-only inventory against the approved staging/deployed target.

### Pre-migration inventory

- Actual migration history and deployed definitions for tables, RLS, functions, triggers, grants, and constraints.
- Every role record (id, code, type, organization, active/mutable) including `TENANT_ADMIN`, `ORG_ADMIN`, `ORGANIZATION_ADMIN`, `ADMIN`, SuperAdmin, and custom roles with admin-like names.
- Role permission action list/count by organization and role; user direct permission list/count; effective permission snapshots for affected anonymized identities.
- `user_roles`, `organization_members.role_id`, `organization_members.is_owner`, profile admin flag, membership status, profile status, organization status/expiry, departments, and all FK dependents.
- Duplicate/mismatched role links; user with multiple organization memberships; users with both role/mirror values; owners lacking canonical admin role; admins without owner flag; organizations lacking active admin or multiple owners.
- Compare effective results using *deployed* functions/policies with the expected target model. Do not derive counts from fixture seeds.

### Reconciliation rules (proposed; require approval)

| Case | Safe handling principle |
|---|---|
| `organization_members.role_id` differs from `user_roles` | Do not choose one silently. Compare active role, org scope, permissions, and audit history; quarantine conflict for reviewed resolution. |
| Membership role exists without `user_roles` | Treat it as a legacy candidate only. Preserve access during an approved compatibility window or require explicit assignment approval; never infer the desired role solely from display name. |
| `user_roles` exists without a membership | It must not authorize tenant access. Keep row for reconciliation/audit until approved cleanup; do not grant membership from role assignment. |
| Owner without admin role | Preserve ownership. Do not auto-convert to `TENANT_ADMIN`; product owner must decide operational access. |
| Admin assignment without owner status | Preserve the role grant if valid and authorized; do not grant ownership. |
| Profile admin flag true | Compare against membership and role assignments. Do not automatically create owner or admin role; obtain authorization decision, then clear/retire as part of a reviewed transaction. |
| Multiple organization memberships | Reconcile per organization using memberships and each org’s role rows; never copy a home-profile admin flag into other organizations. |
| Duplicate canonical and legacy role rows | Compare permission sets first. Deduplicate only where identical assignments and dependents are proven; retain audit evidence and rollback map. |

### Rollback and recovery

Keep immutable preflight output, per-row mapping, counts, and before/after permission snapshots. Prefer additive/expand-contract migration phases: introduce canonical checks and compatibility telemetry; repair reviewed records; switch authorization; verify; then remove legacy columns/paths in a later approved migration. Rollback must restore authorization semantics and affected links from captured mappings without regranting broader stale flags. Maintain an emergency SuperAdmin recovery path that is separately authenticated and audited. No destructive action or migration is authorized by this plan.

## 6. Administrator and ownership lifecycle (Gate 5)

### Required transactional workflows

Each workflow must be a narrow database RPC or equivalent transaction, with trusted actor identity, active organization/membership, organization eligibility, role/permission scope, active target membership, and audit record validation. Service-role RLS bypass is not authorization; service-only RPCs must verify the actor from a verified context or signed server assertion that cannot be set arbitrarily by callers.

| Operation | Required validation and transaction behavior |
|---|---|
| Assign administrator | Lock organization authorization row; validate actor can delegate every requested permission; ensure target has active membership; reject self-escalation and cross-org role; insert canonical role and approved permission mapping atomically. |
| Revoke/demote administrator | Lock organization row and relevant role/member rows; calculate remaining valid administrators after proposed change; reject if it removes last approved admin; delete/revoke role assignment and invalidate cache only after commit. Preserve history in approved audit/event mechanism. |
| Suspend membership | Lock membership and org authorization state; set inactive; all access and effective permissions fail closed immediately. Decide whether role rows remain dormant or are explicitly revoked. |
| Reactivate membership | Validate organization active, user/profile eligible, role still active/in-scope, permission set current, and actor authorized. Recompute authority from durable rows, not stale claims/cache. |
| Transfer ownership | Dedicated owner workflow; lock organization row and both membership rows; require currently authorized owner/platform actor; set new owner and clear old owner atomically; preserve at least one owner if policy requires. |
| Remove owner | Require approved owner-transfer or recovery semantics. Lock org row, ensure last-owner rule and last-admin rule independently, then update/delete atomically. |
| Last admin/owner protection | Use a stable organization-row lock (`SELECT ... FOR UPDATE`) before counting eligible active memberships and role grants, then mutate under the same transaction. Define eligible administrator precisely; count only active membership, active account, active role/org, valid org status/expiry, and an approved admin role/permission set. |

The policy “at least one active owner must remain” is **BLOCKED** for product approval. The policy “at least one active organization administrator must remain” should be required for lockout prevention; the exact qualifying role set needs approval. Concurrent revocations/transfers must serialize on the same organization-level lock, not rely on a count alone.

## 7. Deployed database read-only preflight (Gate 6)

No live or staging database was queried for this decision. All statements below are required inventory categories, not executed queries. Use a read-only DB role and a named staging target. Do not use service-role credentials for inventory unless access is demonstrably read-only.

1. **Migration state:** inspect Supabase migration history and compare to repository migration files/checksums; report missing, extra, or out-of-order migrations.
2. **Schema:** inspect `information_schema.columns`, constraints/FKs/indexes for `profiles`, `organization_members`, `roles`, `user_roles`, `role_permissions`, `user_permissions`; verify active/status columns and tenant composite keys.
3. **Role catalog:** list anonymized role id, normalized code, type, organization scope, active/mutable state for SYSTEM and CUSTOM roles; include all aliases and duplicate codes.
4. **Permissions:** count/list `module_actions.full_key` by module; count/list role and direct grants grouped by role/org/action. Report missing action definitions referenced by app constants separately.
5. **Assignments:** counts of user_roles per role/org; distinct users/orgs; duplicate canonical/legacy pairs; admin-only role assignments; cross-org role/user/membership mismatches. Aggregate or anonymize identities.
6. **Memberships/ownership:** totals of active/inactive memberships; count owners per org (0, 1, >1); role_id versus user_roles agreement; admin assignments without owner; owners without admin assignment; missing/inactive profiles.
7. **Organization eligibility:** active/suspended/expired counts; organizations with zero active valid admins, no owner, or multiple owners; do not expose personal data.
8. **Effective outcomes:** execute current deployed `get_user_effective_permissions` and `is_organization_admin` for controlled anonymized sample cases, comparing owner-only, role-only, profile-only, mirror-only, suspended, multi-org, and SuperAdmin contexts.
9. **Security definitions:** inspect `pg_policies`, `pg_get_functiondef` for helpers/RPCs, `pg_proc.prosecdef`, function owner, `proconfig` search_path, ACL/EXECUTE grants, table grants, triggers, and SECURITY DEFINER ownership.
10. **Output:** retain row counts, anonymized ids, SQL text, timestamp/target, and hashes; no record changes. A preflight mismatch blocks implementation until reconciled.

Checked-in source facts: global `TENANT_ADMIN` is seeded; current helper has four overlapping authority paths; current invitation provisioning writes paired membership/user role records and separate owner status; no role-permission matrix seed was found; role assignment table has no active/expiry/revocation column. Deployed facts: all actual rows, assignments, permissions, migration state, policies/functions/grants are **NOT VERIFIED**.

## 8. Risks and unresolved decisions

- **BLOCKED — admin permission policy:** approve the exact `TENANT_ADMIN` action set, including whether role delegation and profile management are included.
- **BLOCKED — payroll:** approve whether organization administrators may view any payroll data; payroll keys are not consistently present in the checked-in SQL catalog seed and the SuperAdmin description explicitly excludes sensitive payroll access.
- **BLOCKED — owner powers:** define owner-only operations, transfer authority, multiple-owner policy, and whether a final owner must remain. Do not auto-grant administrator role to owners.
- **BLOCKED — custom roles:** decide whether and how custom roles may receive admin-like actions; recommended condition is permission-by-permission delegation bounded by actor authority, never a name/code shortcut.
- **BLOCKED — direct user permissions:** confirm additive semantics remain approved and define whether tenant admins may grant direct overrides.
- **Deployment drift:** legacy `supabase/seed.sql` describes tenant-scoped custom `ORG_ADMIN` and a profile flag; canonical role migration defines global SYSTEM `TENANT_ADMIN`. Actual deployment might reflect neither, both, or later applied state.
- **Authorization mismatch:** current middleware, SQL helper, permission RPC, and in-memory role service trust different sources. Until alignment ships, API behavior and database behavior can disagree.
- **Lockout/concurrency:** no checked-in last-admin/last-owner transactional guard exists; concurrent removal can leave no administrator/owner.
- **Audit/history:** physical deletion of `user_roles` does not preserve assignment history in the base table. Decide retention before building revoke workflow.
- **Catalog mismatch:** the nonconfigured alternate catalog seed uses `Tenant.*`; configured `supabase/seed.sql` and current code use `Organization.*`, while current code uses `OrganizationModule.*` but configured seed contains `TenantModule.*`. Reconcile key mapping against the deployed action catalog before grants are assigned.

## 9. Proposed implementation sequence

1. Obtain explicit business/security approvals for admin action set, payroll, owner semantics, custom-role delegation, direct grants, and last-admin/owner rules.
2. Run the read-only deployed preflight and compare actual schema/migration state to this assessment. Stop on drift or unclassified authority.
3. Build a reviewed reconciliation workbook/report with anonymized affected row maps and before/after effective permissions; get migration approval separately.
4. Design migration with preflight constraints and reversible compatibility telemetry; no automatic owner-to-admin promotion and no implicit profile-flag conversion.
5. Establish a single database permission-resolution contract and trusted actor context; define RLS, RPC grants, search paths, and SECURITY DEFINER ownership.
6. Implement Express/context/session changes to derive tenant authorization from active membership and committed DB permissions; remove boolean admin bypasses from general routes.
7. Implement restricted transactional lifecycle RPCs with organization locking, last-admin safeguards, audit records, cache-after-commit, and rollback behavior.
8. Add database integration and HTTP tests for every scenario and direct authenticated/service-role boundary; distinguish PGlite from actual PostgreSQL staging verification.
9. Apply only to an approved staging environment after review; verify effective permissions and all legacy-path denial cases. Production deployment requires a separate authorization and rollout approval.
10. Retire compatibility fields/functions/policies only after staged proof that no valid authority depends on them. Do not start Phase 3.1 until this decision and preflight are approved.

## 10. Explicit approval gates

Before implementation, record approval for:

1. Canonical model in this document: membership gates access; role/direct permission rows grant operational actions; ownership is separate and not a general admin bypass; profile and membership role mirror are retired after transition.
2. Exact `TENANT_ADMIN` and custom-role permission sets, including permission delegation ceilings.
3. Payroll view/approval policy and whether any platform SuperAdmin can access sensitive tenant payroll data.
4. Owner-only powers, ownership transfer/removal, multiple-owner policy, and last-owner rule.
5. Last-active-admin definition and lockout recovery path.
6. Direct `user_permissions` grant model and whether tenant-level actors may issue such grants.
7. Named staging database and authorized read-only inventory access; then a separate migration approval based on its results.

## Final recommendation

Approve the target direction, not implementation yet. **Phase 3.1 is blocked** until the permission set, owner semantics, payroll access, delegation policy, lockout rules, and deployed read-only inventory are explicitly approved and reconciled. No role normalization, migration, permission change, database write, deployment, or Phase 3.1 work was performed.
