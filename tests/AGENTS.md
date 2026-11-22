# `tests/` Directory Agent Instructions

## Scope & Purpose
Contains 31 automated Vitest test suites (510 tests) covering unit logic, embedded PGlite PostgreSQL execution, live remote Supabase integration, cascading RBAC security, and React UI components.

---

## Rules
1. **Zero Tolerance for Failures:** All 31 test suites and 510 tests must pass (`npm test`). Never commit code that causes a test regression.
2. **Path References:**
   - Server imports: `../src/server/...`
   - Client imports: `../src/client/...`
   - Shared imports: `../src/shared/...`
3. **Security Test Integrity:** Do not weaken or delete assertions in `rbac.test.ts`, `security-phase1.test.ts`, `security-database-rls-phase4.test.ts`, or `phase1-3-foundation-live.integration.test.ts`.
4. **Live Integration Verification:** Tests in `tests/integration/` targeting remote Supabase (`phase1-3-foundation-live.integration.test.ts` and `security-postgres.integration.test.ts`) must perform clean setup and safe teardown of disposable entities.
