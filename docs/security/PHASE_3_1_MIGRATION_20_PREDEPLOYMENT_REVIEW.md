# Phase 3.1 — Migration 20 Pre-Deployment Review

**Review type:** Source-only security and deployment-readiness audit  
**Reviewed:** 2026-11-21 (Asia/Manila)  
**Executive determination:** **NOT READY**  
**Migration 20 applied:** No  
**Production approval:** **Not granted**

## Executive determination

Do not apply Migration 20 yet. It blocks exact `SUPER_ADMIN` spellings on the two assignment tables and serializes an assignment against role-code changes using a role-row lock. However, SQL `TRIM` does not normalize all whitespace, the database guard covers fewer privileged codes than the application guard, and the existing authenticated `user_roles` RLS policy lets an organization administrator insert or update assignments without checking that the selected role is permitted for that organization. In particular, it permits direct `TENANT_ADMIN` assignment, which Migration 14 recognizes as an organization-admin source. The first-owner RPC authorization is not distinguished from a direct assignment by Migration 20.

Migration 20 also cannot make the current in-memory role repository durable or protect direct writes to that repository. Existing role assignments have not been inventoried. The missing database and concurrency cases listed below must be reviewed before applying this migration to development.

This determination is about development application readiness. Production approval is a separate decision and remains **NO**.

## Migration source review

Reviewed `supabase/migrations/20261121000020_separate_superadmin_role_authority.sql` without editing or applying it.

The migration is transactional and introduces two PL/pgSQL trigger functions:

1. `reject_superadmin_role_assignment()` looks up `NEW.role_id`, normalizes with `upper(trim(code))`, locks the referenced role row `FOR SHARE`, and rejects only `SUPER_ADMIN`, `SUPERADMIN`, and `PLATFORM_SUPER_ADMIN`.
2. `reject_superadmin_role_code_with_assignments()` rejects a change from a non-protected old role code to one of those three codes when it finds a referencing `user_roles` or `organization_members` row.

The first function is attached to `BEFORE INSERT OR UPDATE OF role_id` on both assignment tables. The second is attached to `BEFORE UPDATE OF code` on `roles`. These events cover a write that changes both `organization_id` and `role_id`, because `role_id` is included in the update and the trigger inspects the referenced role independent of organization. They do not validate that `organization_id` matches the referenced role's organization. An update of `organization_id` alone does not fire these triggers; that can move a pre-existing protected assignment if one is already present.

The assignment function does not fire for an update that omits `role_id`, such as changing only `organization_id`. For a new assignment or a role reassignment, the role ID event is covered. The role-code trigger sees both assignment tables and does not filter inactive rows, which is appropriate for preventing a role with historical references from becoming a protected role. It does not clean up pre-existing protected assignments, and it does not reject an alias-to-alias code update; neither behavior removes the original protected assignment.

`upper(trim(...))` is case-insensitive and strips leading/trailing ordinary space characters. PostgreSQL's default `trim`/`btrim` does not remove tabs, CR/LF, or every POSIX whitespace character. A role code such as `E'\tSUPER_ADMIN\t'` can therefore evade both trigger predicates when inserted directly into `roles` and then assigned. The role schema has no database CHECK constraint constraining `roles.code`; application schemas do not protect direct SQL or service-role writes.

The database guard's protected-code set is narrower than `RoleService` and the dropdown set. The application treats `SUPER_ADMIN`, `SUPERADMIN`, `PLATFORM_SUPER_ADMIN`, `TENANT_ADMIN`, `ORGANIZATION_ADMIN`, `ORG_ADMIN`, and `ADMIN` as protected for general role assignment. Migration 20 only rejects the first three. Direct database assignment of `TENANT_ADMIN` is especially sensitive: the existing RLS policy permits it for an organization admin, and Migration 14 recognizes active SYSTEM `TENANT_ADMIN` assignments as an organization-admin authority source. The legitimate first-owner provisioning RPC also assigns `TENANT_ADMIN`, so a safe database rule needs to preserve that trusted path while denying the equivalent ordinary authenticated write.

### Trigger/function security

