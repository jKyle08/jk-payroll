# Coding Standards & Conventions

Status: `IMPLEMENTED`

## 1. TypeScript & ESM Rules
1. **ESM File Extensions in Imports:** In accordance with `NodeNext` module resolution, all relative imports in TypeScript files must include the `.js` extension:
   ```typescript
   // Correct:
   import { db } from '../server/db/repository.js';
   import { UserProfileData } from '../client/components/layout/user-profile-popover.js';

   // Incorrect:
   import { db } from '../server/db/repository';
   ```
2. **Explicit Typing:** Avoid `any`. Use domain interfaces defined in `src/shared/types/index.ts`.
3. **No Circular Dependencies:** Slices must not import cyclically. Shared types reside in `src/shared/types/`.

---

## 2. Backend Conventions (Express + Services)
1. **Controller Pattern:** Controllers extract and validate request parameters and delegate business logic to services.
2. **Standard HTTP Status Codes:**
   - `200 OK`: Successful read or update.
   - `201 Created`: Resource successfully created.
   - `400 Bad Request`: Payload validation failure or business constraint violation.
   - `401 Unauthorized`: Missing or invalid Bearer JWT token.
   - `403 Forbidden`: Insufficient RBAC permission, inactive account, or expired tenant.
   - `404 Not Found`: Entity does not exist or cross-tenant IDOR violation.
   - `500 Internal Server Error`: Unhandled infrastructure exception.
3. **Fail-Closed Execution:** Security guards must deny access if tokens, context, or RPC calls fail or throw exceptions.

---

## 3. Frontend Conventions (React 19 + Vite)
1. **Functional Components:** All components use React functional components with TypeScript interfaces for props.
2. **Co-located Hooks:** Feature-specific hooks reside in `src/features/<feature>/hooks/`.
3. **Tailwind Classes:** Use `cn(...)` utility (`clsx` + `tailwind-merge`) from `src/client/lib/utils.js` for dynamic class names.
4. **Accessible Primitives:** Buttons, dialogs, dropdowns, and form controls leverage accessible Radix/shadcn-style primitives.
