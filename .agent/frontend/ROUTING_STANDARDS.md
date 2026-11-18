# Frontend Routing Standards (React Router 7)

Status: `IMPLEMENTED`

## 1. Declarative Routing Table
Located in [src/client/RootApp.tsx](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/src/client/RootApp.tsx):

- `/login`: Public authentication route.
- `/onboard`, `/onboarding`, `/onboarding/:token`: Standalone onboarding routes wrapped in `<OnboardingLayout>`.
- `/organizations`, `/organizations/new`, `/organizations/:id/edit`: Organization management routes.
- `/admin/departments/*`: Department tree & form pages.
- `/admin/roles/*`, `/admin/user-roles/*`: RBAC configuration pages.
- `/admin/audit-logs/*`: Security audit logging directory.

---

## 2. Route Protection Wrappers
- `<ProtectedDashboardLayout>`: Requires `isAuthenticated === true`, attaches user session context, and wraps view inside `<DashboardLayout>`.
- `<ProtectedOnboardingRoute>`: Requires `isAuthenticated === true` but renders view without dashboard chrome.
