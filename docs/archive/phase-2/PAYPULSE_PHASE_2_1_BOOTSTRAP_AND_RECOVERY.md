# PayPulse Phase 2.1 — Bootstrap and Recovery

**Status:** Proposed design; no code/schema/database changes  
**Date:** 2026-11-22 (Asia/Manila)

## Decision E — First organization manager and entitlement bootstrap

### Catalog prerequisite

The requested management capabilities are `roles.view`, `roles.create`, `roles.update`, `roles.delete`, `roles.assign_permissions`, `users.assign_roles`, and `users.manage_permissions`. Those are conceptual requirements, not verified catalog codes. Checked-in `supabase/seed.sql` currently contains generic keys including `Role.View/Add/Edit/Delete`, `UserRole.View/Add/Edit/Delete`, `RolePermission.View/Add/Edit/Delete`, and `UserPermission.View/Add/Edit/Delete`. It does not demonstrate seven distinct management actions. Do not map these loosely to the seven permissions or silently create new catalog actions. Before implementation, approve exact stable `module_actions.full_key` entries (and module association) and a catalog migration plan.

### Recommended all-in-one transaction

Use an authenticated caller-JWT path, not a service-role actor parameter. The onboarding requester must be an active platform SuperAdmin as determined from `profiles.is_super_admin` using `auth.uid()` inside the database. A user-supplied `p_actor_id` cannot establish identity. A dedicated narrow function validates `auth.uid()`, profile active status, SuperAdmin status, and inputs before it mutates anything.

Within one transaction and a lock keyed by onboarding request/idempotency key:

1. Validate a canonical onboarding idempotency key and lock/check it. Reject mismatched replay payloads.
2. Create or validate organization identity/lifecycle rows; create initial department if required; ensure there is no duplicate organization or existing conflicting provisioning record.
3. Validate each approved baseline organization module against the canonical `modules` catalog and platform licensing policy. Create `organization_modules` rows as enabled only when platform authority permits them.
4. Resolve all seven management actions by exact canonical `module_actions.full_key`; require exactly one row per full key and valid module association. Fail if missing, duplicate, inactive, or mapping version differs.
5. Insert `organization_permissions` for precisely those seven management actions, and ensure each parent `organization_modules` row is enabled. No other action is inserted.
6. Create one organization-owned active `CUSTOM` manager role with stable code protected against duplicates; enforce `(organization_id,code)` uniqueness.
7. Insert exactly the seven `role_permissions` rows, each constrained by current organization entitlement.
8. Create initial manager's active profile/membership (or link existing Auth identity only after explicit invitation validation). Set `organization_members.is_owner` as lifecycle metadata only if business onboarding requires it; it grants no permissions.
9. Insert exactly one `user_roles` assignment and `user_permission_settings(permission_mode='ROLE')`. Do not create user-custom grants.
10. Insert a detailed, redacted audit event for organization creation, entitlement grants, role creation/grants, membership, and manager assignment in the same transaction. Actor is `auth.uid()`.
11. Mark onboarding idempotency record complete and return generated IDs. Commit only after all constraints and audit insertion succeed.

### Failure, retry, concurrency, partial state

Database transaction atomicity means any failed catalog check, entitlement FK, role uniqueness, membership/role assignment, audit insert, or final validation rolls back all changes. Retrying with the same idempotency key and identical request returns the prior completed result; same key with changed payload rejects. A transaction-level advisory lock or locked idempotency row serializes duplicate onboarding. Unique constraints remain the final race backstop.

There should be no externally visible half-provisioned organization. If external Auth invite delivery cannot occur in the database transaction, write an outbox event in that same transaction; a worker delivers it idempotently after commit. Delivery failure leaves the database in a fully provisioned but not-yet-notified state and is retried; it does not roll back committed organization state. This is a controlled state, unlike missing manager grants.

The existing migrations 18/19 define service-role-granted SECURITY DEFINER onboarding/invitation functions. This recommendation does not assert their current deployed behavior or grant safety. They must be separately reviewed and replaced/adapted so user-initiated provisioning has a DB-verifiable SuperAdmin actor. If a genuine platform bootstrap must happen before a Supabase user can authenticate, use a separately authenticated operator/workload identity and an audited one-time provisioning channel; do not represent it as a user RPC or trust a supplied UUID. The exact bootstrap operator channel remains open until the product flow is reviewed.

## Decision F — Role deletion, archival, and administrator protection

