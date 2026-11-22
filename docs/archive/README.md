# PayPulse Historical Documentation Archive (Phases 1–3)

**Notice & Authority Status:**  
> [!WARNING]  
> All documents contained within this `docs/archive/` directory tree represent historical proposals, point-in-time security audit evidence, pre-implementation design options, and transitional reviews created during Phases 1, 2, and 3 of the JK Payroll (PayPulse) architecture.  
> **Historical proposals within this archive must never be represented or interpreted as implemented functionality.**

---

## 1. Canonical Documentation Hierarchy

For active, authoritative, and deployed system specifications, consult:

1. [README.md](../../README.md) — System overview, local setup, and execution commands.
2. [ARCHITECTURE.md](../../ARCHITECTURE.md) — Canonical system architecture and 3-tier cascading RBAC model.
3. [AGENTS.md](../../AGENTS.md) — Authoritative root AI agent operating instructions and engineering rules.
4. [Consolidated System Architecture](../architecture/CONSOLIDATED_ARCHITECTURE.md) — Unified topology, multi-tenancy, and module specifications.
5. [Consolidated Database Guide](../database/CONSOLIDATED_DATABASE_GUIDE.md) — PostgreSQL schema, 27 forward migrations, constraints, and triggers.
6. [Consolidated Security Specification](../security/CONSOLIDATED_SECURITY_SPECIFICATION.md) — Authentication, RBAC, RLS policies, and fail-closed security.
7. [Consolidated Onboarding Specification](../onboarding/CONSOLIDATED_ONBOARDING_SPECIFICATION.md) — SuperAdmin invitations, 24h expiration, atomic provisioning RPC.
8. [Deployment & Migration Procedures](../deployment/DEPLOYMENT_AND_MIGRATION_PROCEDURES.md) — Staging/production deployment rules, preflight checks, ledger verification.
9. [Testing & Acceptance Criteria](../testing/TESTING_AND_ACCEPTANCE_CRITERIA.md) — 31 test suites, 510 tests, live Supabase & embedded PGlite test specs.
10. [Architectural Decision Records (ADRs)](../decisions/ARCHITECTURAL_DECISION_RECORDS.md) — Formal records for Decisions P-01 through P-05.
11. [Master Implementation & Deployment Report](../PAYPULSE_PHASES_1_3_FINAL_ENGINEERING_REPORT.md) — Verified live deployment status against remote Supabase.

---

## 2. Archive Inventory

### 2.1 Phase 1 Archive (`docs/archive/phase-1/`)
- `PHASE_1_1_FINAL_SECURITY_EVIDENCE_REPORT.md` — Historical audit evidence for Phase 1.1 authentication fixes.
- `SECURITY_REMEDIATION_REPORT.md` — Initial Phase 1 vulnerability inventory and containment roadmap.
- `phase1.1-verification-evidence.md` — Automated test logs and run evidence from Phase 1.1 remediation.
- `phase1.2-provisioning-remediation.md` — Transitional remediation notes for initial provisioning RPC.

### 2.2 Phase 2 Archive (`docs/archive/phase-2/`)
- `PAYPULSE_PHASE_2_DATABASE_ARCHITECTURE.md` — Pre-implementation design proposals for Phase 2 database structure.
- `PAYPULSE_PHASE_2_1_*.md` (5 files) — Transitional design proposals for audit logging, actor context, and test planning.
- `PAYPULSE_PHASE_2_2_*.md` (10 files) — Architectural closure reports, permission catalog proposals, and trusted actor specs.

### 2.3 Phase 3 Archive (`docs/archive/phase-3/`)
- `PAYPULSE_PHASE_3_0_*.md` (10 files) — Phase 3.0 readiness assessments, preflight reports, and security plans.
- `review/` (13 files) — Peer review reports, SQL security audits, and referential integrity analyses.
