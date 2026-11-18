# Authorization & Security Policy Enforcement

Status: `IMPLEMENTED`

## 1. Enforcement Points
Authorization in JK Payroll is enforced at multiple architectural layers:

1. **Route Middleware (`rbac.guard.ts`):** Protects Express endpoints by evaluating required action keys (e.g. `requirePermission('Department.Add')`).
2. **Tenant Admin Guard (`requireTenantAdmin()`):** Confirms `req.user.isTenantAdmin === true` or `req.user.isSuperAdmin === true`.
3. **Super Admin Guard (`requireSuperAdmin()`):** Confirms `req.user.isSuperAdmin === true`. Restricts global module licensing and cross-tenant management.
4. **Data Scoping Middleware (`dataScopingMiddleware()`):** Attaches `req.dataScope` with allowed department IDs.
5. **Database Row Level Security (RLS):** Policies on PostgreSQL tables ensure database queries cannot read cross-tenant records.

---

## 2. Fail-Closed Guarantees (SEC-03 Compliance)
If permission calculation, database CTE procedures, or remote RPCs fail, throw network exceptions, or return null values:
- The system **FAILS CLOSED** by returning empty permissions.
- Under NO circumstance does the system grant default fallback actions or permit privileged access.
