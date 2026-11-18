# Database Access Patterns (In-Memory & Supabase)

Status: `IMPLEMENTED`

## 1. Dual Access Design
- [src/server/db/repository.ts](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/src/server/db/repository.ts): Provides synchronous/asynchronous in-memory simulation with relational foreign keys, indexes, and recursive CTE procedures.
- [src/server/db/supabase.ts](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/src/server/db/supabase.ts): Initialized using `@supabase/supabase-js`.
  - `getSupabaseClient()`: Uses service role key for administrative tasks.
  - `getSupabaseAnonClient()`: Uses anonymous public key.
