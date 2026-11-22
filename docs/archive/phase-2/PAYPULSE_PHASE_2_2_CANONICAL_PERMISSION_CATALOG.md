# PayPulse Phase 2.2 — Canonical Management Permission Catalog

**Status:** Implementation-Ready Architecture Specification (Critical Blocker Resolution)  
**Date:** 2026-11-22  
**System:** PayPulse (JK Payroll) — RBAC Catalog Specification  
**Document Reference:** `PAYPULSE_PHASE_2_2_CANONICAL_PERMISSION_CATALOG.md`  

---

## 1. Executive Summary & Root Cause of the Blocker

A major architectural blocker identified between Phase 2 and Phase 2.1 was the discrepancy between the **conceptual management permissions** described in architectural narratives and the **actual relational permission catalog** deployed in `supabase/seeds/20261101000001_seed_catalog.sql` and defined in `src/shared/constants/permissions.ts`.

### The Discrepancy
- **Conceptual Design Keys (Phase 2 narrative):**
  - `roles.view`
  - `roles.create`
  - `roles.update`
  - `roles.delete`
  - `roles.assign_permissions`
  - `users.assign_roles`
  - `users.manage_permissions`
- **Actual Deployed Seed Keys (`public.modules` & `public.module_actions`):**
  - `Role.View`, `Role.Add`, `Role.Edit`, `Role.Delete`
  - `UserRole.View`, `UserRole.Add`, `UserRole.Edit`, `UserRole.Delete`
  - `RolePermission.View`, `RolePermission.Add`, `RolePermission.Edit`, `RolePermission.Delete`
  - `UserPermission.View`, `UserPermission.Add`, `UserPermission.Edit`, `UserPermission.Delete`
  - `TenantModule.View`, `TenantModule.Add`, `TenantModule.Edit`, `TenantModule.Delete` (aliased in constants as `OrganizationModule.*`)

### The Risk of Premature Renaming
If the platform unilaterally migrated to `roles.view`, etc., it would:
1. Invalidate all existing unit, integration, and UI tests that assert `PERMISSIONS.ROLE.VIEW` (`Role.View`).
2. Require destructive updates or re-seeding of `public.modules` and `public.module_actions`, violating the forward-only migration rule (Rule 19).
3. Break existing client-side `PermissionGate` and `FLATTENED_NAV_SECTIONS` sidebar definitions.

### The Phase 2.2 Resolution
Phase 2.2 resolves this blocker by establishing the existing, deployed relational catalog in `public.modules` and `public.module_actions` as the **sole canonical catalog**. Rather than replacing the catalog with snake_case keys, the 7 conceptual management operations are definitively mapped to the exact relational records already present in the database.

---

## 2. Canonical Management Permission Mapping Matrix

The table below reconciles every conceptual management operation with its canonical relational module, action, full key, API routes, and UI touchpoints:

| Conceptual Management Permission | Canonical Module (`modules.code`) | Canonical Action (`module_actions.action`) | Canonical Full Key (`module_actions.full_key`) | UUID Primary Key (`module_actions.id`) | Seeded Status | Meaning / Intended Operation | Target API Endpoints | Target UI Operations | Architectural Decision |
|---|---|---|---|---|---|---|---|---|---|
| `roles.view` | `Role` | `View` | `Role.View` | `b0000000-0000-0000-0000-000000000191` | Seeded | Inspect custom roles, codes, descriptions, and active status. | `GET /api/roles`, `GET /api/roles/:id` | Role Directory list view, Role details modal. | **RETAIN AS CANONICAL** |
| `roles.create` | `Role` | `Add` | `Role.Add` | `b0000000-0000-0000-0000-000000000192` | Seeded | Create a new organization-owned `CUSTOM` role template. | `POST /api/roles` | "Create New Role" modal button & form submission. | **RETAIN AS CANONICAL** |
| `roles.update` | `Role` | `Edit` | `Role.Edit` | `b0000000-0000-0000-0000-000000000193` | Seeded | Modify role name, description, or soft-deactivate/archive role. | `PUT /api/roles/:id` | "Edit Role Details" form, "Archive Role" toggle. | **RETAIN AS CANONICAL** |
| `roles.delete` | `Role` | `Delete` | `Role.Delete` | `b0000000-0000-0000-0000-000000000194` | Seeded | Soft-archive unassigned role (Hard deletion prohibited). | `DELETE /api/roles/:id` | "Delete Role" confirmation dialog. | **RETAIN AS CANONICAL** |
| `roles.assign_permissions` | `RolePermission` | `Edit` | `RolePermission.Edit` | `b0000000-0000-0000-0000-000000000173` | Seeded | Modify the permission grant set assigned to an organization role. | `PUT /api/roles/:id/permissions`, `PUT /api/access-control/matrix/:roleId` | Role Permission Matrix grid toggles & "Save Matrix" action. | **RETAIN AS CANONICAL** |
| `users.assign_roles` | `UserRole` | `Edit` | `UserRole.Edit` | `b0000000-0000-0000-0000-000000000143` | Seeded | Assign or reassign an employee's single organization role. | `POST /api/user-roles`, `PUT /api/user-roles/:id` | Staff Profiles "Assign Role" dropdown in TableActionMenu. | **RETAIN AS CANONICAL** |
| `users.manage_permissions` | `UserPermission` | `Edit` | `UserPermission.Edit` | `b0000000-0000-0000-0000-000000000183` | Seeded | Toggle user mode (`ROLE` vs `USER_CUSTOM`) and allocate custom grants. | `PUT /api/users/:id/permissions` | "User Overrides" page, custom permission checkbox matrix. | **RETAIN AS CANONICAL** |