| Function | Security mode | Search path | Execution ACL | Review |
|---|---|---|---|---|
| `reject_superadmin_role_assignment()` | `SECURITY DEFINER` | Fixed to `public, pg_temp` | `REVOKE ALL` from `PUBLIC`, `anon`, `authenticated`; no direct grant to `service_role` | Trigger-only usage is the intended path. It reads the role under `FOR SHARE`; a protected code raises SQLSTATE `42501`. Missing role yields NULL and does not itself raise, leaving FK enforcement to reject a nonexistent role. |
| `reject_superadmin_role_code_with_assignments()` | `SECURITY DEFINER` | Fixed to `public, pg_temp` | Same revoke; no direct grant | Trigger-only usage is intended. It raises `42501` for an assigned role rename to one of the listed protected codes. |

The fixed search path and schema-qualified table references reduce object-shadowing risk; `pg_temp` is last. Neither function has explicit exception masking, so database errors fail the write closed. Trigger calls do not constitute a public RPC path, and the revoked ACLs prevent ordinary SQL `EXECUTE` by the named client roles. The migration does not record or confirm the function owner, grants, trigger enablement, or deployment state on a live database; catalog verification is still required after an approved development deployment.

The `FOR SHARE` lock is a sound serialization mechanism to test: assignment first should make a subsequent rename observe a reference and fail; rename first should cause assignment to wait and then read the protected code. No two-session PostgreSQL test is present. PGlite evidence is not proof of PostgreSQL concurrency semantics or the deployed trigger state. Require a two-connection test on a confirmed development PostgreSQL target before treating this property as verified. PostgreSQL's documentation distinguishes statement snapshots and the visibility of commands issued inside trigger functions; see [transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html) and [trigger data visibility](https://www.postgresql.org/docs/current/trigger-datachanges.html).

## Existing migrations 1–19 and authorization paths

- Migration 1 constrains `role_type`/organization scope but does not constrain role-code spelling in the database.
- Migration 5 seeds the global `SUPER_ADMIN` and `TENANT_ADMIN` role definitions.
- Migration 10's `user_roles_insert_policy` permits either `public.is_super_admin()` or an active organization admin inserting a row whose `organization_id` is the current organization. It does not validate the selected `role_id`, the role's `role_type`, or its `organization_id`. The update policy has the same missing role validation in its `WITH CHECK`. Its `organization_members` insert/update policies likewise authorize by organization and actor but do not validate the referenced role's scope/type; Migration 20 checks only the protected platform-SuperAdmin aliases.
- Migration 14's `is_organization_admin()` treats active membership with an owner flag, a profile admin flag, or an assigned active global SYSTEM admin code (`TENANT_ADMIN`, `ORGANIZATION_ADMIN`, `ORG_ADMIN`, `ADMIN`) as organization-admin authority. It explicitly documents role-assignment authority as transitional.
- Migration 18's onboarding function creates the organization owner and assigns SYSTEM `TENANT_ADMIN`; it also sets `profiles.is_super_admin = false`. Migration 20's SuperAdmin-only aliases do not block this onboarding assignment. Migration 19 invitation provisioning restricts roles to active, organization-scoped custom roles and excludes its exact privileged-code list, but the SQL comparison uses `upper(code)` without whitespace normalization. Migrations 18 and 19 were not modified.
- Migration 13's `public.is_super_admin()` checks the active caller's `profiles.is_super_admin`; current auth middleware hydrates `isSuperAdmin` from the profile. This supports the intended canonical platform authority. Do not infer a deployed database definition from migration source alone.

## Application consistency and alternate paths

