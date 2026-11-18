# Database Architecture Overview

Status: `IMPLEMENTED`

## 1. Architectural Strategy
The JK Payroll database architecture is designed for **PostgreSQL 15+** managed via **Supabase**. It utilizes:
- Strict relational foreign keys with cascading deletions where appropriate.
- Row Level Security (RLS) on all multi-tenant tables.
- PostgreSQL Recursive Common Table Expressions (CTEs) encapsulated in SQL functions for hierarchical tree traversal.
- Trigger-based automated security audit logging.

---

## 2. Historical Schema Note: `tenants` vs `organizations`
In the earliest architectural draft (and mirrored in some domain TypeScript types), the root multi-tenant entity was termed `tenants`. In canonical migrations `20261104000001_core_schema.sql` through `20261104000009_expand_organizations_sector_settings.sql`, this table is canonically named **`public.organizations`**.

The application database repository and domain interfaces bridge this cleanly:
- `organization_id` is the primary foreign key.
- `tenant_id` is supported as a backward-compatible alias.
