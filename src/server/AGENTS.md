# `src/server/` Directory Agent Instructions

## Scope & Purpose
`src/server/` contains the backend Express.js HTTP application, server bootstrap, database repositories, middleware, and route registrations.

---

## Rules
1. **Entry Points:**
   - `server.ts`: Listens on `ENV.PORT` and bootstraps the HTTP service.
   - `app.ts`: Creates and configures Express, CORS, body parsers, API routes, and client static serving.
2. **Database Access:**
   - In-memory simulation: `db/repository.ts` (powers Vitest suites without live cloud connectivity).
   - Supabase client: `db/supabase.ts` (provides live Supabase client instances).
3. **Never Expose Secrets:** Service role keys and JWT secrets must remain confined to `src/server/` and accessed via `config/env.ts`.
