# Unit Testing Standards

Status: `IMPLEMENTED`

## 1. Unit Test Scope
Unit tests in Vitest verify:
- Pure business logic functions.
- Recursive CTE calculations (e.g. `getDepartmentSubTree`, `getDepartmentAncestors`).
- Zod schema validation rules and edge cases.
- UI atom and component rendering.
