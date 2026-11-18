# `src/` Directory Agent Instructions

## Scope & Purpose
The `src/` directory contains all application source code, partitioned into four distinct top-level boundaries: `shared/`, `server/`, `client/`, and `features/`.

---

## Guidelines
1. **No Root Files in `src/`:** Do not place loose TypeScript files directly in `src/`. All files belong in their respective layer or feature module.
2. **Respect Boundaries:**
   - Server code (`src/server/`) must never import React components.
   - Client code (`src/client/`) must never import server-only dependencies (`express`, `jsonwebtoken`).
   - Shared contracts (`src/shared/`) must remain platform-agnostic.
3. **Cross-Feature Imports:** Use `src/shared/types/` for common domain models rather than reaching across unrelated feature internals.
