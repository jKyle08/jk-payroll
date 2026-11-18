# Database Seeding Standards

Status: `IMPLEMENTED`

## 1. Seed Files Overview
- [supabase/seed.sql](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/seed.sql): Baseline data required for local Supabase development.
- [supabase/clean_and_seed_superadmin.sql](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/clean_and_seed_superadmin.sql): Deterministic teardown and superadmin account initialization.
- [supabase/seeds/20261101000001_seed_catalog.sql](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/seeds/20261101000001_seed_catalog.sql): Standard permissions, modules, and action dependencies.

---

## 2. Standard Seeding Sequence
When resetting a local Supabase database:
1. Run migrations 000001 to 000009.
2. Execute `seed.sql` to populate default module categories.
3. Execute `clean_and_seed_superadmin.sql` to initialize superadmin credentials.
