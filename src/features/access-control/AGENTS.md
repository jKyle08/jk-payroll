# `src/features/access-control/` Agent Instructions

## Responsibility
Granular permission evaluation, permission matrices, and UI gating atoms.

## Key Files
- `components/permission-gate.tsx`: `<PermissionGate>` atom for conditionally rendering UI based on user permissions.
- `components/permission-matrix.tsx`: Interactive permission matrix table.
- `hooks/use-permission.ts`: Client hook evaluating effective permissions with implicit `.View` support.
- `access-control.routes.ts`: Endpoints for querying module action dictionaries.
