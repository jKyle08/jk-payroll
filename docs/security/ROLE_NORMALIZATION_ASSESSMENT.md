# TENANT_ADMIN vs ORG_ADMIN Authorization Assessment

**Assessment date:** 2026-11-21  
**Scope:** Read-only source and migration review. No source, migration, role, assignment, or permission data was changed.  
**Decision:** **D. INSUFFICIENT EVIDENCE** — deployed role records, permissions, and assignments have not been inspected.

## Executive assessment

The checked-in migrations define `TENANT_ADMIN` as the canonical global SYSTEM organization-administration role. They do not seed a distinct `ORG_ADMIN` role. Several database authorization functions nevertheless accept `TENANT_ADMIN`, `ORG_ADMIN`, `ORGANIZATION_ADMIN`, and `ADMIN` as equivalent *signals for the organization-administrator predicate*, but only when the referenced role is a SYSTEM role with no organization. These aliases are not equivalent in the effective-permission evaluator: it derives permissions from `role_permissions`, not from the role code. The inspected seed migration does not establish an equivalent permission matrix for these aliases.

Consequently, the source proves that the identifiers can confer the same organization-admin predicate in certain SQL paths, but it does **not** prove that deployed roles with those identifiers have identical effective permissions, assignments, or references. A safe merge/deprecation decision needs a read-only inventory of the deployed target database and an approved definition of the canonical organization-administration authority. No normalization or Phase 3.1 implementation should proceed before that evidence and approval exist.

## Source-code findings

The principal current-source occurrences are listed below. Line numbers refer to the checked-out files at assessment time. The complete repository search also found historical documentation and test fixtures; those are distinguished from live authorization behavior below.

