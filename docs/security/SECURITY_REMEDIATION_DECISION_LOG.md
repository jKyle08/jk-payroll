# PayPulse Security Remediation Decision Log

**Last reviewed:** 2026-11-21 (Asia/Manila)  
**Purpose:** Preserve security decisions and prior recommendations. Current phase status is maintained only in the [master tracker](SECURITY_REMEDIATION_MASTER_TRACKER.md).

| Date | Decision | Rationale / evidence | Outcome |
|---|---|---|---|
| 2026-11-21 | Treat migration 13 as unsafe in isolation; retain migration 14 as its corrective migration. | The Phase 1.1 evidence identified a SECURITY DEFINER caller-context bypass, non-additive permission semantics, and incorrect department derivation in migration 13. Migration 14 was added to correct these findings. See [archived Phase 1.1 report](archive/PHASE_1_1_FINAL_SECURITY_EVIDENCE_REPORT.md). | Historical decision retained. Do not deploy migration 13 alone. Live database state remains unknown. |
| 2026-11-21 | Require membership as tenant authorization evidence; do not restore profile-only membership fallback. | Phase 1.1 verification found membership, organization lifecycle, and fail-closed context requirements. See [archived Phase 1.1 verification](archive/phase1.1-verification-evidence.md). | Maintained as architecture baseline. Some legacy admin authority sources remain transitional only with active membership. |
| 2026-11-21 | Restrict public registration to invitation redemption and separate first-owner onboarding from employee registration. | Phase 1.2 review found public service-role provisioning could create an active administrator profile without membership; old onboarding lacked durable organization/profile/membership persistence. | Implemented in source and migrations 18–19; verification is partial. |
| 2026-11-21 | First-owner onboarding uses a SuperAdmin-issued, email-bound, single-use link with a 24-hour expiration. | Product clarification: the SuperAdmin sends the intended organization administrator a link; that recipient submits organization details and registers. | Implemented in the Phase 1.2 workspace flow. No email-delivery integration was added; the UI returns a link to send. |
| 2026-11-21 | Do not approve Phase 1.1 production release based on embedded tests alone. | The Phase 1.1 report documented that staging was unreachable and no live PostgreSQL catalog or migration-ledger verification occurred. | **Rejected / not approved**; preserved in [archived report](archive/PHASE_1_1_FINAL_SECURITY_EVIDENCE_REPORT.md). |
| 2026-11-21 | Do not approve Phase 1.2 production release yet. | Build and 7 PGlite tests pass, but full suite has 4 failures and actual PostgreSQL/Supabase could not be reached. | **Rejected / not approved** pending regression fixes and staging verification; see [readiness](SECURITY_PRODUCTION_READINESS.md). |
| 2026-11-21 | Do not deploy migrations to production as part of the remediation review. | Explicit task constraint; no production migration was run. | Maintained. Any future deployment requires separate approval and release evidence. |

## Decision handling

This log records prior decisions without granting current approval. New decisions must include the date, scope, evidence, approver, and explicit outcome. Update phase state only in the master tracker. An implementation status or successful embedded test is not a production approval.
