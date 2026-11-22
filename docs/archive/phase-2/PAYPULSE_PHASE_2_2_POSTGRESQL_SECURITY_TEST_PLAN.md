# PayPulse Phase 2.2 — Comprehensive PostgreSQL Security Integration Test Plan

**Status:** Implementation-Ready Test Specification (No Tests Executed in this Read-Only Phase)  
**Date:** 2026-11-22  
**System:** PayPulse (JK Payroll) — Real PostgreSQL / Supabase Test Plan  
**Target Environment:** Real Disposable Supabase Project (PostgreSQL 17+)  
**Document Reference:** `PAYPULSE_PHASE_2_2_POSTGRESQL_SECURITY_TEST_PLAN.md`  

---

## 1. Test Harness & Execution Pre-Conditions

This test plan defines the mandatory security verification suite to be executed in a dedicated, disposable Supabase / PostgreSQL 17+ environment during Phase 3 prior to production deployment.

### Test Environment Requirements:
1. **Real Database Target:** PGlite and in-memory mocks are strictly supplementary; full compliance verification requires a live Supabase instance with GoTrue Auth, PostgREST, and real database roles (`anon`, `authenticated`, `service_role`, `postgres`).
2. **Dual Client Sessions:** Concurrency and race-condition tests require two distinct, isolated connection sessions ($S_1$ and $S_2$) capable of interleaving transactions.
3. **Evidence Archival:** Every test run must capture raw SQL execution logs, transaction boundaries, HTTP status codes, and post-execution database row snapshots.

---

## 2. Test Suite 1: Authentication and Actor Identity

| Test ID | Scenario Description | Initial Fixture Setup | Execution Action / Input | Expected Result / Invariant | Verification Evidence Required |
|---|---|---|---|---|---|
| **SEC-AUTH-01** | Valid Caller JWT Verification | User $U_1$ has active profile & active membership in Org $O_1$. | Call `get_user_effective_permissions(O_1)` via request-scoped client with $U_1$'s Bearer JWT. | PostgreSQL derives `auth.uid() = U_1.id`. Returns array of entitled permissions. | PostgREST HTTP 200; `current_setting('request.jwt.claims')` logs confirm `sub = U_1.id`. |
| **SEC-AUTH-02** | Missing Authorization Header | Database running with RLS. | Call API / RPC with no `Authorization` header. | Terminated by Express with HTTP 401; zero database RPC invocation. | Express log: `401 Unauthorized: Missing token`. Database connection pool observes zero queries. |
| **SEC-AUTH-03** | Malformed / Tampered JWT | User token with forged signature. | Send request with altered signature payload. | GoTrue / PostgREST cryptographic signature check fails. Terminated with HTTP 401. | PostgREST response: `{"message": "Invalid JWT signature"}`. |
| **SEC-AUTH-04** | Expired Caller JWT | Valid user token with `exp` in the past. | Issue request with expired token. | Terminated with HTTP 401 `SESSION_EXPIRED`. Zero state mutations. | Express response: `code: "SESSION_EXPIRED"`. |
| **SEC-AUTH-05** | Inactive User Profile | $U_1$ has `profiles.is_active = false`. | Send request with valid JWT for $U_1$. | Terminated with HTTP 403 `Forbidden: User account is inactive`. Fails closed. | Express HTTP 403; resolver RPC returns `ARRAY[]::TEXT[]`. |
| **SEC-AUTH-06** | Inactive Organization Membership | $U_1$ is active, but `organization_members.is_active = false` in $O_1$. | Send request targeting $O_1$. | Denied with HTTP 403 `Forbidden: Organization access denied`. | Zero access to tenant records. Resolver returns empty array. |
| **SEC-AUTH-07** | Actor ID Parameter Forgery | Caller $U_1$ submits payload containing `p_actor_id = U_2.id`. | Invoke authorization mutation RPC. | Database completely ignores `p_actor_id` and derives actor from `auth.uid() = U_1.id`. Audit records $U_1$. | Audit log `actor_id` equals $U_1.id$. Forged parameter has zero effect. |
| **SEC-AUTH-08** | Cross-Organization Request | User $U_1$ (member of $O_1$) requests data from $O_2$. | Request `/api/roles` with header `X-Organization-ID: O_2`. | Rejected by middleware with HTTP 403; RLS on database prevents row leakage. | Express HTTP 403; direct PostgREST returns empty list (`[]`). |
| **SEC-AUTH-09** | User Metadata Spoofing | User updates Supabase Auth `user_metadata` to `{"is_super_admin": true}`. | Attempt administrative mutation. | Database inspects `profiles.is_super_admin` table column; rejects metadata claim. | RPC raises `42501 Insufficient Privilege`. Mutation aborted. |
| **SEC-AUTH-10** | Service-Role Invocation of Human Mutation RPCs | Service-role client attempts to call user-facing mutation RPC directly. | Call `assign_user_role(...)` using `ENV.SUPABASE_SERVICE_ROLE_KEY`. | PostgreSQL raises exception: `auth.uid() is NULL`. Mutation rolls back. | RPC aborts with `22023: Human actor authentication required`. |
| **SEC-AUTH-11** | Request-Scoped Client Isolation | Two concurrent Express requests: Request A ($U_1$) and Request B ($U_2$). | Fire concurrent requests with different JWTs. | PostgREST processes each request under its distinct `auth.uid()`. No header leakage. | DB logs show Request A executed as $U_1$, Request B executed as $U_2$. |
| **SEC-AUTH-12** | Background Workload Identity | Background task connects without end-user JWT. | Invoke background payroll worker RPC. | Executes under dedicated `workload_worker` role. Audit records `actor_type = 'SYSTEM'`. | Audit log confirms `actor_id IS NULL`, `actor_type = 'SYSTEM'`. |

