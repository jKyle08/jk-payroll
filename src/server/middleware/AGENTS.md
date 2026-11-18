# `src/server/middleware/` Directory Agent Instructions

## Scope & Purpose
Contains Express middleware functions governing security, authentication, cascading RBAC authorization, data scoping, and payload validation.

---

## Key Middlewares
1. **`auth.middleware.ts`:**
   - Extracts Bearer JWT.
   - Verifies token via local `ENV.JWT_SECRET` with Supabase Auth fallback.
   - Injects `req.user` (`AuthUserContext`).
   - Rejects inactive accounts (`user.isActive === false`) and expired organizations (`org.endDate < today`).
   - Preloads `req.effectivePermissions`.
2. **`rbac.guard.ts`:**
   - `requirePermission(actionKey)`: Evaluates required key against `req.permissionSet` with implicit `.View` inheritance. Super Admin bypasses.
   - `requireTenantAdmin()`: Restricts access to Tenant Admins or Super Admins.
   - `requireSuperAdmin()`: Restricts access exclusively to global Super Admins.
3. **`data-scoping.middleware.ts`:**
   - Evaluates departmental row visibility (`Self`, `SubDepartment`, `EntireDepartment`, `Tenant`).
4. **`validate.middleware.ts`:**
   - Executes Zod schema validation against `req.body`, returning HTTP 400 on error.
