# Three-Tier Cascading RBAC Architecture

Status: `IMPLEMENTED`

## 1. The 3-Tier Hierarchy

The authorization engine is architected around a non-circumventable, three-tiered cascading policy model:

```mermaid
flowchart TD
    Tier1["<b>Tier 1: Global Organization Licensing</b><br/><code>public.organization_modules</code><br/><i>Managed by Super Admin</i>"]
    Tier2["<b>Tier 2: Department Module Allocation</b><br/><code>public.department_modules</code><br/><i>Managed by Tenant Admin (Inherited downward)</i>"]
    Tier3["<b>Tier 3: Granular User Action Grants</b><br/><code>public.user_permissions / public.role_permissions</code><br/><i>Assigned to Users within Department branch</i>"]
    
    Tier1 -->|Constraint: Module must be active for Organization| Tier2
    Tier2 -->|Constraint: Module must exist in Department Branch| Tier3
```

---

## 2. Gatekeeper Constraints

### Tier 1 (Super Admin Gatekeeper)
- Governs organization subscriptions and licensed features (`public.organization_modules`).
- **Circuit Breaker:** If a module is inactive or absent at Tier 1 for an organization, nobody in that organization can access, allocate, or execute actions against that module under any circumstances.

### Tier 2 (Department Boundary Gatekeeper)
- Managed by Tenant Administrators within their verified organization.
- Allocates tenant-licensed modules to specific departments (`public.department_modules`).
- **Recursive Downward Cascade:** Departments in child sub-departments automatically inherit modules allocated to parent departments via recursive CTE queries.

### Tier 3 (User Action Grants)
- Grants specific action permissions (`public.user_permissions` or through roles in `public.user_roles`).
- **Branch Restriction:** A user can ONLY receive action grants for modules present along their department's upward ancestor branch.
