# PayPulse Phase 2.1 — Audit and Administrator Lifecycle

**Status:** Proposed design; no code/schema/database changes  
**Date:** 2026-11-22 (Asia/Manila)

## Decision C — Extend the existing audit system

### Repository facts

- Checked-in migration 3 defines `public.audit_logs` with organization, actor, action, entity, before/after JSONB, IP/user agent, and timestamp fields. It adds an UPDATE/DELETE immutability trigger and revokes UPDATE/DELETE/TRUNCATE from PUBLIC, `anon`, and `authenticated`.
- The same migration's trigger function `public.record_audit_log()` is `SECURITY DEFINER`; it attempts actor resolution from JWT and relational fallbacks and may fall back to a system label. The existing audit SELECT policy uses profile fields, JWT organization metadata, owner state, and role-code/name checks. These are source observations, not a complete final deployed definition.
- Existing generic audit triggers serialize whole rows / changed fields to JSONB. This can capture secrets or excessive personal data unless a per-table allowlist/redaction policy is applied.
- Existing audit table has `organization_id NOT NULL` with `ON DELETE CASCADE`; deleting an organization would delete its audit history. This conflicts with durable audit retention expectations and must be resolved before production use.

### Proposed model

Reuse `public.audit_logs`; do not create a second authorization audit ledger. Add or derive a stable `event_id`/transaction correlation identifier only if the existing schema lacks one and target review approves. Keep actor attribution from `auth.uid()` for user-context DB calls. A system job uses a separately constrained system actor type; never infer a human actor from caller input or session GUC.

Each authorization mutation function writes its event in the same PostgreSQL transaction. Event fields identify organization, actor, operation, target entity/table and identifier, DB timestamp, correlation/request ID where trustworthy, and allowlisted before/after authorization state. DB `transaction_timestamp()` is suitable for transaction ordering metadata but does not totally order concurrent transactions; use a monotonically increasing audit sequence or primary-key ordering only as a tie-breaker, and retain transaction ID/request ID for correlation. Do not promise wall-clock order equals commit order.

### Data minimization and record detail

- Include permission codes/IDs, role IDs/codes, mode, active status, and entitlement IDs needed to explain authorization changes.
- For set replacement, record old/new sorted permission identifiers or a compact deterministic diff; record counts/hash only if a reviewer can still reconstruct the event from retained immutable records. Prefer explicit IDs for security-critical grants.
- Exclude access tokens, password hashes, invitation secrets, service keys, full auth metadata, payroll/employee data unrelated to the authorization operation, and unnecessary email/IP/user-agent values. Redact allowlisted JSON before insert.
- Record a role deletion as a soft deactivation/archive event with preserved identity and grants. Avoid hard deleting rows that audit history references.
- Entitlement changes, role grant set changes, permission mode/set changes, role assignments, manager provisioning/replacement/recovery, and last-admin decisions require before/after details. Lower-risk role description/name edits may use concise field diffs. Reads need not be audited unless required by a separate policy.

### Append-only guarantees and ownership

Logical append-only means application policy says events are never changed/deleted. Database enforcement should combine:

1. `authenticated` has no UPDATE/DELETE/TRUNCATE privileges and no direct INSERT if only mutation functions may append.
2. A narrow audit append function or mutation function inserts the event; it cannot update/delete. Do not grant ordinary users execution of a generic arbitrary audit-insert API.
3. The immutable trigger rejects UPDATE and DELETE as defense in depth. Review owner/trigger privileges; superuser, table owner, or BYPASSRLS paths can still disable/drop triggers or truncate if privileged.
4. Separate retention/purge from ordinary mutation: archival/export to a separately controlled immutable store, then any purge only through break-glass maintenance with dual approval, recorded operator identity, reason, exported row range, and external evidence. Define legal retention before implementation.
5. Avoid `ON DELETE CASCADE` from organization to audit rows. Prefer `RESTRICT`/retention-preserving association or partition/archive strategy after target and legal review. This is an explicit schema decision required because the checked-in audit FK currently cascades.

Audit failure aborts the authorization change. A trigger/function error, constraint failure, or unavailable audit insert causes the transaction to roll back. Do not swallow audit failures in application code. Existing generic triggers must be checked for duplicate event creation; sensitive authorization mutations should have one canonical event, not both an opaque row trigger and a contradictory application event. Either adapt generic triggers with safe allowlists or suppress them for those writes through a trusted internal mechanism that clients cannot forge.

