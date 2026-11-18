# Backend Application Architecture

Status: `IMPLEMENTED`

## 1. Express Pipeline Structure

The backend application is initialized via `createApp()` in [src/server/app.ts](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/src/server/app.ts):

1. **Global Middleware:**
   - `cors()`: Cross-Origin Resource Sharing.
   - `express.json()`: JSON body parser.
2. **API Router Mounting:**
   - Mounted at `/api` using [src/server/routes/index.ts](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/src/server/routes/index.ts).
3. **Client Static Serving (Production):**
   - Serves built React assets from `dist/client/`.
   - Handles SPA fallback: any non-API route serves `dist/client/index.html`.
4. **404 Catch-All:**
   - Unhandled `/api/*` routes return `{ "error": "Route METHOD URL not found" }` with HTTP 404.

---

## 2. Layered Responsibilities

```mermaid
flowchart TD
    Req[Incoming HTTP Request] --> Route[Route Definition<br/><code>*.routes.ts</code>]
    Route --> Val[Zod Validator<br/><code>validate(schema)</code>]
    Val --> Auth[Security Guards<br/><code>authMiddleware, requirePermission</code>]
    Auth --> Ctrl[Controller Handler<br/><code>*.controller.ts</code>]
    Ctrl --> Svc[Business Service<br/><code>*.service.ts</code>]
    Svc --> Repo[Database Access<br/><code>repository.ts / supabase.ts</code>]
    Repo --> Res[HTTP JSON Response]
```

---

## 3. Dual Database Access Pattern
The codebase employs a dual database access pattern:
- **In-Memory Simulation (`src/server/db/repository.ts`):** High-performance stateful in-memory database simulation implementing full relational constraints, Map indexes, and recursive CTE functions. Used primarily for integration testing and local simulation.
- **Supabase PostgreSQL Client (`src/server/db/supabase.ts`):** Live PostgreSQL integration using Supabase service role key (for administrative operations) and anonymous key (for public auth operations).