---

## 3. Detailed Analysis of Each Management Permission

### 1. `Role.View` (reconciling `roles.view`)
- **Module:** `Role` (`a0000000-0000-0000-0000-000000000019`)
- **Action:** `View` (`b0000000-0000-0000-0000-000000000191`)
- **Operation:** Permits querying the list of roles within the caller's organization.
- **Route Guard:** Must protect `GET /api/roles` and `GET /api/roles/:id`.
- **UI Location:** Administration > Role Directory (`/admin/roles`).
- **Overlap Analysis:** None. Distinct from `RolePermission.View`.

### 2. `Role.Add` (reconciling `roles.create`)
- **Module:** `Role` (`a0000000-0000-0000-0000-000000000019`)
- **Action:** `Add` (`b0000000-0000-0000-0000-000000000192`)
- **Operation:** Authorizes creating an organization-owned `CUSTOM` role. Triggers database enforcement that `role_type = 'CUSTOM'`, `organization_id` matches caller tenant, and role code is not a reserved system alias (`SUPERADMIN`, `ADMIN`, etc.).
- **Route Guard:** `POST /api/roles`.
- **UI Location:** Role Directory "Add Role" modal.

### 3. `Role.Edit` (reconciling `roles.update`)
- **Module:** `Role` (`a0000000-0000-0000-0000-000000000019`)
- **Action:** `Edit` (`b0000000-0000-0000-0000-000000000193`)
- **Operation:** Authorizes updating role name, description, and active status (`is_active`). Changing `organization_id` or role code to reserved names is rejected at the database level.
- **Route Guard:** `PUT /api/roles/:id`.
- **UI Location:** Role Directory "Edit Role" drawer.

### 4. `Role.Delete` (reconciling `roles.delete`)
- **Module:** `Role` (`a0000000-0000-0000-0000-000000000019`)
- **Action:** `Delete` (`b0000000-0000-0000-0000-000000000194`)
- **Operation:** Authorizes archiving a role. Database RPC asserts that no active user is currently assigned this role, and that the role is not the last manager role in the organization.
- **Route Guard:** `DELETE /api/roles/:id`.
- **UI Location:** Role Directory "Archive / Delete" action menu item.

### 5. `RolePermission.Edit` (reconciling `roles.assign_permissions`)
- **Module:** `RolePermission` (`a0000000-0000-0000-0000-000000000017`)
- **Action:** `Edit` (`b0000000-0000-0000-0000-000000000173`)
- **Operation:** Authorizes setting or modifying the matrix of permissions bound to a role. Every assigned action must be currently entitled in `public.organization_permissions`.
- **Delegation Principle:** The manager does NOT need to personally hold the permissions they are granting to a subordinate role; they only need `RolePermission.Edit` and the action must be licensed to the organization.
- **Route Guard:** `PUT /api/roles/:id/permissions`, `PUT /api/access-control/matrix/:roleId`.
- **UI Location:** Access & Security > Role Permission Matrix (`/admin/permissions`).
- **Coarseness Decision:** In `module_actions`, `RolePermission.Add` and `RolePermission.Delete` also exist. To prevent race conditions and inconsistent matrix state, role permission assignment is treated as an atomic set replacement guarded by `RolePermission.Edit` (with `RolePermission.Add`/`Delete` retained in seeds for granular API compatibility).

### 6. `UserRole.Edit` (reconciling `users.assign_roles`)
- **Module:** `UserRole` (`a0000000-0000-0000-0000-000000000014`)
- **Action:** `Edit` (`b0000000-0000-0000-0000-000000000143`)
- **Operation:** Authorizes assigning or changing a staff member's single assigned role. Enforces that the target user is an active member of the same organization and that the role is an active custom role owned by that organization.
- **Route Guard:** `POST /api/user-roles`, `PUT /api/user-roles/:id`.
- **UI Location:** Staff Profiles (`/admin/profiles`) > Action Menu > "Change Role".
- **Coarseness Decision:** While `UserRole.Add` and `UserRole.Delete` exist in the catalog, assigning a role in a single-role-per-user model is conceptually an atomic assignment/replacement. Guarding with `UserRole.Edit` (or requiring both `Add` and `Edit`) ensures clean auditability.

