# `src/shared/` Directory Agent Instructions

## Scope & Purpose
`src/shared/` is the single source of truth for contracts, interfaces, Zod validation schemas, and constants used across the entire codebase.

---

## Rules
1. **Zero Runtime Dependencies:** This directory must NEVER import from `@supabase/supabase-js`, `express`, `react`, or browser DOM APIs.
2. **Subdirectories:**
   - `types/`: Domain interfaces (`Tenant`, `Department`, `Profile`, `AuthUserContext`).
   - `schemas/`: Zod schemas shared between frontend forms and backend request validation.
   - `constants/`: Global constants such as `PERMISSIONS` and `MODULE_KEYS`.
3. **Immutability:** Modifying existing interfaces or permission keys requires verifying all downstream consumers in `server/`, `client/`, and `tests/`.
