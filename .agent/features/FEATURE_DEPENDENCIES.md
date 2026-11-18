# Feature Dependencies & Cross-Module Rules

Status: `IMPLEMENTED`

## 1. Dependency Rules
1. **Shared Contracts First:** Shared types must be imported from `src/shared/types/` rather than across sibling features.
2. **No Circular Dependencies:** A feature slice must not import cyclically from another feature slice.
3. **Database Layer Access:** Feature services access database operations through `src/server/db/repository.js` or `src/server/db/supabase.js`.