### 7. `UserPermission.Edit` (reconciling `users.manage_permissions`)
- **Module:** `UserPermission` (`a0000000-0000-0000-0000-000000000018`)
- **Action:** `Edit` (`b0000000-0000-0000-0000-000000000183`)
- **Operation:** Authorizes changing a user's `permission_mode` in `user_permission_settings` (`ROLE` vs `USER_CUSTOM`) and populating custom grants in `user_permission_assignments`.
- **Route Guard:** `PUT /api/users/:id/permissions`.
- **UI Location:** Access & Security > User Overrides (`/admin/security/user-overrides`).

---

## 4. Platform Entitlement Policy for Management Permissions

The question of whether all 7 management permissions should be granted to every organization by default was identified as an unresolved blocker.

### Approved Platform Policy:
1. **Mandatory Baseline Entitlements:** Every active organization provisioned on PayPulse MUST be entitled to the core management modules:
   - `Role`
   - `UserRole`
   - `RolePermission`
   - `UserPermission`
2. **Entitlement Initialization:** During organization onboarding (via `provision_organization_from_onboarding_invitation`), the provisioning transaction automatically creates `public.organization_modules` and `public.organization_permissions` for:
   - `Role.View`, `Role.Add`, `Role.Edit`, `Role.Delete`
   - `UserRole.View`, `UserRole.Add`, `UserRole.Edit`, `UserRole.Delete`
   - `RolePermission.View`, `RolePermission.Add`, `RolePermission.Edit`, `RolePermission.Delete`
   - `UserPermission.View`, `UserPermission.Add`, `UserPermission.Edit`, `UserPermission.Delete`
3. **Manager Role Baseline Grants:** The initial organization manager role (e.g. `ORG_ADMIN`) receives the 7 core management grants:
   - `Role.View`
   - `Role.Add`
   - `Role.Edit`
   - `Role.Delete`
   - `RolePermission.Edit`
   - `UserRole.Edit`
   - `UserPermission.Edit`
4. **No Business Permission Bundling:** The manager role is NEVER automatically entitled or granted business execution permissions (such as `PayrollComputation.*` or `TypeOfLeave.*`) during bootstrap. Business modules must be explicitly subscribed and allocated.

---

## 5. Resolution of Legacy Aliases: `Organization.*` vs. `Tenant.*`

In earlier iterations of PayPulse, "Organization" was termed "Tenant":
- Database tables: `tenants` was renamed to `organizations`, `tenant_modules` became `organization_modules`.
- Database Seed (`20261101000001_seed_catalog.sql`): Modules were seeded with code `Tenant` and `TenantModule`.
- Typescript Constants (`permissions.ts`): Declares both `PERMISSIONS.ORGANIZATION` and `PERMISSIONS.TENANT`, pointing to `Organization.View` / `Tenant.View`.
- Express Guard (`rbac.guard.ts` lines 58-67): Dynamically converts `Organization.*` <-> `Tenant.*`.

### Definitive Canonical Alignment:
1. **Canonical Database Code:** `Organization` and `OrganizationModule` are the canonical business domain terms.
2. **Migration Plan for Seed:** In Phase 3, a forward migration will update `public.modules.code` from `'Tenant'` to `'Organization'` and `'TenantModule'` to `'OrganizationModule'`, along with corresponding `public.module_actions.full_key` records.
3. **Zero-Downtime Transition:** During the transition, `rbac.guard.ts` alias resolution ensures 100% backward compatibility for all existing tests and tokens.

---

## 6. Authoritative Canonical Management Permission Catalog

Below is the definitive list of management permission keys to be used authoritatively across all Phase 2.2 specifications, API route guards, and database RPCs:

```json
{
  "management_permissions": [
    {
      "id": "b0000000-0000-0000-0000-000000000191",
      "full_key": "Role.View",
      "module": "Role",
      "action": "View",
      "conceptual_alias": "roles.view"
    },
    {
      "id": "b0000000-0000-0000-0000-000000000192",
      "full_key": "Role.Add",
      "module": "Role",
      "action": "Add",
      "conceptual_alias": "roles.create"
    },
    {
      "id": "b0000000-0000-0000-0000-000000000193",
      "full_key": "Role.Edit",
      "module": "Role",
      "action": "Edit",
      "conceptual_alias": "roles.update"
    },
    {
      "id": "b0000000-0000-0000-0000-000000000194",
      "full_key": "Role.Delete",
      "module": "Role",
      "action": "Delete",
      "conceptual_alias": "roles.delete"
    },
    {
      "id": "b0000000-0000-0000-0000-000000000173",
      "full_key": "RolePermission.Edit",
      "module": "RolePermission",
      "action": "Edit",
      "conceptual_alias": "roles.assign_permissions"
    },
    {
      "id": "b0000000-0000-0000-0000-000000000143",
      "full_key": "UserRole.Edit",
      "module": "UserRole",
      "action": "Edit",
      "conceptual_alias": "users.assign_roles"
    },
    {
      "id": "b0000000-0000-0000-0000-000000000183",
      "full_key": "UserPermission.Edit",
      "module": "UserPermission",
      "action": "Edit",
      "conceptual_alias": "users.manage_permissions"
    }
  ]
}
```

This mapping completely and unambiguously closes the Canonical Permission Catalog blocker.