| File and lines | Behavior | Membership / organization validation | Authority source |
|---|---|---|---|
| `supabase/migrations/20261104000005_seed_default_user_roles.sql:29-50` | Defines immutable global `TENANT_ADMIN` (`role_type='SYSTEM'`, `organization_id=NULL`). No `ORG_ADMIN` role is seeded here. | N/A | Role record identity and metadata. |
| `src/server/db/repository.ts:414-429` | In-memory fixture seeds `TENANT_ADMIN`, named “Organization Administrator.” | Fixture only | Role code, not deployed DB evidence. |
| `supabase/migrations/20261121000014_security_corrections_phase1_1_1.sql:210-264` | `is_organization_admin(org)` accepts active SYSTEM roles with codes `TENANT_ADMIN`, `ORGANIZATION_ADMIN`, `ORG_ADMIN`, or `ADMIN`, through both `user_roles` and the transitional `organization_members.role_id` path. It also accepts owner and scoped profile-flag paths. | Requires active organization and active membership for the target organization. Role references must be active SYSTEM and global. Profile fallback is scoped to profile organization and active profile. | Role code predicate plus `is_owner` and `profiles.is_organization_admin`. It does not compare role permission sets. |
| `supabase/migrations/20261119000010_remediate_database_rls.sql:47-81` | Earlier administrator helper accepts profile flag, owner membership, or SYSTEM role code among `ADMIN`, `ORGANIZATION_ADMIN`, `ORG_ADMIN`. It does not list `TENANT_ADMIN` in this migration version. Migration 14 later replaces it with a broader predicate. | Profile/membership checks scope to organization; current migration 14 is the later definition. | Legacy profile and membership fields plus role code. |
| `supabase/migrations/20261121000019_authorized_member_invitations.sql:47-90` | `is_active_org_admin_for_user` uses the same code set, including both aliases; checks `user_roles` and legacy membership `role_id`; also accepts owner/profile paths. | Requires active membership and active organization; authorization is scoped to requested organization. | Multiple authority sources. |
| `supabase/migrations/20261121000019_authorized_member_invitations.sql:120-132, 190-200` | Invitation creation/redemption rejects SYSTEM roles and administrator-like codes as target member roles; only active CUSTOM roles in the same organization can be invited. | Validates active role, department, organization, and target membership/provisioning context. | Role type, organization ownership, and reserved code denylist. |
| `supabase/migrations/20261104000002_functions_and_rls.sql:115-207` | Initial effective-permission function joins `user_roles` to `role_permissions`, then module actions/eligibility. It does not grant permissions based on `TENANT_ADMIN` or `ORG_ADMIN` strings. | Uses requested organization and user assignment context; replaced/hardened by later migrations. | Durable role-permission rows. |
| `supabase/migrations/20261121000014_security_corrections_phase1_1_1.sql:393-503` | Current effective-permission definition reads committed `user_roles`, `role_permissions`, and direct `user_permissions`; role must be active and global or in requested organization. Role code is not a permission grant. | Requires active organization membership, active profile/organization, active in-scope department, and module eligibility. Assignment has no active flag to check. | Database permission rows and module/department eligibility. |
| `supabase/migrations/20261119000010_remediate_database_rls.sql:435-488` | Authenticated admins can directly insert/update/delete `user_roles` rows within the current organization; policy checks organization-admin status but not target role type, self-assignment, or delegation scope. | Organization scoped; no composite relationship tying role ownership/user membership to the row is present in the core schema. | `is_organization_admin()` predicate. |
| `supabase/migrations/20261119000010_remediate_database_rls.sql:558-601` | Authenticated admins can directly insert/update/delete `role_permissions` rows for their organization; these policies do not protect privileged roles or enforce delegation limits. | Organization scoped. | `is_organization_admin()` predicate, not the actor’s held permissions. |
| `src/features/roles/role.service.ts:239-333` | In-memory role-permission update rejects SYSTEM roles for non-superadmins, validates actions/modules, then replaces in-memory permission rows. It does not derive equivalence by code. | Uses supplied actor organization; no database transaction. | In-memory role type/organization and module state. |
| `src/features/roles/role.service.ts:440-494, 497-540` | In-memory assignment/reassignment rejects SYSTEM roles for non-superadmins, foreign custom roles, and self-assignment; also blocks reserved administrator codes. Assignment listing and writes use repository memory. | Checks target profile tenant and actor tenant; membership is represented by profile tenancy in this path. | Actor flags and role type/code; not PostgreSQL authority. |
| `src/features/roles/user-role.routes.ts:8-18` | Role assignment routes require `authenticateJwt` and `requireTenantAdmin` for POST/PUT/DELETE. | Depends on middleware-resolved request context. | Boolean request flag/guard, not direct role-code comparison. |
| `src/server/middleware/auth.middleware.ts:64-80, 184-202, 268-288` | `requireTenantAdmin` aliases organization-admin guard. Auth context can initially be populated from `profiles.is_organization_admin`; organization switching recomputes the admin flag from active membership owner or a profile admin flag scoped to that organization. | Switching path validates active membership and organization. The direct profile-session mapping is based on the profile’s own organization. | Profile flag and owner flag; not role code or effective permissions. |
| `src/features/auth/auth.service.ts:142-165, 312-330, 465-478` | Auth session maps profile administrative flag into `isTenantAdmin`; switching organization uses membership owner or same-organization profile flag. | Switch path has membership context. | Profile flag / membership owner. Role code is not used at these lines. |
| `src/server/middleware/rbac.guard.ts:105-123` | `requireTenantAdmin` guard checks `req.user.isTenantAdmin`, with SuperAdmin fallback. | Uses previously established request context. | Boolean context flag. |
| `src/client/RootApp.tsx:81` | Displays “Tenant Admin” label from `user.isTenantAdmin`. | None here. | Presentation only. |
| `src/features/audit-logs/audit-logs.routes.ts:37`, `src/features/audit-logs/audit-logs.controller.ts:29-34, 115-121`, `src/features/audit-logs/audit-logs.service.ts:69` | Admin booleans allow/shape audit access. | Depends on request context and service scoping. | UI/API context flags and permissions. |
| `src/features/leave-management/leave.service.ts:54` and `src/server/middleware/data-scoping.middleware.ts:108` | `isTenantAdmin` allows tenant-wide data scope. | Relies on upstream validated context. | Boolean context flag, not role-code comparison. |
| `src/server/db/repository.ts:1192-1197, 1439-1444` | Test/local membership creation mirrors profile admin into `isOwner`; authorization-like helper also checks profile admin. | In-memory only, tenant-scoped in the helper. | Profile flag and owner mirror. |

