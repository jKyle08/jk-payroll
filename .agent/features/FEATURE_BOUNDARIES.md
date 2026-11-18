# Feature Boundaries & Domain Responsibility

Status: `IMPLEMENTED`

## 1. Domain Directory Map

| Feature Directory | Architectural Responsibility |
| :--- | :--- |
| **`organizations`** | Tenant company lifecycle, onboarding wizard, sector configuration, and subscription limits. |
| **`departments`** | Departmental units, recursive hierarchy tree, parent-child links, and depth calculation. |
| **`roles`** | Global and tenant roles, role-permission matrices, and user-role assignments. |
| **`auth`** | User login, JWT token issuance, session storage, and `useAuth` hook. |
| **`users`** | User profile directories, department assignments, and user-level permissions. |
| **`leave-management`**| Leave types, balance allocations, leave requests, approval status flows, and data scoping. |
| **`payroll`** | Payroll calculation runs, salary batches, and immutable calculation snapshots. |
| **`access-control`** | Granular permission evaluation hooks, permission matrices, and UI gating atoms. |
| **`audit-logs`** | Security audit event exploration, actor attribution, and before/after mutation diffs. |