- `RoleService.createUserRole` and `updateUserRole` normalize role codes with JavaScript `trim().toUpperCase()` and reject the application set of protected role codes. Ordinary authenticated API POST/PUT requests route through this service. The route guard admits SuperAdmins and organization admins; the service is the relevant code-level boundary.
- The controller builds the actor object with `isSuperAdmin` and `tenantId`, but omits `userId`. The service's self-assignment checks compare `actor.userId` to the target user, so those checks do not work for calls routed through this controller. That is an adjacent API authorization defect requiring separate review; the privileged role-code check still runs for these calls.
- The organization selector filters to selected-organization roles marked non-system and excludes protected codes after trimming/case normalization. It is defense in depth, not an authorization boundary.
- Some navigation presentation code (`AppLayout`/`AppSidebar`) also infers “SuperAdmin” UI visibility from role labels or `userPermissions` values such as `SUPER_ADMIN`/`*`. Backend authorization reviewed here uses the profile-derived flag; the UI inference is not an authority boundary, but should not be mistaken for proof that every presentation layer uses the canonical flag exclusively.
- No general SQL role-assignment RPC was found in migrations 1–19. The SQL provisioning paths are the invitation functions in migrations 18 and 19. The regular `RoleService` calls `db.assignUserRole` and `db.updateUserRole` on an in-memory `Map` repository; those repository methods perform no authorization or database persistence of their own.
- `db.seedCatalog()` directly seeds an in-memory `SUPER_ADMIN` user-role row for its root SuperAdmin fixture. It is not a grant of platform authority in current middleware, which derives that authority from the profile flag, but it contradicts the desired clean separation and can mislead tests or future consumers that interpret role assignments as authority.
- Other direct internal callers of `db.assignUserRole` can bypass `RoleService` checks. No independent production HTTP route to that method was found, but this repository architecture is not a durable, database-enforced production role-assignment boundary.

The RLS policy gap remains a separate direct-database path: a tenant administrator with authenticated access can assign SYSTEM `TENANT_ADMIN` directly in either `user_roles` or `organization_members`, and Migration 20 does not stop it. Migration 14 can treat those assignments as organization-admin authority. The RLS paths can also assign a role from another organization unless another database constraint/policy not present in migrations 1–20 prevents it. This is not equivalent to changing `profiles.is_super_admin`, but it can grant organization-admin authority and violates the application/database consistency expected for protected role assignments.

## Read-only target inventory SQL

The following statements are **for later use only**. They were not executed. Run them only after positively verifying the exact development project reference and environment. Each statement is read-only.

```sql
-- Normalize case and remove whitespace, underscores, and hyphens so common
-- spelling aliases are surfaced together for manual review.
WITH normalized_roles AS (
    SELECT r.id, r.code, r.name, r.role_type, r.organization_id, r.is_active,
           upper(regexp_replace(r.code, '[[:space:]_-]+', '', 'g')) AS normalized_code
    FROM public.roles r
)
SELECT id, code, normalized_code, name, role_type, organization_id, is_active
FROM normalized_roles
WHERE normalized_code IN (
    'SUPERADMIN', 'PLATFORMSUPERADMIN',
    'TENANTADMIN', 'ORGANIZATIONADMIN', 'ORGADMIN', 'ADMIN'
)
ORDER BY normalized_code, organization_id NULLS FIRST, code;
```

```sql
-- All protected-role assignments in user_roles, including inactive roles.
WITH normalized_roles AS (
    SELECT r.id, r.code, r.name, r.role_type, r.organization_id AS role_organization_id,
           r.is_active AS role_is_active,
           upper(regexp_replace(r.code, '[[:space:]_-]+', '', 'g')) AS normalized_code
    FROM public.roles r
)
SELECT 'user_roles' AS source, ur.organization_id AS assignment_organization_id,
       ur.user_id, ur.role_id, nr.code, nr.normalized_code, nr.role_type,
       nr.role_organization_id, nr.role_is_active
FROM public.user_roles ur
JOIN normalized_roles nr ON nr.id = ur.role_id
WHERE nr.normalized_code IN (
    'SUPERADMIN', 'PLATFORMSUPERADMIN',
    'TENANTADMIN', 'ORGANIZATIONADMIN', 'ORGADMIN', 'ADMIN'
)
ORDER BY nr.normalized_code, ur.organization_id, ur.user_id;
```

```sql
-- All protected role references in organization_members, including inactive rows.
WITH normalized_roles AS (
    SELECT r.id, r.code, r.name, r.role_type, r.organization_id AS role_organization_id,
           r.is_active AS role_is_active,
           upper(regexp_replace(r.code, '[[:space:]_-]+', '', 'g')) AS normalized_code
    FROM public.roles r
)
SELECT 'organization_members' AS source, om.organization_id AS assignment_organization_id,
       om.user_id, om.role_id, nr.code, nr.normalized_code, nr.role_type,
       nr.role_organization_id, nr.role_is_active, om.is_active AS membership_is_active,
       om.is_owner
FROM public.organization_members om
JOIN normalized_roles nr ON nr.id = om.role_id
WHERE nr.normalized_code IN (
    'SUPERADMIN', 'PLATFORMSUPERADMIN',
    'TENANTADMIN', 'ORGANIZATIONADMIN', 'ORGADMIN', 'ADMIN'
)
ORDER BY nr.normalized_code, om.organization_id, om.user_id;
```

