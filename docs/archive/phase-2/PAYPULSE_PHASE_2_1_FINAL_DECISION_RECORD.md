# PayPulse Phase 2.1 — Final Decision Record

**Status:** Design recommendation; implementation not authorized by this document  
**Date:** 2026-11-22 (Asia/Manila)  
**Repository-only review:** Yes  
**Database/Supabase connection:** No  
**Code/schema changes:** None

## 1. Executive decision

Phase 2.1 recommends moving authorization-sensitive database operations from the shared service-role client to request-scoped Supabase clients carrying the verified user's original JWT. PostgreSQL derives the human actor from `auth.uid()` and independently checks active profile, active membership, organization context, explicit management permissions, and current entitlements. A normal actor parameter or caller-controlled session variable is never identity evidence. Service-role access is not a human authorization boundary.

Reuse and harden the existing `public.audit_logs` system rather than introducing a second ledger. Ensure authorization mutation and redacted audit event share one DB transaction. Make admin eligibility a dynamic predicate over canonical normalized rows and serialize all changes that can alter the predicate on an organization lock. Require a ROLE-mode manager with an active organization-owned CUSTOM role and all seven exact, currently entitled management actions. Owner and SuperAdmin flags do not count as organization business administrators.

Provision the first organization manager in one transaction after validating canonical action catalog entries and establishing only approved management entitlements. Use an idempotency key and database lock. Failure rolls everything back. Recovery is a separate audited management-only operation, never a business-permission bypass.

## 2. Evidence and confidence labels

### Verified repository facts (static source only)

- `src/server/db/supabase.ts` creates a singleton service-role Supabase client and a singleton anon client.
- `auth.middleware.ts` calls `supabase.auth.getUser(token)` for remote token verification, then performs production profile and effective-permission RPC calls through the service-role client; the RPC receives `p_organization_id` and `p_user_id`.
- Production middleware rejects local JWTs as identity tokens. Development/local paths and in-memory repository resolution exist; they are not a production DB identity proof.
- The checked-in core schema's `user_roles` primary key permits multiple role rows per user/org. Role and permission structures are not yet the proposed final composite-integrity model.
- The checked-in `supabase/seed.sql` includes `Role.View/Add/Edit/Delete`, `UserRole.View/Add/Edit/Delete`, `RolePermission.View/Add/Edit/Delete`, and `UserPermission.View/Add/Edit/Delete`. It does not evidence seven separate management action codes (`roles.assign_permissions`, etc.).
- Migration 3 defines `audit_logs`, a SECURITY DEFINER generic row-audit function, an UPDATE/DELETE rejection trigger, and revokes UPDATE/DELETE/TRUNCATE from PUBLIC/anon/authenticated. Its audit SELECT/INSERT policies use legacy profile/owner/role sources. The table's organization FK cascades on organization deletion. These are checked-in source facts, not verified final/deployed definitions.
- Migrations 18/19 contain service-role-only SECURITY DEFINER onboarding/invitation routines. Their current deployed owner, ACL, body, and actor trust behavior have not been inspected on a database.
- Request permission sets are populated in middleware; frontend permission sets are memoized. Repository/static caches also exist. Cross-request invalidation and durable authorization consistency need implementation analysis.
- Existing working tree has user changes and untracked files. No existing file was edited by this Phase 2.1 task.

### Proposed decisions

The caller-JWT database trust boundary, dedicated function owner policy, audit extension/retention model, administrator predicate, manager bootstrap, soft-deactivation role lifecycle, and recovery model in the companion documents are recommendations for approval.

### Not verified

No Supabase project, PostgreSQL database, migration ledger, deployed table, RLS policy, function ACL, role attribute, Auth hook, Data API exposure, or remote fixture was queried. No tests were run. Do not interpret source migration contents as deployed state.

## 3. Decisions made for this design

