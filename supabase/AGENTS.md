# `supabase/` Directory Agent Instructions

## Scope & Purpose
Contains local Supabase CLI configurations, SQL migrations, and baseline seed data.

---

## Rules
1. **Migration Immutability:** Applied migrations `20261104000001` through `20261122100007` (27 migrations) are deployed and permanently immutable. All new migrations must be forward-only additions timestamped sequentially.
2. **Schema Alignment:** All table and column definitions must match the canonical schema (`public.organizations`, `public.departments`, `public.profiles`, `public.roles`, `public.user_roles`, etc.).
3. **Multi-Tenancy & Composite FKs:** Operational tables must include `organization_id NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`. Role assignments must enforce `fk_user_roles_org_role` with `ON DELETE NO ACTION`.
4. **Lock Acquisition Order (F-30B-08):** To prevent deadlocks, multi-table migrations and triggers must acquire locks in order: `LOCK TABLE public.user_roles, public.organization_members, public.roles IN ACCESS EXCLUSIVE MODE;`.
5. **Local CLI State:** Directory `.temp/` is local state and must remain ignored by git.
