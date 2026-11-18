# End-to-End Request Lifecycle

Status: `IMPLEMENTED`

## 1. Lifecycle Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Client
    participant Topbar as Topbar / UI Component
    participant APIClient as Client API Service
    participant Express as Express App (src/server/app.ts)
    participant AuthMW as auth.middleware.ts
    participant RBAC as rbac.guard.ts
    participant Scoping as data-scoping.middleware.ts
    participant Ctrl as Feature Controller
    participant Svc as Feature Service
    participant DB as In-Memory Repo / Supabase

    User->>Topbar: Clicks Action (e.g. Add Department)
    Topbar->>APIClient: Calls departmentClient.create(...)
    APIClient->>Express: HTTP POST /api/departments (Bearer JWT)
    
    Express->>AuthMW: Validates JWT & Resolves Profile
    Note over AuthMW: Gating: Checks user.isActive & tenant.endDate
    AuthMW->>AuthMW: Attaches req.user & effectivePermissions
    
    Express->>RBAC: requirePermission('Department.Add')
    Note over RBAC: SuperAdmin bypass OR O(1) permissionSet check
    
    Express->>Scoping: dataScopingMiddleware('EntireDepartment')
    Note over Scoping: Injects allowedDepartmentIds
    
    Express->>Ctrl: departmentController.create(req, res)
    Ctrl->>Svc: departmentService.createDepartment(...)
    Svc->>DB: Executes CTE & Inserts Record
    DB-->>Svc: Returns Created Record
    Svc-->>Ctrl: Returns Domain Model
    Ctrl-->>Express: HTTP 201 Created (JSON)
    Express-->>APIClient: Response Payload
    APIClient-->>Topbar: Updates React State & UI
```

---

## 2. Key Lifecycle Milestones

1. **Bearer Extraction:** Header `Authorization: Bearer <token>` is extracted by `authMiddleware`.
2. **Context Resolution:** Resolves profile from repository or Supabase Auth. Inactive users or expired organizations immediately receive `403 Forbidden`.
3. **Effective Permissions Preloading:** Traverses upward department ancestor CTEs and computes `req.effectivePermissions`.
4. **Permission Guarding:** `requirePermission(key)` checks if `key` or any mutating equivalent (`.Add`, `.Edit`, `.Delete`) satisfies the requirement.
5. **Controller & Service Execution:** Pure business rules are evaluated before mutating storage.
