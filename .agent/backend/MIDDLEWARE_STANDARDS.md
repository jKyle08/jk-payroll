# Backend Middleware Standards

Status: `IMPLEMENTED`

## 1. Standard Middleware Execution Chain

```mermaid
flowchart LR
    A[Incoming Request] --> B[cors]
    B --> C[express.json]
    C --> D[authMiddleware]
    D --> E[validate]
    E --> F[requirePermission]
    F --> G[dataScopingMiddleware]
    G --> H[Controller Handler]
```

---

## 2. Core Middleware Catalog (`src/server/middleware/`)
1. `auth.middleware.ts`: Validates token, attaches `req.user`, preloads effective permissions, gates expired organizations.
2. `rbac.guard.ts`: `requirePermission(actionKey)`, `requireTenantAdmin()`, `requireSuperAdmin()`.
3. `data-scoping.middleware.ts`: Injects `req.dataScope` with authorized department IDs.
4. `validate.middleware.ts`: Reusable Zod validator returning 400 with formatted issue details.