```sql
-- Canonical platform SuperAdmin profiles and their active state.
SELECT p.id, p.email, p.full_name, p.is_active, p.is_super_admin,
       p.organization_id, p.created_at
FROM public.profiles p
WHERE p.is_super_admin IS TRUE
ORDER BY p.created_at, p.id;
```

The role inventory should be retained as review evidence. Do not repair assignments automatically. Existing protected assignments or mismatched role/assignment organizations require a reviewed remediation decision before deployment.

## Regression evidence and missing coverage

The previous remediation turn actually ran the focused suites locally: **37/37** tests across 29 API tests and 8 PGlite provisioning tests. It also ran `npm run build` successfully. Those results are local source/embedded evidence only; tests were not rerun for this read-only review, and none is live-database verification. The prior remediation note has wording inconsistencies: it first says “Pending execution” and then reports the run; additionally, it says `updateUserRole` checks the current assignment when only another field changes, but the current implementation validates a role only when `data.roleId` is supplied. Use the source and actual command output as evidence, not those inaccurate report sentences.

| Required case | Existing evidence | Gap |
|---|---|---|
| SuperAdmin POST cannot assign `SUPER_ADMIN` | API test | Exact code only. |
| SuperAdmin PUT cannot change role to `SUPER_ADMIN` | API test | Exact code only; no whitespace/case variants. |
| Organization Admin cannot assign `SUPER_ADMIN` or `ORG_ADMIN` | API tests | These exercise application service, not direct RLS writes. |
| Valid organization custom-role assignment | API test | Covered at API/in-memory level. |
| First-owner `TENANT_ADMIN` provisioning | PGlite test | Covered atomically with `is_super_admin = false`; not a live PostgreSQL deployment. |
| Same-identity invitation retry | PGlite tests for migrations 18 and 19 | Covered locally. |
| Different-identity redemption rejection after a successful redemption | Not found in the focused PGlite file | Missing. The “wrong-email” case rejects before any redemption and does not prove a different identity is rejected on replay. |
| Database `profiles.is_super_admin` authority | PGlite test checks fixture flag and assignment write failure; migration 13 source and middleware support it | Does not invoke the SQL authority function under authenticated identity or test deployed function/ACL and auth-profile binding. |
| Protected aliases with mixed case | Not covered in SQL trigger test | Add SQL-trigger tests for lowercase/mixed-case aliases. |
| Whitespace variants | Not covered | Add tabs/newlines and ordinary-space tests; current implementation fails tab/newline normalization. |
| Role-code rename with references | Not covered | Test both assignment tables and protected-to-protected transitions. |
| Assignment racing role-code rename | Not covered | Require a true PostgreSQL two-session test; PGlite single-session tests do not prove lock behavior. |
| Membership organization/role reassignment | Not covered | Test simultaneous changes and organization-only updates on legacy protected references. `UPDATE OF role_id` fires for a combined organization/role change, but does not enforce role/organization scope consistency. |
| Direct authenticated RLS assignment of protected codes / SYSTEM admin roles | Not covered | Exercise RLS as `authenticated`, especially `TENANT_ADMIN`, cross-organization roles, and UPDATE. |

The existing PGlite test covers direct INSERT rejection only for the canonical `SUPER_ADMIN` role on both assignment tables. It does not cover direct UPDATE, role rename protection, normalization aliases, or concurrency.

## Exact development-environment verification requirements

Before any development application:

