# `src/features/leave-management/` Agent Instructions

## Responsibility
Leave types, leave requests, employee balances, approval workflows, and data scoping.

## Key Files
- `components/leave-table.tsx`: Data table for leave requests with pagination and status filters.
- `leave.controller.ts`: Endpoints for creating and querying leave records.
- `leave.service.ts`: Business logic enforcing departmental scoping via `dataScopingService`.