---

## 3. Test Suite 2: RLS and Database Function Security

| Test ID | Scenario Description | Initial Fixture Setup | Execution Action / Input | Expected Result / Invariant | Verification Evidence Required |
|---|---|---|---|---|---|
| **SEC-RLS-01** | Anonymous Role Direct Table Access | Client connected as `anon` role. | Execute `SELECT * FROM public.organizations`, `SELECT * FROM public.roles`. | Zero rows returned or error `42501 permission denied`. | `information_schema.role_table_grants` confirms zero SELECT grants to `anon`. |
| **SEC-RLS-02** | Authenticated Direct DML Lockdown | Client connected as `authenticated`. | Execute direct `INSERT INTO public.roles` or `UPDATE public.user_roles`. | PostgreSQL raises `42501 permission denied for table roles`. | SQL execution error `42501`. Direct table write blocked. |
| **SEC-RLS-03** | RLS Tenant Containment | Tenant $O_1$ and Tenant $O_2$ have isolated records in `departments`. | Authenticated user of $O_1$ executes `SELECT * FROM departments`. | RLS policy returns exclusively rows where `organization_id = O_1`. Zero rows from $O_2$. | Returned record count matches $O_1$; zero $O_2$ UUIDs present in result. |
| **SEC-RLS-04** | UPDATE Policy USING and WITH CHECK | User attempts to update own profile row to set `organization_id = O_2`. | Execute `UPDATE profiles SET organization_id = O_2 WHERE id = auth.uid()`. | Prevented by trigger `fn_enforce_profile_security_fields` or RLS `WITH CHECK`. | SQL raises `42501` or updates 0 rows. Organization ID unchanged. |
| **SEC-RLS-05** | Public EXECUTE Revocation | Inspect function ACLs across all 26 database routines. | Query `pg_proc.proacl` for `public` execute grants. | Zero sensitive functions grant EXECUTE to `PUBLIC` or `anon`. | Catalog query returns empty set for unapproved public executions. |
| **SEC-RLS-06** | Search Path Injection Defense | Attacker creates malicious shadow function in `public` or `pg_temp`. | Invoke `SECURITY DEFINER` function. | Function executes strictly within fixed `search_path = public, pg_temp`. Shadow ignored. | Trace logs confirm schema qualification resolves trusted objects only. |
| **SEC-RLS-07** | Force Row Level Security Verification | Check `relforcerowsecurity` on all tenant business tables. | Query `pg_class.relforcerowsecurity`. | Flag is `true` for all tenant tables, binding table owners to RLS policies. | Catalog check confirms `relforcerowsecurity = true`. |

---

## 4. Test Suite 3: Authorization and Permission Modes