- Organization roles are soft-deactivated with `is_active=false`; they remain addressable for historical assignment and audit interpretation.
- An active role cannot be deactivated if doing so would remove the last eligible administrator. Establish an eligible replacement in the same transaction first.
- Assigned roles cannot be hard-deleted. Reassignment is explicit, permission-checked, audited, and transactional. Historical `user_roles` data should be retained or closed with an effective interval rather than erased if historical interpretation is required.
- A role with historical assignments or audit references remains archived, not deleted. Hard deletion may be considered only for never-assigned draft roles after proving no FK/audit/reference, under a separate retention policy. Safer default: never hard-delete role identities.
- Changing a role's management grants or organization scope uses the same organization lifecycle lock and post-change eligibility check. A role cannot move across organizations; create a replacement role and reassign explicitly.
- SYSTEM roles remain global and outside organization assignment. No organization workflow may assign or convert them implicitly.
- Role code/name changes preserve immutable role ID and audit before/after identity. Protected management role codes may have special naming rules only if explicitly decided; authority comes from relational grants and constraints, never code string alone.

## Decision G — Recovery and migration rollback

### Recovery classes

| Situation | Recovery action | Authority / audit |
|---|---|---|
| Administrator lockout | Controlled platform recovery creates or restores only the seven management entitlements/grants and assigns a new organization CUSTOM manager. No payroll/employee grants. | Authenticated platform SuperAdmin via dedicated narrow function, or separately approved break-glass operator if no SuperAdmin is available. Record actor, approver(s), reason, organization, exact before/after state, timestamp, and incident reference. Dual approval recommended for offline break-glass. |
| Entitlement bootstrap failure before commit | Transaction rolls back; inspect error/report and retry after catalog/entitlement correction. No partial organization state should remain. | Original authorized SuperAdmin; retries use same idempotency key. Audit any committed recovery/correction. |
| Failed authorization migration before cutover | Stop rollout; fix forward migration on disposable PostgreSQL, then stage. For an applied migration, prefer a corrective forward migration. | Migration operator and reviewer recorded. No production changes from this design. |
| Partial application cutover | Route traffic only to a compatible application/schema version; preserve old/new schema until reconciliation. Disable new mutation path if invariant cannot be proven. | Release operator with incident/review record; do not execute destructive rollback. |
| Audit subsystem failure | Sensitive mutation fails closed and rolls back. Restore audit availability; do not bypass audit. Emergency correction requires separately logged break-glass system with external durable evidence. | Security/DB operator dual control; alert and incident record. |
| Invalid role reconciliation | Abort migration/transaction; produce conflict report and resolve manually. Never auto-select a role or union grants. | Organization owner/business authority plus security review; decisions individually traceable. |
| Incorrect mode classification | Correct via audited transactional mode change and reviewed grants; effective access may temporarily be denied. Never union role/custom grants as a recovery shortcut. | Authorized manager with `users.manage_permissions`, or platform recovery route when locked out. |
| Incorrect entitlement | Revoke through audited transaction; recompute effective access at request time. Preserve dormant assignments; they remain ineffective until entitlement is explicitly restored. | Platform SuperAdmin entitlement workflow and review. |

### Rollback distinctions

- **Application compatibility rollback:** Revert application traffic/code to a version compatible with the expanded schema. Keep additive schema and new data; avoid assuming reverse migration.
- **Forward corrective migration:** Preferred for schema/data errors once writes have occurred. Make correction idempotent, audited where data authorization is touched, and tested on a copy.
- **Backup restoration:** Last resort; may lose legitimate transactions and audit events after backup. Requires incident approval, recovery-point decision, consistency checks, and reconciliation of external Auth/email effects.
- **Emergency administrator recovery:** A controlled authorization mutation, not a schema rollback. Restore management only and keep business permissions absent unless separately entitled and granted.

Never assume a down migration is safe after new normalized entitlement, role, mode, audit, or membership data has been written. No recovery route may silently assign a broad SYSTEM role, restore arbitrary historical grants, or bypass current entitlements.

## Implementation prerequisites

Approve exact canonical management action keys; identify/authenticate first-owner flow; verify existing invitation/onboarding functions and service-role ACLs; choose organization baseline module entitlements; design idempotency/outbox handling; approve break-glass actors/dual control; settle audit retention and organization deletion behavior. All deployed facts remain open until separate read-only target inventory.
