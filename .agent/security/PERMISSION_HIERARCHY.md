# Permission Hierarchy & Implicit Inheritance

Implementation guidance. Phase status and production approval are tracked in [the security master tracker](../../docs/security/SECURITY_REMEDIATION_MASTER_TRACKER.md); see the [architecture baseline](../../docs/security/SECURITY_ARCHITECTURE_BASELINE.md) for current constraints. This file is not a phase tracker.

## 1. Dot-Notation Permission Keys
Permissions follow the canonical format: `Module.Action` or `Module.Subcategory.Action`:
- `Department.View`
- `Department.Add`
- `Department.Edit`
- `Department.Delete`
- `TypeOfLeave.Add`
- `RequestForLeave.Approval.Create`
- `PayrollComputation.View`

---

## 2. Implicit `.View` Inheritance Rule
In [src/server/middleware/rbac.guard.ts](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/src/server/middleware/rbac.guard.ts), any user who holds a mutating action permission on a module automatically satisfies requirements for viewing that module:

$$	ext{UserHas}(M.	ext{Add}) \lor 	ext{UserHas}(M.	ext{Edit}) \lor 	ext{UserHas}(M.	ext{Delete}) \lor 	ext{UserHas}(M.	ext{Approval.Create}) \implies 	ext{UserHas}(M.	ext{View})$$

```typescript
// Implemented logic in rbac.guard.ts:
if (!isPermitted && requiredKey.endsWith('.View')) {
  const modulePrefix = requiredKey.slice(0, -5);
  isPermitted =
    permissionSet.has(`${modulePrefix}.Add`) ||
    permissionSet.has(`${modulePrefix}.Edit`) ||
    permissionSet.has(`${modulePrefix}.Delete`) ||
    permissionSet.has(`${modulePrefix}.Approval.Create`);
}
```

---

## 3. O(1) Lookup Optimization
To ensure maximum performance during Express request processing, `rbac.guard.ts` converts the user's `req.effectivePermissions` array into a `Set<string>` cached at `req.permissionSet`, eliminating repetitive array scans.
