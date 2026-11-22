# PayPulse Project Status Maintenance Guide

Use this guide with the [dashboard](PAYPULSE_MASTER_PROJECT_DASHBOARD.md), [phase register](PAYPULSE_MASTER_PHASE_REGISTER.md), [deliverable tracker](PAYPULSE_PROJECT_DELIVERABLE_TRACKER.md), [decision register](PAYPULSE_DECISION_AND_APPROVAL_REGISTER.md), [blocker register](PAYPULSE_BLOCKER_AND_RISK_REGISTER.md), [environment tracker](PAYPULSE_ENVIRONMENT_AND_DEPLOYMENT_TRACKER.md), and [phase history](PAYPULSE_PHASE_HISTORY.md).

## Update procedure

When a phase changes, update the phase record, workstreams, deliverables, evidence, decisions, blockers/risks, environment state, percentages, dashboard counts, and dated history entry together. Cite a repository path and section, commit, test output, formal approval record, environment inventory, or deployment record for each status claim. If evidence is missing, use NOT VERIFIED.

## Status vocabulary

Main phase statuses: NOT STARTED, PLANNED, IN PROGRESS, UNDER REVIEW, CONDITIONALLY COMPLETE, COMPLETED, BLOCKED, ON HOLD, NOT VERIFIED.

Deliverables: NOT STARTED, IN PROGRESS, AUTHORED, UNDER REVIEW, APPROVED, VERIFIED, BLOCKED, NOT APPLICABLE.

Implementation milestones are independent: SPECIFIED → DESIGNED → AUTHORED → IMPLEMENTED → TESTED → VERIFIED → DEPLOYED. A later milestone never follows automatically from an earlier one.

## Percentage calculation

Use explicit required deliverables and acceptance criteria as the denominator, equally weighted unless the phase specification defines a different weight. Count only verified completion in the numerator. Show the numerator/denominator and keep mandatory approvals visible; 100% artifact authorship does not make a phase complete. If scope is not enumerable, use N/A.

## Governance boundaries

This tracker reports status and does not grant authority. A READY or COMPLETED label never authorizes database writes, migrations, remote access, deployment, or production changes. Verify environment identity and the operation's separate authorization before acting. Never include credentials, access tokens, service-role keys, or secrets.

## Source-of-truth coordination

Security phase implementation/verification/production approval remains governed by `docs/security/SECURITY_REMEDIATION_MASTER_TRACKER.md`. This project register summarizes but does not supersede it. When the two conflict, preserve the discrepancy and reconcile through cited evidence; do not silently overwrite either record. Keep historical reports immutable unless explicitly authorized; add dated corrections rather than rewriting history.
