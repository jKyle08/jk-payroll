# PayPulse Phase 2.1 — PostgreSQL Security Test Plan

**Status:** Specification only; no tests executed  
**Date:** 2026-11-22 (Asia/Manila)

Use a confirmed disposable real PostgreSQL/Supabase project with separate auth identities and database roles. PGlite/mocks are supplementary only. Each test must use committed transactions where relevant, inspect both returned result and persisted state, and clean fixtures through verified cleanup. No remote project was contacted for this design.

## Actor context and service-role boundary

| Setup | Operation | Expected result / invariant |
|---|---|---|
| Authenticated User A with valid JWT and active membership | Call mutation through request-scoped client carrying A's bearer token | DB derives `auth.uid() = A`; authorized operation succeeds only with required permission. Audit actor is A. |
| User A JWT; payload contains `p_actor_id = B` | Call narrow mutation RPC | Reject mismatch or ignore parameter and record A only. Caller cannot choose audit actor. |
| service-role client calls user mutation RPC with `p_actor_id=A` but no user JWT | Attempt mutation directly | Deny; no mutation/audit row. A normal parameter or service-role privilege is not human identity proof. |
| Missing, malformed, expired, revoked/invalid JWT | Call protected function | 401/permission error; no mutation. |
| Valid token but inactive profile or no active membership in target org | Call organization mutation | Deny; no row/audit changes. |
| Valid User A JWT, request target organization B | Call mutation/read | Deny cross-org operation; no target data leak. |
| Attempt to pass user ID through user metadata or `app_metadata` | Call resolver/mutation | Actor remains `auth.uid()`; metadata cannot override DB identity or SuperAdmin status. |
| Two requests use same reused application process/client, first A then B | Execute user-context calls concurrently/sequentially | Each DB request receives its own bearer token; no Authorization header leakage. Result/audit actors match each request. |
| Simulate pooled/reused DB connection | Set any session GUC in request A then issue request B | No actor context is inherited; GUC is ignored as identity; B is denied/authorized solely by B's signed JWT and current DB rows. |
| Direct RPC call from authenticated client bypassing Express | Invoke authorization mutation function | Function still performs actor, organization, permission, entitlement, and invariant checks; cannot bypass app route guard. |
| Service-role credential leaked/stolen simulation | Direct call to sensitive service-role RPC without user JWT | User mutation denied. Credential may remain powerful for unrelated admin tasks; secret protection/rotation is still required. |

## Function ACL, owner, and RLS tests

| Setup | Operation | Expected result / invariant |
|---|---|---|
| Sensitive SECURITY DEFINER function with default grants intentionally checked | Query ACL and invoke as `anon` | No PUBLIC/anon EXECUTE; invocation denied. Test every overload independently. |
| Authenticated user | Invoke internal helper not designated public | Permission denied; no arbitrary user/org/permission oracle response. |
| Approved authenticated RPC | Invoke with caller JWT | Only explicit role can execute; internal function validates `auth.uid()` and inputs. |
| Function owner inventory | Inspect owner role attributes | Owner is explicit least-privilege non-login role without superuser/BYPASSRLS, unless an individually approved exception with compensating checks. |
| Function with `search_path` | Inspect `proconfig`; attempt object shadowing in `pg_temp`/caller schema | Trusted qualified objects resolve; untrusted shadow cannot alter behavior. `pg_temp` cannot precede trusted schemas. |
| Direct `authenticated` DML against entitlement/grant/settings tables | INSERT/UPDATE/DELETE outside RPC | Denied where mutation must be atomic with audit. |
| Authenticated row access | Read/update cross-organization rows; alter organization/user/role FK on update | RLS/constraints deny. UPDATE requires qualifying SELECT visibility plus correct USING and WITH CHECK. |
| Role variants (`anon`, `authenticated`, app workload, service_role, table owner, BYPASSRLS-capable) | Execute same probes | Expected access matrix is explicit. Confirm FORCE RLS does not falsely imply protection against superuser/BYPASSRLS. |

## Audit integrity tests