1. Positively identify the exact project reference and confirm it is the intended disposable development project. Compare the Supabase Dashboard project reference, linked CLI project, and the configured project URL host. Do not expose service-role credentials in logs or chat.
2. Inspect `supabase status`/project-link state and `supabase migration list --linked` read-only. Confirm the target's ledger is exactly the expected baseline and migration 20 is not already recorded. Resolve any drift before any apply step.
3. Confirm database ownership, migration runner role, role/function owners, whether the target is PostgreSQL (not only embedded PGlite), RLS enabled/forced state, and all effective `user_roles` policies. Capture trigger definitions/enablement and function ACLs from system catalogs after an approved application.
4. Run only the inventory SELECTs above against the positively verified development project. Review all protected role definitions, assignments, profile SuperAdmins, and org/role scope mismatches. Do not delete, update, or repair rows as part of this review.
5. Resolve the blockers below and add missing tests before applying. Do not use the full `npm test` suite against an unverified project; the repository's existing full suite includes service-role Supabase writes.
6. After separate authorization to apply, run migration 20 only against that verified development target, then verify the actual migration ledger, both assignment triggers, role-code trigger, function owners/ACLs, and RLS behavior. Run controlled direct-write, alias, onboarding, and two-session concurrency checks in development, without resetting the database.
7. Record actual project reference, migration version, test commands/results, and any existing data exceptions. This source review supplies none of that live evidence.

## Bypass scenarios / unresolved risks

1. **Tab/newline whitespace alias:** direct SQL can create a protected code containing tab/CR/LF whitespace; `upper(trim(code))` in Migration 20 does not remove it. Assignment and role rename guards can miss it. The same spelling can pass Migration 19's `upper(code) NOT IN (...)` eligibility predicate for an organization CUSTOM role, then pass the migration 20 trigger during invitation redemption.
2. **Application/database privileged-code mismatch:** database triggers only reject three aliases, while application code treats seven codes as privileged. Direct SQL may assign SYSTEM `TENANT_ADMIN` or other admin codes. The RLS policy in Migration 10 permits organization admins to write those rows; Migration 14 recognizes some as organization-admin authority.
3. **Role scope mismatch:** the final `user_roles` and `organization_members` RLS policies check actor/assignment organization but not whether `NEW.role_id` belongs to that same organization or is an allowed role type. Migration 20 has no such validation. A cross-organization role reference or SYSTEM role assignment remains possible through direct authenticated writes subject to current RLS.
4. **Legacy rows:** Migration 20 installs future-write triggers but does not fail on or remove existing protected assignments. Existing rows can remain and can be changed in ways not covered by `UPDATE OF role_id`, such as moving their `organization_id` alone.
5. **In-memory bypass/persistence:** internal code can call repository assignment methods directly, and seeded in-memory catalog data creates a `SUPER_ADMIN` user-role row. Database triggers do not protect that repository. API writes are in-memory and are not durable database operations.
6. **Actor context omission:** role API controllers do not pass `userId` to `RoleService`, leaving its self-assignment check ineffective for API requests. This is not a SuperAdmin-code bypass by itself, but weakens the surrounding organization-admin assignment controls.
7. **Concurrency proof:** the role row lock should serialize the opposing writes, but the current suite contains no two-session PostgreSQL test. Do not claim the lock race is live-verified.

## Blockers before applying Migration 20

1. Expand database normalization to handle all whitespace consistently and define one canonical protected-code list shared by the UI, service, invitation provisioning, and database controls.
2. Decide and enforce how ordinary authenticated organization admins are prevented from assigning privileged SYSTEM roles such as `TENANT_ADMIN`, while the authorized first-owner provisioning RPC remains functional. Existing migration 10 policies currently allow the assignment.
3. Validate role organization/type against assignment organization at the database boundary, or document an approved architectural boundary that makes direct writes impossible. Current RLS policy does not do this.
4. Inventory existing data on a positively verified development project and review protected assignments/aliases before application; do not auto-repair them.
5. Add direct SQL UPDATE, role rename, case/whitespace, simultaneous org+role update, cross-scope, and authenticated-RLS tests. Add a true two-connection PostgreSQL test for assignment-versus-rename locking.
6. Resolve the controller actor-context omission and decide how the in-memory repository is kept out of production authorization or replaced by a durable, guarded writer.
7. Verify exact development project identity and migration ledger, then obtain explicit approval for the development application. No migration was applied in this review.

**Production status:** Not approved. Development readiness, even after blockers are closed, will not constitute production approval.
