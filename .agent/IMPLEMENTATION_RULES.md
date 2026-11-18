# Strict Implementation Rules for AI Agents

Status: `IMPLEMENTED`

## 1. Non-Negotiable Operational Constraints

AI Agents modifying or maintaining the JK Payroll codebase must strictly obey the following operational rules:

1. **NEVER Bypass Multi-Tenancy:**
   - Every operational query must be filtered by `tenantId` / `organizationId`.
   - Never allow user-supplied query parameters (e.g. `?tenantId=...`) to override the authenticated user's `req.user.tenantId` unless `req.user.isSuperAdmin === true`.

2. **NEVER Circumvent the 3-Tier RBAC Cascade:**
   - Tier 1 -> Tier 2 -> Tier 3 constraints are non-negotiable.
   - A user cannot be assigned a permission for a module unless that module is licensed to their organization (Tier 1) AND allocated to their department branch (Tier 2).

3. **NEVER Introduce Invented Database Columns or Tables:**
   - All database changes must correspond to explicit migrations in `supabase/migrations/`.
   - Schema elements must reflect PostgreSQL migrations (000001 through 000009).

4. **Preserve Dual-Mode Repository Consistency:**
   - The in-memory database simulation in `src/server/db/repository.ts` must remain fully synchronized with the PostgreSQL database schema and CTE logic to ensure automated Vitest suites pass reliably.

5. **Maintain 100% Test Passing Rate:**
   - Every refactoring or feature addition must pass `npm test` (all 11 test suites and 106 tests).
   - If a test fails, do not silently disable or delete the test. Fix the code to adhere to the architectural contract.
