# `supabase/` Directory Agent Instructions

## Scope & Purpose
Contains local Supabase CLI configurations, SQL migrations, and baseline seed data.

---

## Rules
1. **Migration Immutability:** Never modify migrations `20261104000001` through `20261104000009`. New migrations must be appended sequentially.
2. **Schema Alignment:** All table and column definitions must match the canonical schema (`public.organizations`, `public.departments`, `public.profiles`, etc.).
3. **Local CLI State:** Directory `.temp/` is local state and must remain ignored by git.
