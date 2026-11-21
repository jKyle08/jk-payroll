# JK Payroll: Root AI Agent Operating Instructions

Welcome to the JK Payroll (PayPulse) codebase. All AI coding agents operating within this repository must strictly adhere to the guidelines established here and in the `.agent/` documentation system.

---

## 1. Core Architecture Principles
1. **Canonical Reference:** [ARCHITECTURE.md](./ARCHITECTURE.md) is the canonical reference for the multi-tenant RBAC architecture. Refer to [.agent/security/SECURITY_OVERVIEW.md](./.agent/security/SECURITY_OVERVIEW.md) and subsystem guidance under `.agent/` for implementation details. Security phase status is tracked only in [docs/security/SECURITY_REMEDIATION_MASTER_TRACKER.md](./docs/security/SECURITY_REMEDIATION_MASTER_TRACKER.md).
2. **Strict Multi-Tenancy:** Every operational table, record, and query must be bound to an `organization_id` (or `tenant_id`). Cross-tenant operations are strictly forbidden.
3. **Three-Tier Cascading RBAC:**
   - Tier 1: Organization Licensing (`organization_modules`).
   - Tier 2: Department Allocation (`department_modules`).
   - Tier 3: User Action Grants (`user_permissions` / `role_permissions`).
4. **Decoupled Layers:**
   - `src/shared/`: Shared contracts, pure types, schemas, and constants (zero DOM/Node dependencies).
   - `src/server/`: Node.js Express backend and database repositories.
   - `src/client/`: React 19 + Vite SPA (layouts, pages, components, client lib).
   - `src/features/`: Domain feature slices.
   - `supabase/`: Migrations, local seeds, and Supabase CLI configuration.
   - `tests/`: Automated Vitest suites.

---

## 2. Universal Agent Rules
1. **ESM Imports:** All relative TypeScript imports must specify the `.js` extension (e.g. `from './service.js'`).
2. **Never Break Tests:** Always run `npm test` before and after modifying code. All 11 test suites and 106 tests must pass.
3. **Fail-Closed Security:** In case of missing context, expired organization, or RPC errors, access must be denied (`403 Forbidden` or `401 Unauthorized`).
4. **Hierarchical Child Instructions:** Review child `AGENTS.md` files located within specific subdirectories before making changes in those folders.
