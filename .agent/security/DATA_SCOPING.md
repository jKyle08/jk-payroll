# Departmental Data Scoping & Row Visibility

Implementation guidance. Phase status and production approval are tracked in [the security master tracker](../../docs/security/SECURITY_REMEDIATION_MASTER_TRACKER.md); see the [architecture baseline](../../docs/security/SECURITY_ARCHITECTURE_BASELINE.md) for current constraints. This file is not a phase tracker.

## 1. Scope Definitions (`DataScope`)
Defined in [src/shared/types/index.ts](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/src/shared/types/index.ts) and enforced in [src/server/middleware/data-scoping.middleware.ts](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/src/server/middleware/data-scoping.middleware.ts):

| Scope | Visibility Rule | Typical Persona |
| :--- | :--- | :--- |
| **`Self`** | `record.userId === user.userId` | General Staff Employee |
| **`SubDepartment`** | `record.departmentId === user.departmentId` | Team Supervisor |
| **`EntireDepartment`** | Current department + recursively all descendant sub-departments | Department Head / Division Director |
| **`Tenant`** | All records across the entire organization | Tenant Admin / Super Admin |

---

## 2. Downward CTE Department Resolution
When evaluating `EntireDepartment` scope, the service executes `db.getDepartmentSubTree(user.tenantId, user.departmentId)`:
```typescript
const subTree = db.getDepartmentSubTree(user.tenantId, user.departmentId);
const allowedDeptIds = new Set(subTree.map((d) => d.id));
return tenantRecords.filter((r) => allowedDeptIds.has(r.departmentId));
```
