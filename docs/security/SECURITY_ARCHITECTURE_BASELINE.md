# PayPulse Security Architecture Baseline

**Last reviewed:** 2026-11-21 (Asia/Manila)  
**State:** Describes the intended and currently implemented workspace design. It is not proof of deployed database state or production approval. Phase status is tracked only in the [master tracker](SECURITY_REMEDIATION_MASTER_TRACKER.md).

## Identity and registration

- Supabase Auth is the identity provider. The Express server validates identity and loads production authorization context from PostgreSQL.
- Public employee registration requires a single-use invitation bound to the invitee’s email. The invitation determines organization, department, and role; public request fields cannot select owner/admin status or an arbitrary tenant.
- First-owner registration is a separate SuperAdmin-authorized onboarding process. Its email-bound token expires after 24 hours. Redemption persists the organization, initial department, profile, owner membership, and initial tenant-admin assignment within one database transaction.
- Organization admins may invite members only to an active custom role and department belonging to their active organization. SuperAdmin privileges and owner status are not assignable through member registration.

## Authorization and tenancy

- Active organization membership is required for tenant access. A profile’s organization or administrator flag by itself is not membership evidence.
- Organization lifecycle and user active state are checked; context, permission RPC, or database errors fail closed.
- The permission model has three cascading tiers: organization licensing (`organization_modules`), department allocation (`department_modules`), and user/role action grants (`user_permissions` / `role_permissions`).
- Tenant administrators cannot assign roles across organizations, global/system roles, or privileged administrator roles; self-promotion through role assignment is rejected.
- PostgreSQL RLS and explicit RPC privileges are database boundaries. The Express API validates actor and invitation authority before using service-role database access; the service-role key is never an authorization decision by itself.

## Production data and cache

- Supabase PostgreSQL is authoritative for production profiles, organizations, memberships, invitations, and assignments.
- The in-memory `DatabaseRepository` may serve tests/local behavior and cache-like needs; it is not evidence for production authorization.
- Production authentication and organization context are loaded from PostgreSQL. Permission resolution errors return no permissions.
- Application caches are updated after successful database commit. PostgreSQL provisioning RPCs perform related row changes atomically.

## Transitional authority and verification limits

- Migration 19’s organization-admin helper still recognizes a scoped profile admin flag and a legacy membership role source as transitional paths, but only with active membership/profile/organization checks. These sources should be removed after legacy data is normalized and a separately reviewed migration is prepared.
- Workspace migration files are not evidence that a database has applied them. Actual RLS policies, grants, function ACLs, trigger definitions, role attributes, and migration ledger remain unverified until checked on a real PostgreSQL/Supabase instance.
- Current embedded PGlite results are useful SQL evidence but do not establish deployed Supabase behavior.

## Implementation guidance

Keep detailed subsystem instructions in `.agent/security/`, `.agent/database/`, and `.agent/testing/`. Those files guide implementation and should link to this baseline; they are not phase trackers. Record current status in the [master tracker](SECURITY_REMEDIATION_MASTER_TRACKER.md) and production acceptance in [SECURITY_PRODUCTION_READINESS.md](SECURITY_PRODUCTION_READINESS.md).
