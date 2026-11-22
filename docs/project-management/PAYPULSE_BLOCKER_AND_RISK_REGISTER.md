# PayPulse Blocker and Risk Register

Status date: 2026-11-22. Risks are potential harms; blockers currently prevent a defined gate from proceeding.

| ID | Description | Severity | Type / phase | Owner | Status | Resolution / evidence |
|---|---|---|---|---|---|---|
| B-01 | P-01 product decision has no formal approval evidence | HIGH | Blocker, 2.2/3.0 | Product Management | OPEN | Record signed Option A or B decision; Phase 3.0 decision register. |
| B-02 | No designated disposable staging identity and read-only authorization evidenced | CRITICAL | Blocker, 3.0/3.1 | Project Owner | OPEN | Designate target and authorize read-only inventory; do not treat `.env` development target as staging. |
| B-03 | Authentic PostgreSQL migration and concurrency verification unavailable in Phase 3.1C report | HIGH | Blocker, 3.1C | DB Engineering | OPEN | Provide isolated supported PostgreSQL target and archive actual execution results. |
| B-04 | Current migration files and worktree changed after reports' recorded baseline; sequence/status conflict | HIGH | Risk / review gate, 3.0/3.1 | Engineering Lead | OPEN | Reconcile files, reports, migration ledger, and current branch before any execution plan. |
| B-05 | Deployed schema/data conflict density and migration ledger parity unknown for designated staging | HIGH | Blocker, 3.0/3.1 | DB Engineering | OPEN | Authorized read-only inventory and reconciliation report. |
| B-06 | Phase 3.1 authority, first-owner, invitations, history, last-admin recovery decisions unresolved | HIGH | Blocker, 3.1 | Product + Security | OPEN | Decide and document policy; see Gate 0–1 and Phase 3.0.1/3.0.2 records. |
| R-01 | Existing worktree contains user modifications and many untracked artifacts/migrations | MEDIUM | Reproducibility risk | Engineering Lead | ACTIVE | Preserve; review/commit process outside this tracker. Git status confirms. |
| R-02 | Security test suite may contact configured Supabase and write fixtures; project/cleanup not verified | HIGH | Test safety risk | QA / Security | ACTIVE | Do not run integration suite until target and cleanup are verified; see Gate 0–1 report. |
| R-03 | Static migration review may miss real PostgreSQL ACL, RLS, lock, or concurrency behavior | HIGH | Security risk | DB Security | OPEN | Authentic PG execution and independent review. |
| R-04 | Production deployment not approved and production readiness criteria remain open | CRITICAL | Release risk | Release authority | OPEN | Close production readiness checklist and obtain formal release approval. |

No verified schema drift or data conflicts are asserted here; they are unknown until an authorized inventory is completed.
