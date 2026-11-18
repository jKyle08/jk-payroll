# Database Relationships & Foreign Key Integrity

Status: `IMPLEMENTED`

## 1. Entity Relationship Diagram

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ DEPARTMENTS : owns
    ORGANIZATIONS ||--o{ PROFILES : employs
    ORGANIZATIONS ||--o{ ORGANIZATION_MODULES : licenses
    ORGANIZATIONS ||--o{ ROLES : scopes
    ORGANIZATIONS ||--o{ PAYROLL_RUNS : executes
    ORGANIZATIONS ||--o{ AUDIT_LOGS : records

    DEPARTMENTS ||--o{ DEPARTMENTS : "parent of"
    DEPARTMENTS ||--o{ DEPARTMENT_MODULES : allocates
    DEPARTMENTS ||--o{ PROFILES : assigns

    MODULES ||--o{ MODULE_ACTIONS : contains
    MODULES ||--o{ ORGANIZATION_MODULES : activates
    MODULES ||--o{ DEPARTMENT_MODULES : inherits

    ROLES ||--o{ ROLE_PERMISSIONS : defines
    ROLES ||--o{ USER_ROLES : grants

    PROFILES ||--o{ USER_ROLES : holds
    PROFILES ||--o{ USER_PERMISSIONS : receives
    PROFILES ||--o{ AUDIT_LOGS : acts
```

---

## 2. Cascading Deletion Rules
- **Organization Deletion:** Deleting an organization cascades to delete all subordinate `departments`, `organization_modules`, `roles`, `payroll_runs`, and profiles.
- **Department Deletion:** Cascades down to child departments via `parent_department_id ON DELETE CASCADE`. Profiles in that department have their `department_id` set to `NULL` (`ON DELETE SET NULL`) to prevent orphan identity destruction.
