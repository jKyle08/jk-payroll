# PayPulse Decision and Approval Register

Status date: 2026-11-22. Proposals are not approvals. Check the cited records before changing any status.

| ID | Decision | Classification | Status | Authority / evidence | Affected phases / dependency |
|---|---|---|---|---|---|
| P-01 | ROLE-only organization administration (Option A) vs effective-permission administration (Option B) | Governance | PENDING | Product Management approval required; Phase 2.2 closure and Phase 3.0 decision register preserve as pending. | Phase 2.2 / 3.0 and downstream admin implementation; do not infer from architectural recommendation. |
| ADR-2.2 | Trusted actor, canonical permissions, lifecycle, audit, bootstrap, API contract and migration approach | Technical | SPECIFIED; acceptance NOT VERIFIED | Ten Phase 2.2 architecture artifacts and final decision record. | Phase 3 implementation; review before implementation. |
| ADR-3.0.1 | Three-level authorization model / target authority direction | Technical / product policy | UNDER REVIEW | Phase 3.0.1 decision and architecture documents. | Phase 3.1; explicit policy decisions and inventory required. |
| ADR-3.0.2 | Single-organization authorization authority consolidation | Technical / product policy | UNDER REVIEW | `PHASE_3_0_2_SINGLE_ORGANIZATION_AUTHORIZATION_ARCHITECTURE.md` says no Phase 3.1 authorization. | Phase 3.1 design and data migration. |
| ENV-01 | Designate disposable staging target and permit read-only preflight | Operational approval | PENDING | Phase 3.0 readiness assessment. | Staging inventory and all remote verification. |
| MIG-01 | Peer review and approval of Phase 3.0A/B migrations | Technical approval | PENDING / NOT VERIFIED | Readiness assessment checklist. | Any controlled execution review. |
| PROD-01 | Production release approval | Release | NOT GRANTED | `docs/security/SECURITY_PRODUCTION_READINESS.md`. | Production deployment. |

## Required decision record fields

For each change, record decision ID, exact choice, rationale, alternatives, classification, authorized approver, dated approval evidence, affected phases, implementation dependency, and any superseded record. A recommendation, report heading, or assistant instruction is not approval evidence.
