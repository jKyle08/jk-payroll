# `src/features/users/` Agent Instructions

## Responsibility
User profile directories, department allocations, role assignments, and direct permission grants.

## Key Files
- `user.controller.ts`: Endpoints for querying and modifying user profiles.
- `user.service.ts`: Enforces tenant isolation on user queries (SEC-04).
