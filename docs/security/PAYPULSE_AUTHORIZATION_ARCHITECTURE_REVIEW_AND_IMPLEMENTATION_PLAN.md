# PayPulse — Combined Authorization Architecture Review and Implementation Plan

# 1. Executive Summary

**The ADR is a clear target, but the current implementation is not ready to implement or deploy against it.** The main gaps are missing permission-level organization entitlements, additive user permissions instead of replacement mode, no database guarantee of one role per organization membership, and management authority based on broad administrator flags rather than explicit management permissions.

I inspected all 21 migration files in the working tree, the relevant backend, frontend, audit, and test sources, and two Supabase projects using read-only tools. **No files were changed; no tests or migrations were run.**

The two projects have different states:

- **Disposable verification project mdonkcclybalmvathrez (Jk-Auth):** active and healthy, with no public application tables or routines, no applied migrations, and no Auth users. It is a blank application-schema target.
- **Development project fsnfqnbixitmmjmeogml (jKyle08's Project):** active and healthy; migrations 1–19 are applied. It has 4 organizations, 7 global SYSTEM roles, and 8 audit rows—but no Auth users, profiles, memberships, departments, module catalog, permission catalog, or role/user grants. Migrations 20 and 21 are **not applied** there.

So the disposable project's “empty” status is verified, but it provides no live evidence for migrations 1–21. The development project provides live evidence only for migrations 1–19 and has no authorization users or grants to validate.

# 2. Verified Current Architecture

**Repository facts.** The workspace contains 21 migration files: migrations 1–20 plus 20261121153500_phase_3_1b_database_role_authorization_boundary.sql (the 21st). Migrations 20 and 21 are untracked working-tree files. The workspace also contains many other pre-existing edits and untracked files. I preserved them.

The working tree changes include is_active added to migration 1, although supabase/AGENTS.md says migrations 1–9 are immutable. The implementation plan should account for deployed schema state with forward migrations rather than editing old migration history.

**Database model in migrations 1–21.** The catalog is modules plus module_actions; there is no separate permission-entitlement table. organization_modules grants modules, while department_modules adds another department-level gate. user_permissions stores direct action grants, role_permissions stores role grants, and user_roles is keyed by (organization_id, user_id, role_id), which allows multiple roles for the same user and organization. organization_members separately stores role_id, is_owner, and active status; profiles also has a single organization_id, is_organization_admin, and is_super_admin. See the [core schema](../../supabase/migrations/20261104000001_core_schema.sql#L178) and [membership/audit schema](../../supabase/migrations/20261104000003_audit_logs.sql#L17).

**Permission resolution.** Migration 14 and the current in-memory repository implement **role permissions UNION direct user permissions**, subject to organization module and department-module eligibility. Migration 14 explicitly documents this additive model, and its integration tests assert it. The earlier migration 2 briefly used direct grants to replace role grants when direct rows existed, but still could not distinguish “no customization” from an empty custom set. The [current SQL resolver](../../supabase/migrations/20261121000014_security_corrections_phase1_1_1.sql#L450) and [in-memory resolver](../../src/server/db/repository.ts#L1409) both lack a separate permission mode.

**SuperAdmin and organization management.** profiles.is_super_admin is the current platform authority. Organization administration is still resolved from transitional membership ownership, global SYSTEM role assignments, and the profile admin flag. The organization middleware derives admin status from owner/profile flags; role, user-role, user-permission, and department-module routes use requireTenantAdmin, not the ADR's explicit management permissions. Migration 21 narrows role assignment to active, same-organization custom roles and blocks protected role codes, but does not enforce a single assignment.

**Express and persistence.** Production authentication resolves the user and organization context and calls the database permission RPC; RPC errors produce an empty permission set. However, role and permission management services mutate in-memory maps in src/server/db/repository.ts; the permission matrix controller also mutates those maps. Organization module methods update in-memory entitlement data and organization presentation data, not a durable transaction over the normalized authorization tables. See [auth middleware](../../src/server/middleware/auth.middleware.ts#L299), [role service](../../src/features/roles/role.service.ts#L254), and [organization service](../../src/features/organizations/organization.service.ts#L817).

**Frontend.** Role creation, role-permission editing, and role assignment screens exist. The PermissionMatrix component has custom-user override/reset props, but a repository-wide search found no usage of the component. User permission API routes exist, but the inspected user-role screens focus on role assignment rather than permission mode management.

**Audit and tests.** Database triggers cover organizations, departments, roles, user roles, profiles, and audit-log immutability. They do not cover role-permission assignments, user-permission assignments, organization module entitlements, or department module allocations. Controller audit calls are asynchronous and errors are swallowed; the audit service's Supabase insert result is not checked for a returned error. Existing tests include additive-permission behavior, role assignment rules, RLS, invitations, and audit behavior. I did not run them.

# 3. ADR Compliance Matrix

| ADR requirement | Current state | Assessment |
|---|---|---|
| SuperAdmin controls module **and permission** entitlements | organization_modules exists; no organization_permissions table. Module/permission catalog is empty in live development. | **Partial** |
| Organization roles distribute entitled permissions | Role permissions exist, but authorization is gated by an additional department-module layer; DB lacks composite role/organization constraints. | **Partial / conflict** |
| One active role per user per organization | user_roles primary key includes role_id, allowing several rows. organization_members.role_id duplicates assignment state. | **Non-compliant** |
| ROLE and USER_CUSTOM modes | No mode column/table. | **Missing** |
| Custom permissions replace role grants, including an empty set | Migration 14 and repository union grants. Empty direct set falls back to role grants. | **Non-compliant** |
| Managers can delegate any organization-enabled permission | Management routes gate on broad admin status. No per-permission entitlement check or explicit roles.* / users.* manager grants. | **Partial / non-compliant** |
| Active membership required | Membership is checked in permission resolution; migration 21 adds a role-assignment trigger check, but it is not applied to the development project. | **Partial** |
| Backend and database enforce authorization | Some RLS and Express checks exist, but role/permission mutation paths use in-memory maps and the service role bypasses RLS. | **Non-compliant in durable production path** |
| Every sensitive change is auditable | Some row triggers and controller logging exist; grant/entitlement rows lack trigger coverage, and app audit writes are not transactionally coupled. | **Partial** |
| Platform SuperAdmin remains distinct | Profile flag is the intended source and migration 20/21 block some organization-role aliases. Generic requirePermission still bypasses checks for SuperAdmin. | **Partial / unresolved** |

# 4. Critical and High-Risk Findings

1. **High — Direct database role escalation remains possible on the live development schema.** The live project has migration 19 applied, but not migrations 20 or 21. Migration 19's role-assignment RLS policy scopes the row by organization and admin status but does not validate the referenced role's organization or type. Migration 14 recognizes SYSTEM admin roles as an organization-admin source. The local migration 21 is a meaningful correction, but it is untracked and unapplied on the development project.

2. **High — No database single-role invariant.** The user_roles key permits multiple role rows per user and organization. The resolver unions grants from all matching role rows. Concurrent assignments can also create multiple roles because no unique constraint prevents them.

3. **High — Custom permissions do not replace role permissions.** Current migration 14 and repository code union both sources. This can leave a user with role permissions that an administrator intended to remove. Empty custom permissions also have no explicit representation.

4. **High — Permission-level entitlements are missing.** organization_modules grants modules but not individual permission keys. Organization permission changes cannot independently revoke a permission while the module remains enabled. The role service checks module allocation, not an organization permission entitlement.

5. **High — Department module gating conflicts with the ADR's three-level model.** department_modules participates in effective permission resolution and assignment validation. The ADR defines platform entitlements, organization roles, and user-specific permissions; it does not include department module allocation. Department data scoping can remain, but department module allocation should be removed from permission authorization unless the ADR is revised.

6. **High — Platform SuperAdmin bypasses normal permission checks.** requirePermission returns success for SuperAdmin before checking effective permission keys. That differs from the ADR's entitlement-first example and leaves SuperAdmin business-operation behavior unclear. Platform management routes should be separated from organization business access.

7. **High — Authorization mutations are not durably backed by the same data the production resolver reads.** Production authentication uses Supabase RPC results, while role and permission services mutate maps. A successful management response may therefore fail to persist the grants that the production permission resolver consumes.

8. **High — Organization management authority is too broad and not explicit.** requireTenantAdmin acts as the general gate for roles, role permissions, user roles, direct permissions, and department modules. It does not check the distinct roles.create, roles.assign_permissions, users.assign_roles, or users.manage_permissions authorities required by the ADR.

9. **High — Authorization grant changes are not consistently audited atomically.** Trigger coverage omits grant and entitlement tables; controller logs are asynchronous and swallowed on error, and the service ignores Supabase insert errors returned in the response. Audit failure can leave a successful mutation without a durable audit record.

10. **Medium — Live SECURITY DEFINER helper functions are executable by anon and authenticated.** Direct catalog inspection and the Supabase security advisor confirm public execution for helper functions including get_sub_department_ids, get_ancestor_department_ids, is_organization_member, and is_organization_admin. Department traversal can expose department identifiers across organizations; membership/admin helpers can be used as status oracles. The effective-permissions RPC itself is correctly not executable by those roles. The advisor also flags mutable search paths on two functions. [SECURITY DEFINER function advisor](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) · [Mutable search path advisor](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).

11. **Medium — Permission evaluation endpoint accepts a caller-supplied user ID.** POST /api/access-control/evaluate has authentication but no manager permission gate and evaluates the requested user from the body. It can expose permission-existence information about users outside the caller's organization. Bind the target to the validated organization and limit cross-user inspection to an explicit management permission.

12. **Medium — The custom-user permission UI is incomplete.** A custom-capable matrix component exists but is unused; the API has no explicit mode endpoint or mode state. The empty-permission transition cannot be communicated safely.

13. **Migration and compatibility risk — Current source and deployment history differ.** Development has migrations 1–19. The repository additionally has migrations 20–21, both untracked; migration 1 also has a pre-existing local edit. Treating the current working tree as already deployed would be incorrect.


# 5. Database Architecture Proposal

Keep module_actions as the permission catalog to avoid introducing a duplicate catalog called permissions. Add a relational entitlement from an organization to each action. Make every relationship organization-scoped with composite keys.

The following is the proposed logical DDL shape; it is a plan, not executed SQL:

    -- Existing catalog, strengthened
    ALTER TABLE public.module_actions
      ADD CONSTRAINT uq_module_actions_module_action UNIQUE (module_id, action),
      ADD CONSTRAINT uq_module_actions_id_module UNIQUE (id, module_id);

    -- Existing roles become organization-scoped assignable roles.
    -- Global SYSTEM roles are migrated into per-organization role records.
    ALTER TABLE public.roles
      ALTER COLUMN organization_id SET NOT NULL,
      ADD CONSTRAINT uq_roles_org_id UNIQUE (organization_id, id),
      ADD CONSTRAINT uq_roles_org_code UNIQUE (organization_id, code);

    -- Existing organization_modules remains the module entitlement.
    -- A row means enabled; deletion revokes it.
    CREATE TABLE public.organization_permissions (
      organization_id uuid NOT NULL,
      module_id uuid NOT NULL,
      module_action_id uuid NOT NULL,
      granted_at timestamptz NOT NULL DEFAULT now(),
      granted_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
      PRIMARY KEY (organization_id, module_action_id),
      FOREIGN KEY (organization_id, module_id)
        REFERENCES public.organization_modules (organization_id, module_id)
        ON DELETE CASCADE,
      FOREIGN KEY (module_action_id, module_id)
        REFERENCES public.module_actions (id, module_id)
        ON DELETE CASCADE
    );

    -- One current role row per active membership.
    CREATE TABLE public.user_roles_target (
      organization_id uuid NOT NULL,
      user_id uuid NOT NULL,
      role_id uuid NOT NULL,
      assigned_at timestamptz NOT NULL DEFAULT now(),
      assigned_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
      PRIMARY KEY (organization_id, user_id),
      FOREIGN KEY (organization_id, user_id)
        REFERENCES public.organization_members (organization_id, user_id)
        ON DELETE CASCADE,
      FOREIGN KEY (organization_id, role_id)
        REFERENCES public.roles (organization_id, id)
        ON DELETE RESTRICT
    );

    CREATE TABLE public.role_permissions_target (
      organization_id uuid NOT NULL,
      role_id uuid NOT NULL,
      module_action_id uuid NOT NULL,
      granted_at timestamptz NOT NULL DEFAULT now(),
      granted_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
      PRIMARY KEY (organization_id, role_id, module_action_id),
      FOREIGN KEY (organization_id, role_id)
        REFERENCES public.roles (organization_id, id)
        ON DELETE CASCADE,
      FOREIGN KEY (organization_id, module_action_id)
        REFERENCES public.organization_permissions (organization_id, module_action_id)
        ON DELETE CASCADE
    );

    CREATE TABLE public.user_permission_settings (
      organization_id uuid NOT NULL,
      user_id uuid NOT NULL,
      mode text NOT NULL CHECK (mode IN ('ROLE', 'USER_CUSTOM')),
      updated_at timestamptz NOT NULL DEFAULT now(),
      updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
      PRIMARY KEY (organization_id, user_id),
      FOREIGN KEY (organization_id, user_id)
        REFERENCES public.organization_members (organization_id, user_id)
        ON DELETE CASCADE
    );

    CREATE TABLE public.user_permission_assignments (
      organization_id uuid NOT NULL,
      user_id uuid NOT NULL,
      module_action_id uuid NOT NULL,
      granted_at timestamptz NOT NULL DEFAULT now(),
      granted_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
      PRIMARY KEY (organization_id, user_id, module_action_id),
      FOREIGN KEY (organization_id, user_id)
        REFERENCES public.user_permission_settings (organization_id, user_id)
        ON DELETE CASCADE,
      FOREIGN KEY (organization_id, module_action_id)
        REFERENCES public.organization_permissions (organization_id, module_action_id)
        ON DELETE CASCADE
    );

Production migration should introduce replacement tables under new names, copy and verify data, then retire the existing tables. The placeholder _target names above distinguish the proposed final shapes from existing objects.

**Additional constraints, indexes, and triggers:**

- organization_members: keep UNIQUE (organization_id, user_id); add a composite unique key on (organization_id, user_id) suitable for membership foreign keys. Ensure department_id belongs to that same organization, either by a composite FK or trigger.
- roles: all assignable roles must have an organization; the organization_id and role_id composite FK prevents cross-organization role assignment. Keep UNIQUE (organization_id, code).
- user_roles: its (organization_id, user_id) primary key enforces one current role. Role changes replace that row in a transaction; audit history records prior assignments.
- role_permissions and user assignments: composite foreign keys to organization_permissions make unentitled grants impossible. Deleting an entitlement cascades away grants so revocation cannot leave stale authority.
- Add indexes for effective lookups: (organization_id, user_id) on membership/settings/role assignment; (organization_id, role_id) on role grants; and (organization_id, module_action_id) on entitlement and user grants.
- A database trigger or atomic RPC must lock/check active membership before assigning a role. Effective resolution must independently check active membership and organization lifecycle.
- Permission catalogs should be platform-controlled. Normalize module and permission codes and prevent ambiguous duplicates.

**RLS and database functions:**

- Enable RLS on every exposed authorization table. Give anon no access. Scope authenticated reads to active membership in that organization.
- Allow entitlement writes only to platform SuperAdmins. Allow role edits only with the corresponding explicit role-management permission; user-role writes require users.assign_roles; user permission mode and custom grants require users.manage_permissions.
- Remove direct grants on internal SECURITY DEFINER helpers. Use a fixed search_path, revoke default PUBLIC execute, and grant only required roles. Keep resolver execution server-only if it is invoked with the service role.
- Remember that Express's service role bypasses RLS. Express must authorize first; constraints and triggers still enforce tenant, role, and entitlement integrity.
- Continue using PostgreSQL triggers or a single authorization mutation RPC to write audit events in the same transaction as each change. Keep audit records append-only and avoid secrets or unnecessary personal data in snapshots.

# 6. Backend and Frontend Implementation Plan

| Change | Affected files / objects | Dependencies | Expected behavior |
|---|---|---|---|
| Add permission-level entitlements and platform management endpoints | New migrations; src/features/organizations/organization.service.ts, organization.controller.ts, organization.routes.ts, organization.schema.ts; src/shared/constants/permissions.ts; organization SuperAdmin screens such as OrganizationFormPage.tsx / settings views | Catalog entries exist; platform identity source is settled | SuperAdmin can enable/disable a module and independently grant/revoke its permission keys. Organization managers cannot change entitlements. |
| Replace admin-flag gates with explicit manager permissions | src/server/middleware/rbac.guard.ts; src/server/middleware/auth.middleware.ts; src/features/roles/*; src/features/users/*; src/features/access-control/*; organization permission constants and role-grant UI | Manager permissions are catalogued and platform-entitled; role grants are durable | roles.* and users.* operations require the named authority, not generic admin status. Delegation can assign any organization-entitled business permission without requiring the manager to personally hold it. |
| Move role and grant changes to durable transactions | Replace authorization mutations in src/server/db/repository.ts; update src/features/roles/role.service.ts, access-control.controller.ts, users/user.service.ts, organizations/organization.service.ts; src/server/db/supabase.ts or a PostgreSQL transaction repository | New composite constraints/tables and DB write strategy | Success means the durable authorization state and audit record committed together. RPC/DB error means no mutation and a fail-closed response. |
| Implement mode replacement | Add shared permission mode types/schemas; update src/features/users/user.service.ts, user.controller.ts, user.routes.ts; update auth.middleware.ts permission load; add a user permission settings screen under src/features/users | New settings and assignment tables; transaction/audit mechanism | ROLE uses only role grants. USER_CUSTOM uses only user grants, including zero grants. Switching modes is atomic and audited. |
| Enforce single role in assignment flows | src/features/roles/role.service.ts, user-role.controller.ts, routes, hooks and role screens; membership context and provisioning RPCs in migrations 18–19 | Legacy role mapping complete; composite FK and unique key installed | A role change replaces the prior role; concurrent writes cannot create two assignments. |
| Replace user role UI and custom-permission UI | src/features/roles/components/RoleMain.tsx, RoleFormPage.tsx, UserRoleMain.tsx, UserRoleFormPage.tsx; wire or replace src/features/access-control/components/permission-matrix.tsx; add a user permission page/hook/client | New APIs, explicit modes and entitlement list | Administrators select one role or select USER_CUSTOM and configure a permission set. Empty custom set is visibly “no permissions”; reset explicitly changes to ROLE. |
| Correct permission evaluation and endpoint scoping | src/features/access-control/access-control.controller.ts, routes and permission service; src/server/middleware/rbac.guard.ts; DB resolver | Durable normalized grants and entitlement join | Resolve active org → membership → module entitlement → permission entitlement → selected mode → role/user grants. No client-supplied user or permission list establishes authority. Remove generic SuperAdmin business bypass and implicit View grants unless the ADR is amended. |
| Make authorization audit complete | src/features/audit-logs/audit-logs.service.ts; add DB audit objects/triggers/RPC writes for role grants, user grants, settings, and entitlements | Atomic mutation path and retention rules | A committed change always has an attributable audit event; an audit failure rolls back the change. |


# 7. Migration and Legacy Data Strategy

Use forward-only expand, migrate, enforce, contract steps. The next migration number should follow the current source sequence (21); do not rewrite migrations 1–9. The changed migration 1 in the working tree is pre-existing and must be reconciled separately with the immutability instruction before any release.

1. **Preflight and baseline inventory.** Compare source migration versions with the target ledger, schema, RLS, grants, functions, triggers, and row counts. The verified development project is at version 19; the disposable project is blank. Preserve these as separate environments.
2. **Catalog and entitlement foundation.** Seed and validate module/action catalogs; create organization permission entitlements; backfill module grants from organization_modules. Do not infer permission entitlement from a module row—SuperAdmin must grant each permission according to a reviewed mapping.
3. **Membership and role normalization.** Inventory and reconcile profiles.organization_id, organization_members.role_id, is_owner, legacy admin flags, and user_roles. In the currently inspected dev project there are no users or membership rows to map, but there are 4 organizations and 7 global SYSTEM roles. Do not automatically convert SYSTEM TENANT_ADMIN into organization authority; create org-scoped manager roles and explicitly assign management permissions.
4. **Single-role migration.** For each actual populated organization/user pair, select exactly one approved effective role. Stage conflicts in a report and require an explicit selection; do not choose by role order or privilege level. Add uniqueness only after zero conflicts are verified.
5. **User permission modes.** For each user with direct grants, obtain an explicit classification: retain role mode or switch to USER_CUSTOM. Preserve current effective access as the initial custom set only after entitlement filtering and owner approval. Write mode separately so an empty custom set remains empty.
6. **Provisioning and invitations.** Update onboarding/member invitation workflows (migrations 18–19) to create organization-scoped role records and a single role row. Ensure invitation role validation and membership checks remain atomic.
7. **Backend and RLS cutover.** Deploy durable transaction mutations, authorization checks, resolver, policies, and audit writes. Keep compatibility reads only for a bounded period; add monitoring for legacy reads/writes.
8. **Contract legacy sources.** After all consumers use canonical data, stop reading/writing profile organization/admin fields as authorization sources, organization_members.role_id, old user_permissions, JSONB organizations.modules for entitlement, and department_modules for permission decisions. Drop them only in a later forward migration after observed-zero usage.
9. **Verify deployment ledger and code version.** Test the exact forward chain on isolated PostgreSQL/Supabase, then stage and production only after separate approvals. Do not apply any migration as part of this review.

# 8. Security and Testing Strategy

**Database and authorization tests:**

- Module enabled but permission not entitled → denied; permission entitlement without module entitlement → rejected.
- User role grant or custom user grant outside organization_permissions → rejected by FK/trigger.
- Assign role from another organization, assign inactive role, assign without active membership, or assign a platform role → rejected at DB and API layers.
- Insert two roles concurrently for one membership → one succeeds, one conflicts; exactly one row remains.
- ROLE resolution ignores custom rows; USER_CUSTOM ignores role rows; empty custom set denies all; switches both directions with an audit record.
- Revoke module or permission entitlement → effective permission denied immediately; concurrent grant/revoke produces a serializable outcome.
- Manager with roles.assign_permissions but without payroll.delete can delegate it only if the organization has that permission entitlement. An ordinary payroll user cannot manage roles or permissions.
- Cross-organization x-organization-id, body organization ID, role ID, user ID, and permission ID tampering → denied.
- Suspended/expired organization, inactive profile, inactive membership, database error, missing role, resolver error, or malformed context → fail closed.
- SuperAdmin can manage platform entitlements but cannot automatically execute organization business operations unless the ADR explicitly grants that behavior.
- RLS and direct Data API tests verify all read/write commands, USING plus WITH CHECK, no anon access, and active membership scoping.
- SECURITY DEFINER execute grants/search paths are checked; test that untrusted roles cannot invoke internal helper functions.
- Last organization manager cannot be removed/demoted without an approved replacement or recovery path; concurrent demotion tests lock relevant membership/manager rows.

**Audit and UI tests:**

- Each entitlement, role, role-grant, assignment, permission-mode, and custom-grant mutation records old/new state and trusted actor within the same transaction.
- Force audit failure and verify mutation rollback.
- UI tests cover mode switching, empty custom permissions, disabled unentitled actions, and permission revocation refresh.

Existing tests that need replacement or extension include tests/rbac.test.ts, tests/user-roles.test.ts, tests/security-database-rls-phase4.test.ts, tests/security-audit-integrity-phase5.test.ts, and PostgreSQL integration suites under tests/integration/. This review did not execute them.

# 9. Implementation Roadmap

1. **Decision and environment gate:** settle the unresolved policy choices below; designate isolated staging; capture its full inventory. Current development project is not staging, and the disposable project is blank.
2. **Schema expand:** add permission entitlements, composite keys, permission modes, custom assignment tables, policies, indexes, and audit structures.
3. **Data reconciliation:** inventory populated production/dev role and membership rows, select one role per membership, map manager roles and direct grants, and produce a signed reconciliation report.
4. **Durable backend:** replace map-backed authorization mutations with transactional database writes; implement effective permission resolver and explicit delegation checks.
5. **Frontend:** expose platform module and permission entitlement controls; role management with explicit manager authorities; user role and ROLE/USER_CUSTOM permission management.
6. **Shadow verification:** compare old and new effective permission results and log mismatches without granting from the new path yet. Resolve each mismatch before cutover.
7. **Cutover and contract:** enforce constraints, switch resolver, stop legacy writes, monitor failures, then retire old sources in a later migration.
8. **Staging and release gates:** run concurrency, direct database, RLS, audit, and application integration tests on isolated staging. Production remains a separate approved release decision.

# 10. Unresolved Decisions and Risks

- **SuperAdmin business access:** Does platform SuperAdmin authority include business-operation bypass? The ADR's resolver example says no; the current Express guard says yes.
- **Department modules:** The ADR omits department module allocation. Confirm that it is removed from authorization while keeping department data scoping.
- **Manager bootstrap:** Which initial organization role receives roles.* and users.* permissions? How are existing owner memberships migrated without treating ownership as a permission?
- **Permission catalog:** Is module_actions retained as the canonical permission catalog, and which permission keys are enabled by default for new organizations?
- **View inheritance:** Existing code synthesizes View from mutating actions. The ADR's separate permission entitlement suggests no synthetic grant; confirm whether to remove it entirely.
- **Role history and deletion:** Keep one current assignment in user_roles and rely on immutable audit events, or maintain a separate assignment history table?
- **Custom permission retention:** On switching back to ROLE, retain a versioned dormant custom set or preserve it only in audit history?
- **Last manager and owner lifecycle:** Define replacement, emergency recovery, organization closure, and simultaneous manager-demotion behavior.
- **Membership selection:** Confirm how the selected organization context is conveyed to Postgres RLS for multi-organization users, not only to Express.
- **Deployment target:** The project described as disposable is separate from the project described as Development. Neither was treated as permission to change state.

# 11. Final Readiness Assessment

| Area | Assessment |
|---|---|
| **Architecture** | **Conditionally ready as a target.** The ADR is clear; SuperAdmin business bypass, department allocation, and View inheritance need explicit reconciliation with existing behavior. |
| **Implementation planning** | **Ready for review.** Dependencies, target schema, affected code areas, migration sequence, and test strategy are defined above. |
| **Code implementation** | **Not ready.** Significant authorization and persistence changes remain; no implementation was performed or authorized by this report. |
| **Database migration** | **Not ready.** Development is at migration 19; source migrations 20–21 are untracked and unapplied there. The verification project has no application schema. |
| **Staging verification** | **Not ready.** The current development project is not an isolated staging environment, and the blank disposable project has not had migrations applied or behavior tested. |
| **Production deployment** | **Not ready / not approved.** No production verification or release approval was performed. |

This review and plan do **not** authorize code changes, database writes, migration execution, staging deployment, or production deployment.
