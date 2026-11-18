# `src/features/` Directory Agent Instructions

## Scope & Purpose
Houses domain-driven vertical slices. Each feature module encapsulates its own controllers, services, routes, schemas, hooks, and UI components.

---

## Feature Rules
1. **Co-location:** Keep domain-specific logic, types, and components inside their respective feature folder.
2. **Export Contract:** Use `index.ts` to export public feature components and services.
3. **Database Layer:** Backend services must access data through `src/server/db/repository.js` or `src/server/db/supabase.js`.
