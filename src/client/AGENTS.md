# `src/client/` Directory Agent Instructions

## Scope & Purpose
`src/client/` contains the React 19 single-page application bundled by Vite.

---

## Rules
1. **Client Isolation:** Never import Node.js server libraries (`express`, `jsonwebtoken`, `crypto`).
2. **Styling:** Use Tailwind CSS utility classes and `cn(...)` from `lib/utils.js`.
3. **Routing Table:** All client-side route paths are defined in `RootApp.tsx`.
4. **Authentication State:** Access user session state via `useAuth()` from `src/features/auth/hooks/use-auth.js`.
