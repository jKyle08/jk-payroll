# PayPulse Phase 3.0 — Security Integration Test Implementation Plan

**Status:** Test Plan Authored / Execution Gated (Real Target Required)  
**Date:** 2026-11-22  
**System:** PayPulse (JK Payroll) — Integration Testing Framework  
**Document Reference:** `docs/phase-3/PAYPULSE_PHASE_3_0_SECURITY_TEST_IMPLEMENTATION_PLAN.md`  

---

## 1. Executive Summary & Test Execution Discipline

Workstream F organizes the 38 security integration test scenarios defined during Phase 2.2 into an implementation-ready test harness. In strict adherence to Section 4 (Workstream F):
- **Tests are NOT reported as passing unless actually executed.**
- **In-memory Vitest mocks are NOT treated as proof of PostgreSQL RLS or RPC security.**
- Full compliance verification requires a live, disposable Supabase / PostgreSQL 17+ environment.

### Status Tracking Definitions:
- **DOCUMENTED:** Scenario, input, expected result, and assertion logic fully specified.
- **IMPLEMENTED:** Test suite code written in TypeScript (`tests/integration/`).
- **BLOCKED / NOT EXECUTED:** Awaiting disposable staging database provisioning and connection credentials.
- **PASSED / FAILED:** Executed against live database with raw verification logs archived.

---

## 2. Test Execution Status Matrix (38 Scenarios)

### Suite 1: Authentication & Trusted Actor Context (12 Scenarios)
| Test ID | Scenario Description | Target Security Boundary | Documented | Implemented | Executed | Execution Status |
|---|---|---|---|---|---|---|
| `SEC-AUTH-01` | Valid Caller JWT Verification | PostgREST / `auth.uid()` derivation | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-AUTH-02` | Missing Authorization Header | Express authMiddleware 401 | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-AUTH-03` | Malformed / Tampered JWT | GoTrue JWT cryptographic signature | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-AUTH-04` | Expired Caller JWT | GoTrue token expiration validation | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-AUTH-05` | Inactive User Profile | Database resolver fail-closed | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-AUTH-06` | Inactive Membership | Tenant boundary fail-closed | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-AUTH-07` | Actor ID Parameter Forgery | Database ignores `p_actor_id` | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-AUTH-08` | Cross-Organization Request | RLS tenant isolation | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-AUTH-09` | User Metadata Spoofing | DB verifies `profiles.is_super_admin` | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-AUTH-10` | Service-Role RPC Execution Banned | RPC raises exception on null `auth.uid()` | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-AUTH-11` | Request-Scoped Client Isolation | Concurrent request header isolation | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-AUTH-12` | Background Workload Identity | Dedicated worker role & audit attribution | Yes | Yes | No | **BLOCKED (No Staging DB)** |

### Suite 2: RLS & Database Function Security (7 Scenarios)
| Test ID | Scenario Description | Target Security Boundary | Documented | Implemented | Executed | Execution Status |
|---|---|---|---|---|---|---|
| `SEC-RLS-01` | Anonymous Direct Table Access | SQL privilege denial on anon | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-RLS-02` | Direct DML Lockdown | Authenticated DML revoked on RBAC tables | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-RLS-03` | RLS Tenant Containment | Tenant isolation on SELECT queries | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-RLS-04` | UPDATE USING & WITH CHECK | Protection against cross-org updates | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-RLS-05` | Public EXECUTE Revocation | Database function ACL audit | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-RLS-06` | Search Path Injection Defense | Fixed search path resolution | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-RLS-07` | Force Row Level Security | `relforcerowsecurity` verification | Yes | Yes | No | **BLOCKED (No Staging DB)** |

### Suite 3: Authorization & Permission Modes (7 Scenarios)
| Test ID | Scenario Description | Target Security Boundary | Documented | Implemented | Executed | Execution Status |
|---|---|---|---|---|---|---|
| `SEC-PERM-01` | Mode ROLE Resolution | Evaluates role permissions | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-PERM-02` | Mode USER_CUSTOM Replacement | Completely replaces role grants | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-PERM-03` | Empty USER_CUSTOM Fails Closed | Zero permissions granted | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-PERM-04` | Entitlement Revocation Invalidation | Immediate loss of effective permission | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-PERM-05` | Single Role Invariant | `user_roles` unique constraint `23505` | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-PERM-06` | System Role Assignment Rejection | Rejection of `SYSTEM` role assignment | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-PERM-07` | Cross-Org Role Assignment Blocked | Composite FK `23503` violation | Yes | Yes | No | **BLOCKED (No Staging DB)** |

### Suite 4: Administrator Lifecycle & Concurrency (6 Scenarios)
| Test ID | Scenario Description | Target Security Boundary | Documented | Implemented | Executed | Execution Status |
|---|---|---|---|---|---|---|
| `SEC-ADMIN-01`| Last Administrator Removal Blocked | Invariant predicate failure | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-ADMIN-02`| Atomic Manager Replacement | Multi-mutation transaction commit | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-ADMIN-03`| Mode Switch Disqualification | Option A mode transition block | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-ADMIN-04`| Concurrent Demotion Race | Row lock serialization on org | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-ADMIN-05`| Assigned Role Archival Blocked | Invariant protects assigned role | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-ADMIN-06`| Platform Break-Glass Recovery | Recovery RPC grants management only | Yes | Yes | No | **BLOCKED (No Staging DB)** |

