# `src/features/payroll/` Agent Instructions

## Responsibility
Payroll calculation runs, compensation disbursements, and immutable calculation rule snapshots.

## Key Files
- `components/payroll-run-card.tsx`: Payroll summary and execution card.
- `payroll.controller.ts`: Endpoints for initiating and approving payroll runs.
- `payroll.service.ts`: Captures immutable calculation snapshots preserving organizational settings at runtime.
