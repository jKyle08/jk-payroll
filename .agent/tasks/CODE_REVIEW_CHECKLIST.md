# Code Review & Acceptance Checklist

Status: `IMPLEMENTED`

Every change submitted by an AI agent must pass this checklist:

- [ ] **Multi-Tenancy:** Is `tenantId` / `organizationId` enforced on all database queries?
- [ ] **RBAC Cascade:** Does the change respect Tier 1 -> Tier 2 -> Tier 3 constraints?
- [ ] **Data Scoping:** Are departmental scopes (`Self`, `SubDepartment`, `EntireDepartment`, `Tenant`) applied?
- [ ] **Module Resolution:** Do all TypeScript imports use the `.js` extension?
- [ ] **Layer Boundary:** Does `src/shared/` remain free of DOM and Node dependencies?
- [ ] **Client/Server Isolation:** Does `src/server/` avoid importing frontend JSX? Does `src/client/` avoid importing server secrets?
- [ ] **Tests:** Do all 11 test suites and 106 tests pass?
