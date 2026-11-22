# PayPulse: Deployment & Migration Procedures

**Document Version:** 3.0.0 (Authoritative Deployment Reference)  
**Status:** Active Operating Standard  
**Scope:** Supabase Database Migrations, Staging Verification, Preflight Protocols, and Rollback Procedures

---

## 1. Environment Verification & Preflight Protocol

### 1.1 Strict Environment Identification Rule
> [!CAUTION]  
> Never assume an environment is staging or pre-production based solely on its project name or user-assigned label.  
> Before any migration or database execution, verify:
> 1. Remote Supabase Project Reference (`fsnfqnbixitmmjmeogml`).
> 2. Organization ID (`aberozcddvxcsmtebgsl`).
> 3. Active database host (`https://fsnfqnbixitmmjmeogml.supabase.co`).
> 4. Read-only ping check (`SELECT id FROM public.organizations LIMIT 1`).

### 1.2 Preflight Inspection Checklist
Before executing database migrations:
- [x] **Verify Git Status:** Working directory is clean, branch is synchronized with remote repository.
- [x] **Inspect Migration Ledger:** Compare local files against remote ledger via `supabase migration list --remote`.
- [x] **Verify Lock Hierarchy:** Ensure migrations lock tables in standardized order (`user_roles`, `organization_members`, `roles`).
- [x] **Dry-Run on Embedded Engine:** All migrations must apply cleanly in PGlite test harness (`tests/integration/helpers/pg-harness.ts`).

---

## 2. Forward-Only Migration Standards

1. **Applied Migration Immutability:** Migrations `20261104000001` through `20261122100007` are deployed on remote Supabase and are permanently immutable. Under no circumstances should existing migration files be edited, replaced, or deleted.
2. **Sequential Forward Additions:** Any new schema changes must be added as forward migrations timestamped with UTC format: `YYYYMMDDHHMMSS_<descriptive_name>.sql`.
3. **Idempotence & Safety:**
   - DDL statements must use `IF NOT EXISTS` / `IF EXISTS` where supported.
   - Insert seeds must use `ON CONFLICT DO NOTHING` or `ON CONFLICT (...) DO UPDATE`.
   - Functions and procedures must use `CREATE OR REPLACE FUNCTION` / `CREATE OR REPLACE PROCEDURE`.
4. **Zero Destructive Resets:** `supabase db reset` is strictly forbidden on staging and production instances.
5. **Lock Acquisition Order (F-30B-08):** To prevent deadlocks, all multi-table migrations must acquire locks in this sequence:
   ```sql
   LOCK TABLE public.user_roles, public.organization_members, public.roles IN ACCESS EXCLUSIVE MODE;
   ```
6. **Row Level Security Non-Negotiable:** Never disable RLS (`DISABLE ROW LEVEL SECURITY`) to bypass authorization errors.

---

## 3. Remote Deployment Execution

### 3.1 Applying Migrations via Supabase CLI
```bash
# 1. Verify remote migration status
supabase migration list --remote

# 2. Apply pending forward migrations
supabase db push

# 3. Re-verify ledger synchronization
supabase migration list --remote
```

### 3.2 Post-Deployment Acceptance Verification
Immediately after database push, execute the automated live integration suites:
```bash
npx vitest run tests/integration/phase1-3-foundation-live.integration.test.ts
npx vitest run tests/integration/security-postgres.integration.test.ts
```

All integration tests must pass with 0 failures before opening the environment to application traffic.

---

## 4. Rollback & Disaster Recovery Strategy

1. **Compensating Forward Migrations:** If a deployed migration introduces unexpected behavior, the primary rollback strategy is a forward-only compensating migration that reverses or fixes the changes.
2. **Point-in-Time Recovery (PITR):** For critical data corruption scenarios, Supabase Point-in-Time Recovery allows restoring the database to an exact minute prior to the failed deployment.
3. **Identity Provider Sync:** If user provisioning fails during an operational incident, uncommitted Supabase Auth accounts must be purged using `supabase.auth.admin.deleteUser(id)` to prevent orphaned auth identities.
