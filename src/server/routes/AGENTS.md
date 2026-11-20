# `src/server/routes/` Directory Agent Instructions

## Scope & Purpose
`src/server/routes/index.ts` is the central API router mounted at `/api` in `src/server/app.ts`.

---

## Rules
1. **Route Aggregation:** Mounts domain feature routers (`/auth`, `/organizations`, `/departments`, `/roles`, etc.).
2. **Canonical Domain Routing:** All routes follow canonical domain naming (`/organizations`, `/departments`, `/users`, `/roles`, etc.). Legacy `/tenants` and `/tenant` aliases have been cleaned up and unified into canonical resources.
   - Transactional leave aliases (`/api/type-of-leave` & `/api/leave-requests`) route to leave controller handlers.
3. **Health Check:** Preserves `/api/health` returning `{ status: 'ok' }`.
