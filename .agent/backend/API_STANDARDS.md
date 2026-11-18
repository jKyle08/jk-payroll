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

## 2. Backwards-Compatibility Aliases
For backward compatibility with legacy scripts and older integration tests:
- `/api/tenants` -> routes to `/api/organizations`
- `/api/super-admin/tenants` -> calls `organizationController.createOrganization`
- `/api/tenant/departments` -> calls `departmentController.createDepartment`
- `/api/tenant/departments/tree` -> calls `departmentController.getDepartmentTree`
- `/api/type-of-leave` & `/api/leave-requests` -> routes to leave controllers