| Test ID | Scenario Description | Initial Fixture Setup | Execution Action / Input | Expected Result / Invariant | Verification Evidence Required |
|---|---|---|---|---|---|
| **SEC-PERM-01** | Mode ROLE Resolution | User $U_1$ has `permission_mode = 'ROLE'` and role grants `Role.View`, `Role.Add`. | Invoke `get_user_effective_permissions(O_1)`. | Returns exactly `['Role.View', 'Role.Add']`. | Effective permissions array contains role grants. |
| **SEC-PERM-02** | Mode USER_CUSTOM Complete Replacement | $U_1$ assigned role with `Role.View`, but switched to `USER_CUSTOM` with custom grant `Department.View`. | Invoke `get_user_effective_permissions(O_1)`. | Returns exclusively `['Department.View']`. Role grants are completely replaced. | `Role.View` is absent; `Department.View` is present. |
| **SEC-PERM-03** | Empty USER_CUSTOM Set Fails Closed | $U_1$ switched to `USER_CUSTOM`, but zero rows inserted into `user_permission_assignments`. | Invoke `get_user_effective_permissions(O_1)`. | Returns empty array `[]`. Grants zero permissions. | Returns `ARRAY[]::TEXT[]`. User denied access to all routes. |
| **SEC-PERM-04** | Module Entitlement Revocation Immediate Invalidation | Org $O_1$ has role with `TypeOfLeave.Add`. Admin disables `TypeOfLeave` in `organization_modules`. | User invokes `get_user_effective_permissions(O_1)`. | `TypeOfLeave.Add` is immediately omitted from effective permissions. | Even though `role_permissions` row exists, disabled module revokes effectiveness. |
| **SEC-PERM-05** | Single Role Per User Invariant | User $U_1$ already has role $R_1$ in $O_1$. | Attempt to insert a second role $R_2$ into `user_roles`. | Database rejects with `23505 unique_violation` on `(organization_id, user_id)`. | SQL constraint error `23505`. User maintains exactly one role. |
| **SEC-PERM-06** | System Role Assignment Rejection | Admin attempts to assign global `SYSTEM TENANT_ADMIN` role via user-role endpoint. | Call `assign_user_role(O_1, U_1, system_role_id)`. | Database trigger / RPC rejects: `role_type must be CUSTOM and owned by organization`. | Error code `42501`. Assignment aborted. |
| **SEC-PERM-07** | Cross-Organization Role Assignment Blocked | Admin of $O_1$ attempts to assign a custom role owned by $O_2$. | Submit assignment payload with $O_2$'s role ID. | Database rejects: Foreign key constraint `(organization_id, role_id)` fails. | SQL error `23503 foreign_key_violation`. |

---

## 5. Test Suite 4: Administrator Lifecycle and Concurrency

| Test ID | Scenario Description | Initial Fixture Setup | Execution Action / Input | Expected Result / Invariant | Verification Evidence Required |
|---|---|---|---|---|---|
| **SEC-ADMIN-01** | Last Administrator Demotion Blocked | Org $O_1$ has exactly one active administrator ($U_1$). | Admin attempts to self-demote or change role to an employee role. | Transaction aborts: `Cannot remove the last eligible organization administrator`. | SQL exception raised. $U_1$ remains active administrator. |
| **SEC-ADMIN-02** | Atomic Manager Replacement | Org $O_1$ has 1 admin ($U_1$). Admin executes atomic replacement. | In one transaction: assign manager role to $U_2$ and demote $U_1$. | Transaction succeeds. Post-mutation admin count is 1 ($U_2$). Audit records both events. | Transaction commits. $U_2$ is eligible admin; $U_1$ is demoted. |
| **SEC-ADMIN-03** | Mode Switch to USER_CUSTOM Disqualification | $U_1$ is sole admin. Admin attempts to switch own mode to `USER_CUSTOM`. | Execute `user_permission_settings` mode update to `'USER_CUSTOM'`. | Transaction aborts under Option A: switches admin count to 0, violating invariant. | SQL error raised. Mode remains `'ROLE'`. |
| **SEC-ADMIN-04** | Concurrent Demotion Race Condition | Org $O_1$ has 2 admins ($U_1, U_2$). Two sessions concurrently attempt demotion. | Session 1 demotes $U_1$; Session 2 demotes $U_2$ simultaneously. | Organization row lock serializes execution. Session 1 succeeds; Session 2 aborts (count would reach 0). | Exactly one demotion commits; second session raises exception. |
| **SEC-ADMIN-05** | Assigned Manager Role Archival Blocked | Role $R_{admin}$ is currently assigned to active admin $U_1$. | Admin attempts to set `is_active = false` on $R_{admin}$. | Transaction aborts: role is required for administrator eligibility. | SQL exception raised. Role remains active. |
| **SEC-ADMIN-06** | Platform Break-Glass Recovery | Org $O_1$ has 0 admins (locked out). | Platform SuperAdmin invokes `recover_organization_management_access(O_1, U_new)`. | Provisions `ORG_ADMIN` custom role, assigns to $U_{new}$, sets mode `ROLE`, records ticket audit. | $U_{new}$ becomes eligible manager. Zero business permissions granted. |

---

