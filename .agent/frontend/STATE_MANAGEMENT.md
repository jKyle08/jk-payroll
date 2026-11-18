# Frontend State Management & Authentication Hook

Status: `IMPLEMENTED`

## 1. `useAuth` Hook
Located in [src/features/auth/hooks/use-auth.ts](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/src/features/auth/hooks/use-auth.ts):
- Synchronizes authentication state across browser tabs via `window.addEventListener('storage', ...)` and custom event `paypulse-auth-change`.
- Persists session in `localStorage`:
  - `localStorage.getItem('token')`
  - `localStorage.getItem('currentUser')`
- Exposes: `{ token, user, isAuthenticated, loginWithData, logout }`.
