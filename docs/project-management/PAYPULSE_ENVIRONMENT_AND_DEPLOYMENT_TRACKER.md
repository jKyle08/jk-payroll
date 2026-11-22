# PayPulse Environment and Deployment Tracker

As of 2026-11-22. Environment identity, authorization, migration state, and deployment state are tracked independently. Credentials and secrets must never be copied into this file.

| Environment | Identity verified | DB changes authorized | Migrations applied | Deployment status |
|---|---|---|---|---|
| Local repository | YES (workspace and `main` branch observed) | N/A | Files through 20261122100002 are present; local DB application NOT VERIFIED | Source worktree dirty; no deployment implied |
| Local PostgreSQL | NO | NO evidence | NOT VERIFIED | Phase 3.1C report says authentic PG server/client/runtime unavailable |
| Development Supabase | Prior report identifies project `fsnfqnbixitmmjmeogml` as development | Historical authorization scope only; current authorization NOT VERIFIED | Deployment report documents migrations through 19; later state NOT VERIFIED | Current remote state NOT VERIFIED; no connection made for this tracker |
| Disposable staging | NO | NO | NOT VERIFIED | BLOCKED pending owner designation and explicit read-only authorization |
| Production | Identity/state not inspected | NO production approval | NOT VERIFIED | NOT APPROVED; see security readiness record |

## Verification rules

- Verify target identity from an authoritative project owner record, never from variable names alone.
- Record least-privilege authorization and scope separately from environment identity.
- Capture migration ledger and catalog evidence with timestamp and target reference, omitting secrets.
- A checked-in migration proves AUTHORED only. A deployment report proves only its dated scope; it does not prove current remote state.
- Do not connect to remote services for this documentation task. Any future read-only inspection needs explicit target designation and authorization; writes require separate authorization.
