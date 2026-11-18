# Business Rules & Domain Invariants

Status: `IMPLEMENTED`

## 1. Multi-Tenant Invariants
- An organization cannot access or modify entities belonging to another organization.
- An expired organization (`endDate < today`) prevents all non-superadmin users from executing actions.

---

## 2. Department Invariants
- A department cannot be its own parent.
- Deleting a department cascades deletions downward to all descendant sub-departments.

---

## 3. RBAC Entitlement Invariants
- A user cannot be assigned an action permission for a module unless that module is licensed to their organization (Tier 1) AND allocated to their department branch (Tier 2).
