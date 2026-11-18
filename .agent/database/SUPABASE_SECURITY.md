# Supabase Security & Recursive CTE Procedures

Status: `IMPLEMENTED`

## 1. Recursive CTE Procedures

Defined in `20261104000002_functions_and_rls.sql`:

### 1.1 `get_department_sub_tree(p_org_id UUID, p_dept_id UUID)`
Recursive downward CTE returning all subordinate department records:
```sql
WITH RECURSIVE dept_tree AS (
    SELECT id, organization_id, parent_department_id, name, depth
    FROM public.departments
    WHERE organization_id = p_org_id AND id = p_dept_id
    UNION ALL
    SELECT d.id, d.organization_id, d.parent_department_id, d.name, d.depth
    FROM public.departments d
    JOIN dept_tree dt ON d.parent_department_id = dt.id
)
SELECT * FROM dept_tree;
```

### 1.2 `get_department_ancestors(p_org_id UUID, p_dept_id UUID)`
Recursive upward CTE returning the entire ancestor branch up to the root department.

### 1.3 `get_user_effective_permissions(p_org_id UUID, p_user_id UUID)`
RPC function calculating the user's active permissions. Evaluates:
1. Active tenant status.
2. Direct user permission grants.
3. Role permission grants via `user_roles`.
4. Downward department module inheritance.
5. Implicit permission expansion (`.Add` -> `.View`).
