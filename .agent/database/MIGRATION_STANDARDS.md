# Migration Standards & Canonical History

Implementation guidance. The current phase status and deployment approval live in [the security master tracker](../../docs/security/SECURITY_REMEDIATION_MASTER_TRACKER.md). This file is not a phase tracker; migration files do not prove migrations are applied.

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
10. `20261119000010_remediate_database_rls.sql`: Initial RLS remediation.
11. `20261119000011_harden_audit_attribution_and_integrity.sql`: Audit attribution and integrity hardening.

Subsequent security and configuration migrations:
- `20261121000012` through `20261121000017`: Phase 1 containment, authorization corrections, organization configuration, and profile audit-field protection.
- `20261121000018` and `20261121000019`: SuperAdmin organization onboarding and constrained member invitations.

The sequence above describes files in the repository, not a verified live migration ledger. Do not claim these migrations are applied without checking the target database.

---

## 2. Migration Guidelines for AI Agents
- **Immutability:** Existing migrations (000001 through 000009) must NEVER be modified or reordered.
- **Sequential Timestamping:** New migrations must use `YYYYMMDDHHMMSS_descriptive_name.sql`.
- **Idempotency:** Always use `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, and `DO $$ BEGIN ... END $$;` blocks for types.
