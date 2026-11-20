# Backend API Standards & REST Conventions

Status: `IMPLEMENTED`

## 1. Base URL & Routing Structure
- Root API prefix: `/api`
- Domain routes:
  - `/api/auth/*`
  - `/api/organizations/*`
  - `/api/departments/*`
  - `/api/roles/*`
  - `/api/user-roles/*`
  - `/api/users/*`
  - `/api/leaves/*`
  - `/api/payroll/*`
  - `/api/access-control/*`
  - `/api/audit-logs/*`

---

## 2. Canonical Domain Routes
All APIs are organized strictly under canonical domain routes:
- `/api/organizations` -> Organization lifecycle and module allocations (`organizationController`)
- `/api/departments` -> Department hierarchy, tree, and module allocation (`departmentController`)
- `/api/users` -> User management, eligible modules, and permission assignment (`userController`)
- `/api/leaves` -> Leave types and requests
- Transactional aliases for legacy leave endpoints (`/api/type-of-leave` & `/api/leave-requests`) are preserved.
