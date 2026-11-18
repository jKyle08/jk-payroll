# `tests/` Directory Agent Instructions

## Scope & Purpose
Contains 11 automated Vitest test suites (106 tests) covering unit logic, HTTP integration, cascading RBAC security, and UI components.

---

## Rules
1. **Zero Tolerance for Failures:** All 106 tests must pass (`npm test`). Never commit code that causes a test regression.
2. **Path References:**
   - Server imports: `../src/server/...`
   - Client imports: `../src/client/...`
   - Shared imports: `../src/shared/...`
3. **Security Test Integrity:** Do not weaken or delete assertions in `rbac.test.ts` or `security-phase1.test.ts`.