### Suite 5: Organization Bootstrap & Invitations (6 Scenarios)
| Test ID | Scenario Description | Target Security Boundary | Documented | Implemented | Executed | Execution Status |
|---|---|---|---|---|---|---|
| `SEC-BOOT-01` | Successful First-Manager Provisioning | Atomic onboarding transaction | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-BOOT-02` | Idempotent Bootstrap Retry | Cached response on duplicate key | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-BOOT-03` | Idempotency Payload Conflict | Error `40001` on payload mismatch | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-BOOT-04` | Expired Invitation Redemption Blocked| Error `42501` on expired token | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-BOOT-05` | Invitation Email Mismatch Rejection | Rejection of mismatched email | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-BOOT-06` | Double-Acceptance Replay Prevention | Lock prevents double redemption | Yes | Yes | No | **BLOCKED (No Staging DB)** |

### Suite 6: Audit Integrity & Retention (5 Scenarios)
| Test ID | Scenario Description | Target Security Boundary | Documented | Implemented | Executed | Execution Status |
|---|---|---|---|---|---|---|
| `SEC-AUDIT-01`| Atomic Mutation & Audit Rollback | Transaction atomicity | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-AUDIT-02`| Direct Audit Mutation Rejection | SQL privilege & trigger denial | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-AUDIT-03`| Secret Redaction Verification | JSON diff sanitization | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-AUDIT-04`| Org Deletion Retention Protection | FK `RESTRICT` prevents cascade | Yes | Yes | No | **BLOCKED (No Staging DB)** |
| `SEC-AUDIT-05`| Audit Event Monotonicity | Sequence & timestamp ordering | Yes | Yes | No | **BLOCKED (No Staging DB)** |

---

## 3. Test Statistics Summary

- **Total Scenarios Documented:** 38
- **Total Test Implementations Ready:** 38
- **Tests Executed against Live PostgreSQL:** 0
- **Passed:** 0
- **Failed:** 0
- **Blocked / Not Executed:** 38 (Pending designated disposable staging environment credentials)

---

## 4. Test Execution Pre-Conditions for Phase 3 Execution

To transition these 38 tests from **BLOCKED** to **EXECUTED**:
1. Project Owner provides explicit disposable staging project reference.
2. Read-only staging preflight is completed.
3. Migrations Phase A and Phase B are applied to the staging target under authorization.
4. Two distinct Supabase connection strings ($S_1$ and $S_2$) are injected into test environment variables.
5. Automated test runner executes the suite and generates `docs/phase-3/evidence/postgres_security_test_run.log`.
