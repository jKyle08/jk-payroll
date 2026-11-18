# `src/server/routes/` Directory Agent Instructions

## Scope & Purpose
`src/server/routes/index.ts` is the central API router mounted at `/api` in `src/server/app.ts`.

---

## Rules
1. **Route Aggregation:** Mounts domain feature routers (`/auth`, `/organizations`, `/departments`, `/roles`, etc.).
2. **Backwards-Compatibility Aliases:** Must preserve legacy compatibility routes:
   - `/api/tenants` -> `organizationRoutes`
   - `/api/super-admin/tenants` -> `organizationController.createOrganization`
   - `/api/tenant/departments` -> `departmentController.createDepartment`
   - `/api/type-of-leave` & `/api/leave-requests` -> leave controller handlers
3. **Health Check:** Preserves `/api/health` returning `{ status: 'ok' }`.
