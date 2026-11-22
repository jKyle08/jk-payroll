# PayPulse Phase 2.1 — Security and Actor Context

**Status:** Proposed design; no code/schema/database changes  
**Date:** 2026-11-22 (Asia/Manila)

## Evidence labels

- **Repository fact:** directly visible in checked-in source/migrations/seeds; not evidence of deployed state.
- **Proposed decision:** recommended target for Phase 3 review.
- **Open verification:** requires future authorized, read-only inventory on a confirmed target.

## Decision A — Trusted actor context for authorization mutations

### Repository facts and threat model

- `src/server/middleware/auth.middleware.ts` verifies a Supabase token using `supabase.auth.getUser(token)` in its remote-token path, but then uses the singleton `getSupabaseClient()` configured with `ENV.SUPABASE_SERVICE_ROLE_KEY` for profile reads and `get_user_effective_permissions` RPC calls. That RPC receives `p_organization_id` and `p_user_id` as ordinary parameters.
- `service_role` bypasses RLS. PostgreSQL cannot infer that an arbitrary user ID passed by this role corresponds to the HTTP caller. A route/controller bug, forged client-supplied ID, compromised server path, leaked service key, or direct service-role RPC call can therefore bypass the intended actor boundary unless every RPC has another trusted identity proof.
- The test/dev path may accept a locally signed token. Such a token is not a Supabase database identity and must not authorize production PostgreSQL operations.
- `auth.uid()` and `auth.jwt()` are reliable only when the database request is executed under the caller's validated Supabase JWT context. A normal RPC parameter or custom GUC is not proof.
- Pooling/reuse makes session-level actor variables especially unsafe: state may survive within a connection and be observed by another request. Transaction-local GUCs prevent ordinary leakage but remain caller-writable and therefore are not authenticated identity.

### Selected design: caller-JWT database context for authorization-sensitive operations

**Decision:** All organization authorization reads and mutations, and all platform entitlement mutations initiated by a user, must reach PostgREST/PostgreSQL using the original Supabase access token and a publishable/anon key so PostgreSQL derives `auth.uid()` from the signed JWT. Express remains responsible for verifying identity and request shape, but the DB independently validates the actor, membership, effective management permission, target organization, target resource, and current entitlements. Sensitive RPCs derive actor only from `auth.uid()` and reject missing identity. Any `p_actor_id` compatibility argument, if retained, must equal `auth.uid()` and is not itself evidence.

Create a request-scoped Supabase client (or an equivalently isolated request client) with the user's bearer token. Do not mutate Authorization headers on the shared singleton. Do not carry user tokens in a global client. Authorization-sensitive paths must not silently fall back to service role when user-context RPC fails.

Use `SECURITY INVOKER` RPCs and RLS where possible. If a narrow `SECURITY DEFINER` operation is necessary, it still checks `auth.uid()` inside the function, validates current profile/membership/permission state, and has tightly restricted EXECUTE ACLs. It must not trust any client or backend parameter as actor identity.

Production endpoints reject local development JWTs for database authorization, consistent with the current production middleware's local-token prohibition. On auth verification failure, token expiry, missing `auth.uid()`, RPC failure, organization mismatch, inactive membership, or revoked permission: return 401/403 and make no write. Permission reads fail closed to no permissions.

### Trust-boundary sequence

```mermaid
sequenceDiagram
  participant C as Client
  participant E as Express
  participant A as Supabase Auth/PostgREST
  participant D as PostgreSQL
  C->>E: Request + Supabase access token
  E->>A: Validate token / getUser
  A-->>E: Verified auth user
  E->>E: Validate route schema; derive org from trusted request context
  E->>A: Request-scoped client, anon/publishable key + same bearer JWT
  A->>D: Execute as authenticated with JWT claims
  D->>D: auth.uid(); active profile/membership; permission/entitlement checks
  D->>D: Mutation + audit in one transaction
  D-->>E: Result or denial; any failure rolls back
  E-->>C: Result / 401 / 403
```

Pseudocode:

```text
verified = auth.getUser(incomingBearer)
if invalid_or_expired(verified): reject 401
assert production_token_is_supabase_token
org = resolve_and_validate_requested_org(verified.id, request)
db = requestScopedClient(publishableKey, Authorization=incomingBearer)
result = db.rpc('mutate_authorization', { org_id, target, operation })
-- function derives actor := auth.uid(); it does not trust an actor parameter
if rpc_error: deny; never retry with service role
```

### Alternatives considered

| Approach | Assessment |
|---|---|
| User-context authenticated DB calls | **Selected.** Signed Supabase JWT is validated by Supabase/PostgREST; `auth.uid()` gives DB-verifiable actor. RLS and function checks can use the same identity. Token expiry/revocation freshness is bounded by Supabase session/token behavior and must be tested. |
| DB-verifiable signed actor context | Not selected. Would require a separate signing key, secure verification function/extension, rotation, nonce/expiry/replay policy, and ensuring service-role callers cannot access/sign with verification secrets. A GUC or ordinary parameter is insufficient. Avoid adding this key-management subsystem when caller JWT exists. |
| Narrow trusted backend mutation boundary using service role | Insufficient alone. Restricting RPC grants to `service_role` only distinguishes the service credential, not which end user caused the call. A stolen key or confused-deputy bug can spoof actor parameters. Could be used for non-user automated tasks only with separately authenticated workload identity and explicit system actor semantics. |