Other `isTenantAdmin` type references are contract fields or fixtures: `src/shared/types/index.ts:80,209-210`, `src/features/auth/types.ts:27`, and `src/features/users/types.ts:14,26`. They do not define role-code equivalence. `src/features/organizations/organization.service.ts:268,563,771` uses the flag in in-memory organization presentation/provisioning code; it does not establish deployed database role mappings.

### Repository search inventory

The following is the line-number inventory from a case-insensitive repository search for `TENANT_ADMIN`, `ORG_ADMIN`, `isTenantAdmin`, `isOrgAdmin`, `is_organization_admin`, and `organization_members.role_id` (excluding generated `node_modules`, `dist`, and this assessment file). The execution-focused findings above explain authority behavior; historical reports, test fixtures, and staging scripts below are evidence artifacts or synthetic scenarios, not evidence of deployed state.

**Executable source, schema, migrations, seeds, and staging SQL:**

- `ARCHITECTURE.md`: 110, 199, 237
- `src/shared/types/index.ts`: 80, 210
- `src/client/RootApp.tsx`: 81
- `src/features/users/types.ts`: 14, 26
- `src/features/auth/types.ts`: 27
- `src/features/auth/auth.service.ts`: 142, 150, 165, 315, 328, 379, 476
- `src/features/organizations/organization.service.ts`: 224, 268, 563, 771
- `src/features/roles/role.service.ts`: 483, 532
- `src/features/audit-logs/audit-logs.service.ts`: 69
- `src/features/audit-logs/audit-logs.routes.ts`: 37
- `src/features/audit-logs/audit-logs.controller.ts`: 32, 118
- `src/features/leave-management/leave.service.ts`: 54
- `src/server/middleware/rbac.guard.ts`: 115
- `src/server/middleware/data-scoping.middleware.ts`: 108
- `src/server/middleware/auth.middleware.ts`: 35, 49, 199, 256, 257, 274, 275, 285, 286
- `src/server/db/repository.ts`: 417, 524, 540, 1158, 1176, 1195, 1442
- `supabase/migrations/20261104000001_core_schema.sql`: 186
- `supabase/migrations/20261104000002_functions_and_rls.sql`: 40, 48
- `supabase/migrations/20261104000003_audit_logs.sql`: 40, 46, 129, 303, 428
- `supabase/migrations/20261104000005_seed_default_user_roles.sql`: 29, 34, 43
- `supabase/migrations/20261104000007_audit_logs_superadmin_policy.sql`: 34
- `supabase/migrations/20261119000010_remediate_database_rls.sql`: 47, 59, 70, 224, 228, 243, 251, 258, 264, 280, 298, 305, 309, 316, 336, 346, 354, 360, 371, 394, 406, 416, 428, 450, 460, 467, 477, 526, 536, 543, 553, 572, 582, 589, 599, 619, 629, 636, 646, 655, 662, 669, 673, 680
- `supabase/migrations/20261119000011_harden_audit_attribution_and_integrity.sql`: 190, 194, 298
- `supabase/migrations/20261121000012_remediate_critical_containment.sql`: 120, 122, 137, 149, 202, 212, 217, 219, 224, 231, 239, 242, 245, 247, 261
- `supabase/migrations/20261121000013_security_correction_phase1_1.sql`: 142, 178, 186, 193, 221, 240, 242, 269, 279, 285, 290, 292, 335, 358
- `supabase/migrations/20261121000014_security_corrections_phase1_1_1.sql`: 17, 39, 124, 138, 202, 203, 210, 245, 247, 254, 261, 288, 293, 295
- `supabase/migrations/20261121000018_superadmin_onboarding_invitations.sql`: 21, 24, 143, 147, 183
- `supabase/migrations/20261121000019_authorized_member_invitations.sql`: 43, 68, 75, 81, 104, 129, 199, 214, 236, 248
- `supabase/seeds/20261101000001_seed_catalog.sql`: 212
- `supabase/seed.sql`: 241, 274, 289, 304, 481, 502, 579, 636
- `supabase/clean_and_seed_superadmin.sql`: 221
- `supabase/rollbacks/20261121000014_rollback.sql`: 57, 93, 101, 108, 130, 149, 151, 189, 212
- `supabase/staging/phase1_1_1_structural_verification.sql`: 38, 44, 104, 105, 119, 135, 162, 164, 166
- `supabase/staging/phase1_1_1_behavioral_smoke.sql`: 28, 166