RLS on audit reads uses active membership plus an explicit audit-read permission and same organization scope; platform SuperAdmin access is a separate platform audit workflow. It should not gain ordinary business access. Actor/organization attribution cannot derive from user-editable metadata. The migration 3 policies and function grants require replacement/review before use under the target model.

## Decision D — Eligible organization administrator

### Authoritative rule

A user is an eligible organization administrator at the instant of a lifecycle transaction only when all are true:

1. Organization is active and not suspended/expired under the approved lifecycle policy.
2. User profile is active.
3. `organization_members` has an active row for that user and organization.
4. Exactly one canonical `user_roles` row assigns an active `CUSTOM` role owned by that organization.
5. `user_permission_settings` is `ROLE`.
6. The role has every required canonical management action through `role_permissions`.
7. Each of those actions is currently entitled in `organization_permissions`, and its module is enabled.

`USER_CUSTOM` does not qualify as an administrator under this policy, even if custom rows happen to contain the management actions. This avoids administrator protection depending on an editable ad hoc set and makes the designated manager role the governance mechanism. If product instead wants custom-mode admins, that is a decision change requiring complete equivalent lifecycle controls.

The owner flag is not included. SuperAdmin is not counted as an organization administrator. The seven action identifiers must be resolved from canonical `module_actions.full_key`; generic action keys currently visible in the checked-in seed do not establish all seven granular controls. Until the exact catalog mapping and entitlement baseline exist, no administrator count is considered verified.

### Lifecycle behavior

All manager-affecting operations use one transaction-scoped organization lock (e.g. lock the organization row `FOR UPDATE`; every relevant path must take the same lock before checks). Then evaluate pre/post counts using current entitlement and role state.

| Event | Required behavior |
|---|---|
| Remove/demote last administrator | Reject unless a qualifying replacement is added in the same transaction. Self-demotion is subject to the same invariant. |
| Deactivate membership/profile | Reject if it leaves an active organization with zero eligible administrators, unless replacement is included atomically. Profile-wide deactivation affecting multiple organizations must lock all impacted orgs in deterministic UUID order. |
| Deactivate/delete assigned role | Reject if any active member relies on it as last administrator. Soft-deactivate only after replacement. Hard delete assigned or historically referenced roles is prohibited. |
| Revoke management permission from role | Compute post-change eligible count under lock; reject if zero absent atomic replacement. |
| Switch administrator to USER_CUSTOM | Under this policy the switch removes administrator eligibility. Reject unless replacement is established in the same transaction. |
| Remove custom permissions | Does not change eligibility because USER_CUSTOM mode cannot establish admin eligibility; still enforce normal permission mutation rules. |
| Revoke organization management entitlement / disable its module | Check all impacted organizations/roles under locks. Reject or require a reviewed replacement entitlement/role before removing the last eligible manager. Emergency platform recovery is separate and does not add business grants. |
| Suspend organization | Business access is denied; manager count is lifecycle-inactive. Preserve assignments. On reactivation, verify an eligible manager exists before restoring normal operation or route through controlled recovery. |
| Concurrent manager changes | Organization row/advisory lock serializes all relevant changes. Use deterministic lock order for multi-org operations; test two sessions. Unique constraints alone do not protect the count invariant. |
| Ownership transfer | Changes lifecycle metadata only. Does not create or remove business authority. Transfer does not replace manager role; an explicit manager assignment is required. |

### Dynamic computation vs maintained invariant

**Recommendation:** Compute eligibility dynamically from canonical membership, role, setting, role-grant, and entitlement rows inside the same locked transaction that changes any dependency. Do not maintain a redundant `is_admin` boolean/count as an independent authority source. A cached count can be an optimization only if it is transactionally maintained and periodically reconciled; it is not the source of truth. Dynamic computation avoids drift but requires comprehensive mutation-path coverage and consistent locking. All mutation functions, entitlements, membership/profile lifecycle updates, and role grant updates must use the same locking protocol; direct DML is revoked.

Potential deadlock: deterministic lock order by organization UUID when an actor/profile/entitlement operation spans organizations. Retry only serialization/deadlock errors as a whole transaction, never partial statements.

## Required implementation prerequisites

Confirm actual audit table/trigger/grant state and organization-delete retention policy; finalize canonical management action IDs and entitlement rule; identify every path able to mutate administrator eligibility; then implement lock discipline and test actual PostgreSQL concurrency. No such target verification or test was performed for this addendum.
