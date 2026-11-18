# Feature Module Architecture

Status: `IMPLEMENTED`

## 1. Domain Feature Slices (`src/features/`)
Domain features encapsulate business logic within self-contained modules under `src/features/`:

```text
src/features/<feature-name>/
├── <feature>.controller.ts       # Backend HTTP controller
├── <feature>.service.ts          # Backend business logic & rules
├── <feature>.routes.ts           # Express router configuration
├── <feature>.schema.ts           # Feature-specific Zod schemas
├── types.ts                      # Domain TypeScript interfaces
├── components/                   # Frontend React UI components for feature
├── hooks/                        # Frontend React custom hooks
├── services/                     # Frontend client API integration callers
└── index.ts                      # Barrel re-export file
```

---

## 2. Implemented Features Directory

1. **`access-control`:** Granular action evaluation, permission matrices, and UI gating atoms (`PermissionGate`).
2. **`audit-logs`:** Security audit event exploration, filter directories, and detail inspection modals.
3. **`auth`:** User authentication, login forms, session token storage, and auth state hooks (`useAuth`).
4. **`departments`:** Department hierarchy tree views, parent-child assignment, and CRUD management.
5. **`leave-management`:** Leave type definitions, employee leave requests, approval flows, and data scoping.
6. **`organizations`:** Multi-tenant organization lifecycle, sector settings, subscription tier enforcement, and onboarding wizards.
7. **`payroll`:** Payroll computation batches, calculation snapshots, and approval status flows.
8. **`roles`:** System and custom role definitions, role-permission matrix assignment, and user role binding.
9. **`users`:** User profile directories, role assignment, and department allocation.