1. **Actor context:** Use the user's signed Supabase JWT on a request-scoped anon/publishable client for authorization-sensitive DB operations; require DB-derived `auth.uid()`. Never authorize based on `p_actor_id`, user metadata, a session GUC, or possession of service-role key.
2. **Fallback:** No service-role fallback on an authorization RPC error. Fail closed. Keep service-role use only for explicitly scoped system tasks with separate workload identity/actor semantics.
3. **Function policy:** Prefer SECURITY INVOKER. Any SECURITY DEFINER function must be narrowly scoped, non-exposed, fixed-search-path, explicitly owned by least-privilege non-login/non-BYPASSRLS role, and have explicit EXECUTE ACLs with PUBLIC/anon revoked.
4. **Audit:** Extend existing `audit_logs`; derive actor from DB identity; insert audit and mutation atomically; failure rolls back. Redact fields and prevent ordinary mutations. Change organization-delete retention because current source cascade conflicts with retained audit.
5. **Administrator:** Eligible administrator requires active org, active profile, active membership, exactly one active org-owned CUSTOM role in `user_roles`, ROLE mode, and all seven currently entitled management actions. Owner flag and SuperAdmin do not count. USER_CUSTOM cannot qualify under this proposal.
6. **Concurrency:** All changes to the admin eligibility predicate lock the organization row or equivalent shared serialization key before checking post-state. Lock multiple orgs in deterministic order.
7. **Provisioning:** One transaction creates reviewed module/action entitlements, organization manager role/grants, membership, user role, ROLE settings, and audit. Exact action catalog rows validated. Idempotent retries; no partial managerless org. No implicit business grants.
8. **Role lifecycle:** Soft-deactivate/archive role IDs; assigned or historically referenced roles cannot be hard-deleted. Reassignment is explicit and audited. SYSTEM roles remain outside org assignment.
9. **Recovery:** Forward corrective migrations preferred after writes; application compatibility rollback keeps expanded schema/data. Backup restore is last resort. Break-glass administrator recovery is audited management-only and does not grant business permissions.

## 4. Decisions still unresolved

1. **Canonical management catalog:** Exact `module_actions.full_key`, module mapping, and whether new granular keys must be added. Current checked-in seed offers generic CRUD keys and is not an adequate verified mapping for seven distinct controls.
2. **Bootstrap module baseline:** Which modules the platform may initially enable and which organizations receive each action entitlement. Manager provisioning fails until all seven management actions are explicitly entitled.
3. **First-owner identity lifecycle:** Whether initial owner invitation is redeemed before or as part of organization bootstrap; how a pre-auth account path is established without trusting a UUID/service-role actor parameter.
4. **Audit retention:** Legal retention duration, immutable archive medium, purge approval, and whether organization deletion is prohibited or audit is detached/archived.
5. **Audit actor/system context:** Exact Supabase role ownership, transaction context, request/correlation ID source, and workload actor types.
6. **Last-admin exception:** Whether emergency recovery can proceed when organization is suspended, and which two-person approvals apply.
7. **USER_CUSTOM admin policy:** This design says custom mode is never administrator-eligible; product must confirm this operational constraint.
8. **Action permission codes vs API routes:** Existing frontend/backend generic key checks and proposed management permissions need a reviewed mapping and cutover plan.
9. **Active organization definition:** Confirm status, is_active, start/end date, and any billing/contract conditions used for administrator eligibility.
10. **Legacy data:** Actual multi-role rows, mismatches, role grants, direct permissions, owners, admin flags, and audit references remain unknown until read-only target inventory.
11. **Function owner availability:** Confirm a least-privilege function owner role can be created/used under the target Supabase administration model.
12. **Pool/session behavior:** Verify request-scoped bearer handling through actual Supabase PostgREST and app runtime without shared mutable headers.

## 5. Security assumptions and threats

### Mitigated by proposed design

- Client-supplied actor ID spoofing for user-sensitive DB mutation.
- Confused deputy from service-role calls that trust HTTP-provided actor parameters.
- Stale or forged user metadata determining SuperAdmin or org permission authority.
- Pooled connection actor-context leakage when GUCs are mistakenly treated as identity.
- Direct authorization table writes that bypass audit and invariant checks (if privileges are correctly revoked).
- Cross-tenant role/permission assignment through composite constraints, RLS, function checks, and tested service paths.
- Audit loss from normal application mutation and last-admin races, assuming all relevant write paths use one transaction/lock protocol.
- Administrator lockout through accidental demotion/deactivation/role changes, assuming catalog actions and all mutation paths are complete.

