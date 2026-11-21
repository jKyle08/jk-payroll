# Security & RBAC Regression Testing

Implementation guidance. Current test evidence and production approval are tracked in [the security master tracker](../../docs/security/SECURITY_REMEDIATION_MASTER_TRACKER.md) and [readiness record](../../docs/security/SECURITY_PRODUCTION_READINESS.md). This file is not a phase tracker.

## 1. Dedicated Security Suites
- `tests/rbac.test.ts`: RBAC and tenant-isolation tests.
- `tests/security-phase1.test.ts`: API authorization and privilege boundary tests; update legacy expectations when registration behavior changes.
- `tests/integration/security-phase1-2-provisioning.integration.test.ts`: PGlite embedded-engine provisioning tests. These do not establish live PostgreSQL/Supabase behavior.

At the 2026-11-21 review, the full suite had 478 passing and 4 failing tests (482 total); the Phase 1.2 provisioning suite had 7 passing PGlite tests. Check the [readiness record](../../docs/security/SECURITY_PRODUCTION_READINESS.md) for current rerun evidence. Never describe embedded-engine tests as live database verification.