**Tests and integration fixtures:**

- `tests/security-auth-phase1.test.ts`: 52, 68, 87
- `tests/organizations.test.ts`: 76, 283
- `tests/organizations-page-crud.test.ts`: 234, 266
- `tests/rbac.test.ts`: 75, 82, 391, 407, 430
- `tests/security-phase1.test.ts`: 55, 81, 87, 96, 102, 112, 118, 127, 133, 367, 408, 445
- `tests/security-phase1-correction.test.ts`: 86, 87, 97
- `tests/security-phase1-containment.test.ts`: 49, 50, 69, 70, 72, 75, 76, 80, 83, 85, 105, 106, 109, 110, 117, 120, 122, 128, 129, 138, 139, 140, 144, 149, 150, 159, 160, 163, 172, 176, 182
- `tests/security-phase1-1-1-correction.test.ts`: 41, 43, 119, 135, 144, 149
- `tests/security-org-context-phase2.test.ts`: 132, 148, 164, 170, 180, 186, 196, 217
- `tests/security-isolation-phase3.test.ts`: 84, 92, 123, 130, 139, 146, 156, 163, 172, 179
- `tests/security-database-rls-phase4.test.ts`: 80, 106, 122, 148, 164, 217, 233, 262, 277, 388, 397, 405, 406, 421, 525, 535, 536, 569, 572, 583, 584, 585
- `tests/security-audit-integrity-phase5.test.ts`: 98, 124, 131, 141, 148, 168, 175, 185, 192, 431
- `tests/integration/security-phase1-postgres.integration.test.ts`: 197, 224, 234, 239, 254, 267, 269, 273, 419, 425
- `tests/integration/security-phase1-1-1-postgres.integration.test.ts`: 27, 29, 55, 96, 129, 144, 207, 223, 251, 252, 257, 258, 264, 270, 271, 396, 419, 450, 453, 457, 458, 462, 465, 469, 473, 564
- `tests/integration/security-phase1-2-provisioning.integration.test.ts`: 17, 54, 57, 75, 87, 95, 114, 123, 124

**Security documentation and historical reports:**

- `docs/security/SECURITY_PRODUCTION_READINESS.md`: 16
- `docs/archive/phase-1/phase1.1-verification-evidence.md`: 25, 106
- `docs/archive/phase-1/phase1.2-provisioning-remediation.md`: 11, 23, 80
- `docs/archive/phase-1/PHASE_1_1_FINAL_SECURITY_EVIDENCE_REPORT.md`: 23, 164, 233, 236, 242, 258, 260, 261, 262, 315, 328, 487
- `docs/archive/phase-1/SECURITY_REMEDIATION_REPORT.md`: 63, 84, 90, 95, 105, 106, 429, 431, 484, 524, 525, 528, 546, 550, 551, 581

Historical reports describe prior vulnerabilities and transitional plans; they do not substitute for inspection of the current deployed database.

## Database schema findings from migrations

| Object | Checked-in schema finding | Consequence for normalization |
|---|---|---|
| `roles` | `supabase/migrations/20261104000001_core_schema.sql:203-220` has `code`, `role_type`, `organization_id`, active/mutable flags, and scope check: SYSTEM implies NULL organization; CUSTOM implies non-NULL organization. Unique key is `(organization_id, code)`. | The checked-in seed defines `TENANT_ADMIN`; there can be other SYSTEM codes in a deployed DB unless inventory rules them out. |
| `user_roles` | `20261104000001_core_schema.sql:225-237` stores organization, user, role, assignment metadata, with primary key `(organization_id,user_id,role_id)`. It has no `is_active` or expiry field and only separate FKs to organizations/users/roles. | Duplicate role assignments and cross-organization role relationships are not prevented by a composite constraint in this schema. “Active assignment” cannot be measured from this table alone. |
| `role_permissions` | `20261104000001_core_schema.sql:279-286` stores `(organization_id,role_id,module_action_id)`; its FKs are independent. | Same role code can have different permission rows by organization context; role-code aliases do not prove equal effective permission sets. |
| `organization_members` | `20261104000003_audit_logs.sql:17-27` has `role_id`, `is_owner`, `is_active`, department, and unique `(organization_id,user_id)`. Role FK uses `ON DELETE SET NULL`. | It is a second assignment-like reference and also an independent owner authority source. A role update must consider both this field and `user_roles`. |
| `profiles` | Core schema and later policies include `is_organization_admin` and `is_super_admin`; migration 14 documents the profile admin path as transitional compatibility. | Role migration alone would not retire all administrator authority paths. |