### Not fully mitigated / residual threats

- Compromise of Express process or theft of a still-valid user access token can act as that user within granted permissions.
- Theft of the service-role key remains a broad platform/database risk; user-level DB actor proof does not make the key harmless for other permitted operations.
- Superuser/BYPASSRLS/database owner can bypass RLS and potentially disable triggers/change audit. Audit is not cryptographically tamper-proof against a fully privileged database operator.
- Supabase/Auth/PostgREST misconfiguration or stale JWT claims can affect identity/role checks; current DB row checks must be authoritative for mutable authorization.
- A missing mutation path in the admin lock discipline can invalidate dynamic last-admin protection.
- Legacy application maps, routes, or old RPCs may continue to authorize under old rules until verified cutover.
- Audit retention can fail through privileged action, cascade, storage failure, or an incorrect retention/archive design.
- Data backfill choices can either widen access or lock out users; no source-only review resolves real records.

## 6. Dependencies and implementation prerequisites

1. Confirmed-target read-only inventory of schema/migration ledger, roles, policies/grants, function overloads/owners/config/ACL, triggers, audit schema, Auth hook, Data API settings, and role attributes.
2. Approve canonical management action names and explicit initial entitlement mapping.
3. Resolve owner/bootstrap/onboarding path and trusted initial actor.
4. Approve audit retention and organization deletion behavior.
5. Inventory all service-role Supabase client call sites; classify read, user mutation, platform mutation, and workload operation.
6. Replace authorization-sensitive calls with request-scoped caller JWT path and remove service-role fallbacks.
7. Restrict direct DML, secure function ACLs, and align RLS with final normalized schema.
8. Implement audited transaction functions, idempotent bootstrap, organization lock protocol, and role archival.
9. Resolve existing role/grant/membership conflicts manually before adding constraints.
10. Execute the Phase 2.1 real PostgreSQL/Supabase test plan against a confirmed disposable target; then staging review and independent production approval.

## 7. Phase 3 readiness recommendation

**Recommendation: NOT READY to begin Phase 3 implementation.** The conceptual decisions are now concrete enough for a Phase 3 implementation-impact assessment after explicit approval of the open policy items. They are not enough to safely implement migrations or authorization code yet: canonical management catalog keys and initial entitlements are unresolved, actor/bootstrap integration needs application design, deployed state is unknown, audit retention conflicts with checked-in cascade semantics, and real PostgreSQL security/concurrency evidence is absent.

| Readiness category | Assessment |
|---|---|
| Phase 2.1 design completeness | READY WITH OPEN POLICY DECISIONS |
| Security architecture | READY FOR REVIEW; NOT VERIFIED |
| Audit architecture | READY FOR REVIEW; RETENTION DECISION REQUIRED |
| Administrator lifecycle | READY FOR REVIEW; CATALOG AND CONCURRENCY VERIFICATION REQUIRED |
| Implementation prerequisites | NOT READY |
| Phase 3 implementation | NOT READY |
| Database deployment | NOT READY |

## 8. Stop condition and file list

Created exactly these five Phase 2.1 design artifacts:

1. `PAYPULSE_PHASE_2_1_SECURITY_AND_ACTOR_CONTEXT.md`
2. `PAYPULSE_PHASE_2_1_AUDIT_AND_ADMINISTRATOR_LIFECYCLE.md`
3. `PAYPULSE_PHASE_2_1_BOOTSTRAP_AND_RECOVERY.md`
4. `PAYPULSE_PHASE_2_1_POSTGRESQL_SECURITY_TEST_PLAN.md`
5. `PAYPULSE_PHASE_2_1_FINAL_DECISION_RECORD.md`

No application source, existing migration, database, Supabase project, or deployment configuration was changed. No tests or SQL were executed. Phase 2.1 stops here; Phase 3 implementation and deployment require explicit later authorization.
