# JK Payroll: Root AI Agent Operating Instructions

Welcome to the JK Payroll (PayPulse) codebase. All AI coding agents operating within this repository must strictly adhere to the guidelines established here and in the canonical documentation system under `docs/`.

---

## 1. Core Architecture Principles

1. **Canonical Architecture Reference:** [ARCHITECTURE.md](./ARCHITECTURE.md) and [docs/architecture/CONSOLIDATED_ARCHITECTURE.md](./docs/architecture/CONSOLIDATED_ARCHITECTURE.md) are the authoritative references for the multi-tenant RBAC architecture. Refer to [docs/security/CONSOLIDATED_SECURITY_SPECIFICATION.md](./docs/security/CONSOLIDATED_SECURITY_SPECIFICATION.md) and [docs/database/CONSOLIDATED_DATABASE_GUIDE.md](./docs/database/CONSOLIDATED_DATABASE_GUIDE.md) for database and security implementation details.
2. **Strict Multi-Tenancy:** Every operational table, record, and query must be bound to an `organization_id` (or `tenant_id`). Cross-tenant operations are strictly forbidden. Composite foreign keys `(organization_id, role_id) REFERENCES roles(organization_id, id) ON DELETE NO ACTION` enforce role tenant isolation.
3. **Three-Tier Cascading RBAC:**
   - Tier 1: Organization Licensing (`organization_modules`).
   - Tier 2: Department Allocation (`department_modules`).
   - Tier 3: User Action Grants (`user_permissions` / `role_permissions`).
4. **Decision P-01 Option C Baseline:** Standard template roles (`ORG_ADMIN` and `EMPLOYEE`) are instantiated per tenant during onboarding as tenant-owned records (`role_type = 'CUSTOM'`). Global system roles (`organization_id IS NULL`) are reserved strictly for platform SuperAdmins.
5. **Decoupled Layers:**
   - `src/shared/`: Shared contracts, pure types, schemas, and constants (zero DOM/Node dependencies).
   - `src/server/`: Node.js Express backend and database repositories.
   - `src/client/`: React 19 + Vite SPA (layouts, pages, components, client lib).
   - `src/features/`: Domain feature slices.
   - `supabase/`: Migrations, local seeds, and Supabase CLI configuration.
   - `tests/`: Automated Vitest suites.

---

## 2. Universal Agent Operating Rules

1. **ESM Imports:** All relative TypeScript imports must specify the `.js` extension (e.g. `from './service.js'`).
2. **Never Break Tests:** Always run `npm test` before and after modifying code. All 31 test suites and 510 tests must pass with zero failures and zero regressions.
3. **Fail-Closed Security:** In case of missing context, expired organization, or RPC errors, access must be denied (`403 Forbidden` or `401 Unauthorized`). Fallback grants or default permissions are strictly prohibited.
4. **Forward-Only Database Migrations:** All 27 applied migrations in `supabase/migrations/` (`20261104000001` through `20261122100007`) are immutable. Any new schema changes must be added as forward-only timestamped migrations. Never disable RLS or perform destructive database resets.
5. **No Client-Side Privilege Escalation:** Organization administrators cannot assign platform SuperAdmin privileges or grant permissions outside their organization's licensed modules.
6. **Hierarchical Child Instructions:** Review scoped `AGENTS.md` files located within specific subdirectories (`src/server/`, `src/client/`, `supabase/`, `tests/`) for local constraints before making changes in those folders.