No migration in the checked-in seed (`20261104000005_seed_default_user_roles.sql`) creates an `ORG_ADMIN` role or gives it an explicit permission matrix. The seed instead upserts `TENANT_ADMIN` at the fixed canonical id and states it replaces legacy `ADMIN`. This is evidence about repository migrations, **not** evidence of deployed role records or applied migration state.

## Permission comparison

| Capability | `TENANT_ADMIN` | `ORG_ADMIN` | Difference / confidence |
|---|---|---|---|
| Manage organization users | Admin predicate can authorize either code if active SYSTEM/global role is used; Phase 1.2 invitations provision canonical `TENANT_ADMIN`. | Same predicate alias when active SYSTEM/global; no separate role definition in checked-in seed. | Predicate behavior appears equivalent; actual deployed feature permission rows **NOT VERIFIED**. |
| Manage departments | RLS policies call `is_organization_admin()`. | Same if it satisfies that helper. | Same predicate path in later helper; deployed mapping **NOT VERIFIED**. |
| Assign custom roles | Service checks role type/scope/self restrictions; database RLS allows org-admin direct writes without equivalent role target/delegation checks. | If recognized by helper, same DB predicate can grant this broad policy. | Equivalent helper authority; API/service has a separate design; actual deployed path **NOT VERIFIED**. |
| Modify custom role permissions | RLS permits org admins to write in-scope `role_permissions`; service in memory restricts role scope but lacks authoritative persistence. | Same helper-based RLS path. | Same predicate, but role permissions may differ. |
| Manage organization settings | Policies generally use `is_organization_admin()` for organization-scoped writes. | Same if helper recognizes the role. | Predicate-level equivalence; no per-code comparison. |
| View organization payroll | Effective permission function uses permission rows and module/department eligibility. It does not elevate by role code. | Same evaluator; no code-based grant. | Could differ by `role_permissions`; assignments **NOT VERIFIED**. |
| Approve payroll | Effective permission depends on action mappings such as approval action and eligible module allocation. | Same evaluator. | Could differ by `role_permissions`; **NOT VERIFIED**. |
| Manage organization modules | Organization/dept module policies use administrator predicate. | Same helper path. | Predicate-level equivalence; actual deployed RLS state **NOT VERIFIED**. |
| Access other organizations | Helper requires requested organization and active membership; ordinary tenant routes are organization scoped. | Same helper conditions. | Neither code itself should grant cross-organization access; SuperAdmin is separate. Deployed policies **NOT VERIFIED**. |
| Assign privileged system roles | API in-memory service rejects SYSTEM/privileged roles for non-SuperAdmins; current direct RLS assignment policy does not enforce the same target-role restriction. Invitation SQL rejects SYSTEM and reserved codes. | Same policy weakness if actor is accepted by admin helper. | Neither role code changes the bypass risk; database RLS has broader authority than service/API. |

“Same” in this table means the checked-in helper recognizes both codes in that code path; it does not establish equal assigned permissions or deployed behavior. Frontend labels and visibility are not evidence of authorization.

## Assignment and deployed database status

No live or staging database was queried for this assessment. The repository contains integration tests that create synthetic role/membership fixtures, but those fixtures are not an inventory of deployed users. No read-only deployment connection or target environment was explicitly identified for this task.

| Requested deployed statistic | Result |
|---|---|
| `TENANT_ADMIN` role/assignment counts | **NOT VERIFIED** |
| `ORG_ADMIN` / `ORGANIZATION_ADMIN` role/assignment counts | **NOT VERIFIED** |
| Affected organization counts | **NOT VERIFIED** |
| Active/inactive role assignments | **NOT VERIFIABLE FROM CHECKED-IN `user_roles` SCHEMA**; table has no active flag |
| Duplicate assignments / users with both roles | **NOT VERIFIED** |
| Users with only `ORG_ADMIN` | **NOT VERIFIED** |
| Organizations lacking a canonical active administrator | **NOT VERIFIED** |
| Legacy `organization_members.role_id` references | Schema path exists; deployed references **NOT VERIFIED** |
| Role permission rows per role | **NOT VERIFIED** |

