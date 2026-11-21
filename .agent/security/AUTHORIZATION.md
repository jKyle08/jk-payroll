# Authorization & Security Policy Enforcement

Implementation guidance. Phase status and production approval are tracked in [the security master tracker](../../docs/security/SECURITY_REMEDIATION_MASTER_TRACKER.md); see the [architecture baseline](../../docs/security/SECURITY_ARCHITECTURE_BASELINE.md) for current constraints. This file is not a phase tracker.

## 1. Enforcement Points
Authorization in JK Payroll is enforced at multiple architectural layers:

1. **Route Middleware (`rbac.guard.ts`):** Protects Express endpoints by evaluating required action keys (e.g. `requirePermission('Department.Add')`).
2. **Tenant Admin Guard (`requireTenantAdmin()`):** Requires current organization context and administrator authority; profile flags alone are not membership proof. See the architecture baseline and current middleware before changing this guard.
3. **Super Admin Guard (`requireSuperAdmin()`):** Confirms `req.user.isSuperAdmin === true`. Restricts global module licensing and cross-tenant management.
4. **Data Scoping Middleware (`dataScopingMiddleware()`):** Attaches `req.dataScope` with allowed department IDs.
5. **Database Row Level Security (RLS):** Policies on PostgreSQL tables ensure database queries cannot read cross-tenant records.

---

## 2. Fail-Closed Guarantees (SEC-03 Compliance)
If permission calculation, database CTE procedures, or remote RPCs fail, throw network exceptions, or return null values:
- The system **FAILS CLOSED** by returning empty permissions.
- Under NO circumstance does the system grant default fallback actions or permit privileged access.

## 3. Current authority notes

- Tenant authorization requires active membership in the target active organization.
- Legacy administrator fields may remain transitional authority inputs only when the current implementation also verifies active membership and organization state.
- SuperAdmin onboarding and member registration must follow the trusted invitation paths documented in the [architecture baseline](../../docs/security/SECURITY_ARCHITECTURE_BASELINE.md).