## 6. Test Suite 5: Organization Bootstrap and Invitation Lifecycle

| Test ID | Scenario Description | Initial Fixture Setup | Execution Action / Input | Expected Result / Invariant | Verification Evidence Required |
|---|---|---|---|---|---|
| **SEC-BOOT-01** | Successful First-Manager Provisioning | Clean system. SuperAdmin initiates onboarding for new company. | Invoke `provision_organization_bootstrap(...)` with valid parameters. | Org created, 4 modules enabled, 7 permissions entitled, `ORG_ADMIN` custom role created, invitation issued. | All tables populated atomically; outbox item queued; audit log committed. |
| **SEC-BOOT-02** | Idempotent Bootstrap Retry | Bootstrap committed in SEC-BOOT-01. | Client resubmits identical payload with same `Idempotency-Key`. | Returns cached response HTTP 201; zero duplicate records created in any table. | Database counts unchanged; idempotency log records cache hit. |
| **SEC-BOOT-03** | Idempotency Payload Conflict | Existing idempotency record with Key $K_1$. | Client submits Key $K_1$ with altered company name or email. | Aborts immediately with `40001 / 409 Conflict: Idempotency conflict`. | SQL error raised; zero database mutations. |
| **SEC-BOOT-04** | Expired Invitation Redemption Blocked | Onboarding invitation created with `expires_at = clock_timestamp() - INTERVAL '1 hour'`. | User attempts redemption with valid token secret. | Redemption RPC aborts: `Onboarding invitation has expired`. | Error code `42501`. Invitation remains unredeemed. |
| **SEC-BOOT-05** | Invitation Email Mismatch Rejection | Invitation issued to `alice@example.com`. | User registers Supabase Auth as `bob@example.com` and attempts redemption. | Redemption RPC aborts: `Authenticated account does not match the invited email`. | Error code `42501`. Bob denied membership. |
| **SEC-BOOT-06** | Double-Acceptance Replay Prevention | Valid invitation issued. | Session 1 and Session 2 concurrently redeem the same token. | Row-level lock serializes; first session redeems and activates membership; second is rejected. | Exactly one membership created; `redeemed_at` populated once. |

---

## 7. Test Suite 6: Audit Integrity and Data Retention

| Test ID | Scenario Description | Initial Fixture Setup | Execution Action / Input | Expected Result / Invariant | Verification Evidence Required |
|---|---|---|---|---|---|
| **SEC-AUDIT-01** | Atomic Mutation and Audit Rollback | Simulate database failure during audit insertion (e.g. invalid foreign key). | Execute role permission assignment. | Authorization mutation and audit record both roll back completely. Zero partial state. | Target role permissions unchanged; audit table row count unchanged. |
| **SEC-AUDIT-02** | Direct Audit Mutation Rejection | User connected as `authenticated` or `anon`. | Attempt `UPDATE public.audit_logs SET action = 'DELETE'` or `DELETE FROM audit_logs`. | Blocked at SQL privilege level and rejected by `enforce_audit_log_immutability()`. | PostgreSQL raises `42501 permission denied` or exception `Audit logs are immutable`. |
| **SEC-AUDIT-03** | Secret Redaction Verification | Mutation payload contains sensitive keys (`password`, `token_hash`). | Execute audited authorization RPC. | Emitted audit log JSON in `old_values` and `new_values` has sensitive keys stripped. | JSON query `old_values ? 'password'` returns `false`. |
| **SEC-AUDIT-04** | Organization Deletion Retention Protection | Org $O_1$ has 50 audit log entries. | SuperAdmin attempts `DELETE FROM public.organizations WHERE id = O_1`. | Database rejects deletion: `audit_logs_organization_id_fkey RESTRICT`. | SQL error `23503 foreign_key_violation`. Audit records preserved. |
| **SEC-AUDIT-05** | Audit Event Ordering Monotonicity | Rapid batch of 20 concurrent authorization transactions. | Execute concurrent role modifications. | Audit sequence (`audit_seq`) increments strictly monotonically without gaps or inversions. | `SELECT audit_seq FROM audit_logs ORDER BY audit_seq ASC` is strictly increasing. |

---

## 8. Test Execution Sign-Off Criteria

Phase 3 deployment authorization requires:
1. **100% Pass Rate:** All 38 security test scenarios must execute with zero failures on the real disposable Supabase target.
2. **Audit Evidence Log:** Raw test execution logs and database diffs must be archived in `docs/security/evidence/phase3_postgres_verification.log`.
3. **Dual Engineering Sign-Off:** Principal Security Engineer and PostgreSQL Specialist signatures required.
