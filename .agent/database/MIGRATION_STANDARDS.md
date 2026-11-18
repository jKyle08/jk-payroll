# Migration Standards & Canonical History

Status: `IMPLEMENTED`

## 1. Canonical Migration Sequence (`supabase/migrations/`)

1. `20261104000001_core_schema.sql`: Base multi-tenant schema (`organizations`, `departments`, `profiles`, `roles`, `modules`, `module_actions`, `user_permissions`).
2. `20261104000002_functions_and_rls.sql`: Recursive CTE functions and Row Level Security policies.
3. `20261104000003_audit_logs.sql`: Security audit logging schema and event storage.
4. `20261104000004_attach_audit_triggers.sql`: Mutation tracking audit triggers.
5. `20261104000005_seed_default_user_roles.sql`: Canonical roles (`SUPER_ADMIN`, `TENANT_ADMIN`, `DEPARTMENT_HEAD`, `STAFF`) and permission matrix bindings.
6. `20261104000006_fix_auth_users_null_tokens.sql`: Auth token constraints fix.
7. `20261104000007_audit_logs_superadmin_policy.sql`: Superadmin cross-tenant audit access RLS policies.
8. `20261104000008_align_organizations_schema.sql`: Enterprise organization entity alignment (slugs, contact, pay frequency).
9. `20261104000009_expand_organizations_sector_settings.sql`: Multi-sector profile configuration and immutable payroll run snapshot.

---

## 2. Migration Guidelines for AI Agents
- **Immutability:** Existing migrations (000001 through 000009) must NEVER be modified or reordered.
- **Sequential Timestamping:** New migrations must use `YYYYMMDDHHMMSS_descriptive_name.sql`.
- **Idempotency:** Always use `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, and `DO $$ BEGIN ... END $$;` blocks for types.