### Limitations and assumptions

- Depends on Supabase Auth/PostgREST forwarding the signed caller claims into `auth.uid()` for each request. Verify in real Supabase integration.
- A compromised Express process can use a user's bearer token while it is in memory; TLS, secret hygiene, short session exposure, and route authorization remain necessary. A stolen service-role key remains highly privileged and must be rotated/restricted.
- Authenticated database role's table grants/RLS must be configured so direct Data API access cannot bypass intended mutation RPCs. Revoke direct writes to authorization tables where writes must go through audited functions.
- Platform SuperAdmin authority is checked against active `profiles.is_super_admin` inside DB logic, not JWT `user_metadata` or a client boolean. Do not trust stale authorization claims as sole authority.
- Background jobs without an end-user JWT use a distinct workload path and actor type; they must not pretend to be a human. Scope each job to specific operations and audit as a system actor.
- Open verification: exact PostgREST/auth behavior, deployed roles and grants, existing function owners/ACLs, Auth hook setup, and all call sites.

## Decision B — Function and privilege policy

1. Prefer `SECURITY INVOKER`; use `SECURITY DEFINER` only when a documented capability cannot safely be achieved via invoker privileges/RLS, such as narrowly scoped atomic provisioning or protected audit append.
2. Create a dedicated non-login, non-superuser, non-`BYPASSRLS` owner role for each narrowly defined function family where Supabase role model permits it. Grant only needed table/function privileges. Do not own application functions by `postgres` merely for convenience. The exact available roles and ownership permissions require target verification.
3. Put internal functions in a non-exposed schema (e.g. `private` only after confirming schema exposure/usage). Do not assume a schema is hidden without checking Supabase Data API exposed schemas and grants.
4. Fix `search_path` to trusted schemas only and `pg_temp` last; fully qualify every relation/function/type. Never rely on caller-controlled schema resolution.
5. Set explicit owner and ACL. Revoke default `EXECUTE` from `PUBLIC`, then explicitly grant only the needed role. Revoke from `anon`; grant `authenticated` only for intentionally callable functions. For system-only jobs use a restricted workload principal, not a broad public RPC.
6. Inventory every overload by schema/name/identity arguments, owner, `prosecdef`, `proconfig`, ACL, and reachable schema. New overloads get independent review; an ACL on another signature does not secure the new one.
7. `FORCE ROW LEVEL SECURITY` subjects ordinary table owners to RLS in typical operation, but superusers and roles with `BYPASSRLS` still bypass it. A `SECURITY DEFINER` function executes with its owner privileges; if that owner bypasses RLS, table policies are not the boundary. Function-body checks, minimum owner privilege, narrow grants, and tests are required.
8. No unrestricted helper may answer arbitrary `(user,organization,permission)` questions to untrusted callers. The resolver should validate `p_user_id = auth.uid()` for authenticated use; internal cross-user administrative reads are exposed only through separately authorized narrow operations.
9. Revoke direct `INSERT/UPDATE/DELETE` on entitlement/grant/assignment/settings tables from `authenticated` where mutation must be atomic with audit. Grant `EXECUTE` on mutation functions instead. Reads can remain table/RLS-based or use narrow invoker functions. Service role remains outside this user-level trust model.

### Function verification checklist and read-only SQL examples

Do not execute these as part of Phase 2.1. Run only during a separately authorized read-only target inventory.

```sql
-- Function overloads, owner, security mode, fixed configuration and ACL
SELECT n.nspname AS schema_name, p.proname, pg_get_function_identity_arguments(p.oid) AS identity_args,
       pg_get_userbyid(p.proowner) AS owner, p.prosecdef AS security_definer,
       p.proconfig, p.proacl, p.oid::regprocedure AS signature
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public', 'private')
ORDER BY 1,2,3;

-- Roles with superuser/BYPASSRLS capability
SELECT rolname, rolsuper, rolbypassrls, rolcanlogin
FROM pg_roles ORDER BY rolname;

-- RLS state and force flag
SELECT n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind='r' AND n.nspname='public';

-- Table grants (review direct and inherited role memberships too)
SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema IN ('public','private')
ORDER BY 1,2,3,4;
```

Also inspect `pg_policies`, `pg_default_acl`, role memberships, exposed-schema configuration, function source for dynamic SQL, triggers, and every direct/indirect RPC caller. Verify PUBLIC/anon execution denial for each sensitive overload, owner non-login/non-BYPASSRLS, direct DML denial, and expected authenticated invocation in integration tests.

## Phase 3 prerequisites

Before implementation, inventory call sites and split clients by trust context; convert authorization reads/writes to caller-JWT clients; design narrow `auth.uid()`-derived functions; add tests for direct Data API and RPC bypass; inspect target roles/ACL/RLS. Existing repository facts do not prove deployed configuration.