No employee identifiers or personal information were queried or included.

## Legacy dependencies and security risks

1. **Multiple administrator authorities:** `is_organization_admin()` can recognize owner membership, `user_roles`, transitional `organization_members.role_id`, and `profiles.is_organization_admin`. Removing a role-code alias alone may not remove access; stale fallback values can keep it active.
2. **Alias drift across migrations:** Migration 10 omits `TENANT_ADMIN` from one helper version; migration 14 later includes it alongside legacy aliases. Actual deployed function definitions depend on migration state and cannot be inferred from checked-in files alone.
3. **Direct-write privilege gap:** The RLS policies shown allow administrator-scoped direct writes to assignments and role permissions without enforcing the service’s SYSTEM-role, self-assignment, or delegation checks. Service-role bypass is a separate risk because RLS does not constrain it.
4. **Role-permission non-equivalence:** Effective permission resolution reads `role_permissions`; code aliases only affect selected admin predicates. An `ORG_ADMIN` role can therefore have a different data permission set while still satisfying admin policies.
5. **Assignment integrity gap:** Independent FKs allow a `user_roles.organization_id` to disagree with the referenced role’s scope or membership organization. There is no role-assignment active status in the base schema.
6. **Last-admin / lockout uncertainty:** Without deployed assignments, membership activity, owner rows, and effective assignment paths, safe merge/deprecation impact and last-admin effects cannot be evaluated.
7. **Frontend is not authoritative:** `isTenantAdmin` changes labels, data scope, and some UI behavior, but security depends on request context, database policies, and durable permissions.

## Migration risks and required preflight

Any future migration must be designed only after read-only staging inventory and architecture approval. Before mutation, it should report (without changing data):

- Role records matching the case-insensitive codes and their ids, types, organization ownership, active/mutable state, and permission counts.
- References from `user_roles`, `organization_members.role_id`, role permission tables, invitations, and any other role-id FKs.
- Duplicate assignments by organization/user and users with both canonical and legacy roles.
- Active organization memberships, owner status, profiles, and effective permissions before/after a proposed mapping.
- Organizations with no remaining active owner/admin under the approved definition.

If approved, a future migration should preserve role IDs and valid references until dependent references are handled, run updates atomically, avoid silently merging distinct permission sets, and include rollback guidance. This assessment makes no such changes.

## Required tests before normalization or Phase 3.1

- SQL-level role/permission inventory and referential integrity checks against a disposable database built from the exact deployed migration state.
- Effective permission comparison by role and organization, including payroll view/approval, department/module allocation, and direct grants.
- Authenticated non-service-role tests for direct `user_roles` and `role_permissions` writes, including SYSTEM roles and cross-tenant assignments.
- Tests for all administrator authority sources (owner, `user_roles`, membership `role_id`, profile flag), including inactive/suspended membership and expired organization.
- Duplicate and simultaneous assignment behavior; organization lockout and last-admin concurrency tests.
- API behavior and frontend visibility checks, clearly separated from database authorization assertions.
- Before/after permission snapshots for every affected test identity and organization.

## Recommendation and approval requirements

**Decision: D. INSUFFICIENT EVIDENCE.**

Evidence supports using `TENANT_ADMIN` as the canonical new provisioning role, but does not support merging deployed `ORG_ADMIN` assignments: no deployed role inventory or permission comparison is available, and current authorization uses several independent fallback sources. The identifiers share a code-based administrator predicate in later checked-in functions, but effective permissions are row-driven and may differ.

Before choosing **A (MERGE)**, **B (PRESERVE BOTH)**, or **C (DEPRECATE ORG_ADMIN)**, obtain:

1. The target staging/database identity and an authorized read-only connection for inventory queries.
2. Product/security approval of the exact organization-admin capabilities, including payroll viewing/approval and who may delegate them.
3. Approval of which of the legacy authority sources (`is_owner`, `organization_members.role_id`, profile admin flag) remain valid during and after transition.

No role normalization or Phase 3.1 work is authorized by this assessment. The master phase tracker was not changed.