| Setup | Operation | Expected result / invariant |
|---|---|---|
| User with management permission | Perform each sensitive authorization mutation | Exactly one canonical audit event commits with DB-derived actor, org, operation, target, allowlisted before/after state. |
| Force audit insertion failure (test-only constraint/trigger fault) | Perform authorization mutation | Entire transaction rolls back; no authorization row changes persist. Error is not swallowed. |
| Ordinary authenticated role | UPDATE/DELETE/TRUNCATE audit log | Denied by SQL privileges and immutability guard (where trigger applicable). |
| SECURITY DEFINER audit append function | Try to alter/delete prior events or submit arbitrary actor | Append-only operation only; actor derived from `auth.uid()` or explicit system identity; arbitrary spoofing denied. |
| Audit before/after payload contains sentinel secret | Execute mutation | Secret/token/password fields absent or redacted. Only authorization-relevant fields recorded. |
| Organization deletion attempt with audit history | Delete organization | Audit history is retained/restricted by approved retention design; no unexpected cascade deletion. |
| Concurrent authorization transactions | Commit in overlapping order | Each event accurately reflects transaction's old/new state; IDs/correlation allow tracing; do not assert wall-clock equals commit ordering. |
| Generic audit trigger plus explicit RPC event | Execute sensitive mutation | Exactly one intended semantic audit event or documented paired events; no duplicate/conflicting attribution. |

## Administrator, entitlement, and bootstrap tests

| Setup | Operation | Expected result / invariant |
|---|---|---|
| One eligible ROLE-mode manager; all seven canonical actions entitled/granted | Remove/demote/deactivate manager | Rejected unless a second eligible manager is established in same transaction. No implicit role choice. |
| Two managers; manager A demotes A while manager B remains eligible | Demote A | Succeeds if all other checks pass; audit old/new eligibility. |
| Only manager switches to USER_CUSTOM, including custom set containing some/all management actions | Switch mode | Rejected under target eligibility rule, because USER_CUSTOM does not qualify as administrator. Must add replacement transactionally. |
| Only manager's role deactivated/deleted or a management grant removed | Mutate role/grant | Rejected unless replacement is established in transaction. Assigned role is soft archived; no hard deletion. |
| Two DB sessions concurrently demote separate administrators | Execute lifecycle mutation with organization lock | At most one can leave the org with one manager; second reevaluates post-lock and is rejected without replacement. |
| Revoke last management entitlement or disable its module | Platform entitlement mutation | Rejected if it leaves active org without eligible manager; or accepted only with approved replacement/recovery in same controlled transaction. Business permissions are not added. |
| Suspended organization with manager assignments | Resolve business permission / reactivate | Business permission denied while suspended; assignments preserved. Reactivation requires eligible admin verification or recovery. |
| Owner flag true, no qualifying role/grants | Resolve admin status | Not an eligible administrator; owner flag grants no business permission. |
| Global SYSTEM role assignment attempt | Assign using org path | Rejected even for platform admin; first-owner provisioning uses only its separately specified custom role. |
| Two concurrent onboarding requests, same idempotency key and payload | Provision organization | Exactly one organization/manager set; retry returns same result; no duplicate entitlement/role/audit. |
| Same idempotency key with different payload | Retry provisioning | Reject conflict; no partial changes. |
| Platform SuperAdmin caller with valid user JWT | Bootstrap with missing/unknown management action | Transaction fails atomically; no half-provisioned org, role, membership, entitlement, or audit. |
| Non-SuperAdmin caller or service-role call without user context | Bootstrap | Denied; no organization or manager creation. |
| Successful first-owner bootstrap | Inspect grants and resolver result | Exactly seven approved management grants, ROLE settings, one role assignment; no payroll/employee/action grants. Audit actor is verified SuperAdmin. |
| Outbox email delivery failure after DB commit | Retry delivery | DB remains fully provisioned; notification retries idempotently; no duplicate manager or entitlement records. |
| Emergency recovery | Restore management to locked-out org | Only approved management entitlements/role/assignment restored; no business grants; operator/approvals/reason recorded. |

## Authorization freshness and application cache

| Setup | Operation | Expected result / invariant |
|---|---|---|
| Request A has preloaded permission set | Revoke permission or entitlement in DB, then issue a new request | New request denies; no cross-request stale permission cache. |
| Same request after mutation | Attempt another protected action within same request | Policy defines whether request snapshot may continue; preferred mutation response invalidates/reloads context and avoids privilege persistence beyond the request. |
| Frontend holds old permission list | Server denies newly revoked operation | UI state is advisory only; API/DB denial remains authoritative. Refresh mechanism updates UI without granting access. |
| Permission resolver RPC errors/timeouts | Call protected endpoint | Fail closed (403/401 or safe server error without executing protected mutation); no fallback to in-memory map or service-role trust. |

## Test execution gates

1. Run catalog, schema, function ACL, and RLS tests on real PostgreSQL matching target version.
2. Use at least two independent connections for administrator-count, role-assignment, provisioning, and permission mutation races.
3. Test as `anon`, `authenticated`, application workload, `service_role`, table/function owners, and any BYPASSRLS-capable roles.
4. Verify migration on disposable target first; inspect resulting ACLs/policies/function owners. PGlite-only success is not deployment proof.
5. Preserve failure evidence and do not claim live Supabase validation absent actual test execution.
