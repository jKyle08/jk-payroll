# PayPulse Phase 3.0 — Phase B: Single Role per Organization User Specification

**Status:** Migration Authored (Ready for Controlled Review)  
**Date:** 2026-11-22  
**Migration Version:** `20261122100002_phase_3_0b_single_role_per_organization_user.sql`  
**Document Reference:** `docs/phase-3/PAYPULSE_PHASE_3_0_PHASE_B_SINGLE_ROLE_ENFORCEMENT.md`  

---

## 1. Executive Summary & Objective

In the base schema ([core_schema.sql#L238](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261104000001_core_schema.sql#L238)), `public.user_roles` was declared with `PRIMARY KEY (organization_id, user_id, role_id)`. This permitted a single user to be assigned multiple conflicting roles within the same organization, creating non-deterministic permission resolution and violating Approved Decision 6:
> **"A user has exactly one assigned role per organization."**

Furthermore, migration 18 previously assigned the global `SYSTEM TENANT_ADMIN` role to organization members.

**Phase B** enforces the single-role invariant on `public.user_roles`, migrates any legacy system role assignments to organization-owned custom manager roles (`ORG_ADMIN`), and establishes composite referential integrity between `user_roles` and `roles`.

---

## 2. Precondition Verification & Failsafe Execution

Phase B alters primary keys and foreign keys. In accordance with Section 2.1 and Section 4 (Workstream D), **this migration never automatically chooses or deletes conflicting roles**.

### Failsafe Execution Guard:
Before altering constraints, the migration executes an assertion block:
```sql
DO $$
DECLARE
    v_conflict_count INTEGER;
BEGIN
    SELECT count(*) INTO v_conflict_count
    FROM (
        SELECT organization_id, user_id
        FROM public.user_roles
        GROUP BY organization_id, user_id
        HAVING count(*) > 1
    ) ur;

    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'Phase 3.0B Precondition Failed: % multi-role user conflicts detected. Manual reconciliation required before applying unique constraint.',
            v_conflict_count USING ERRCODE = '23505';
    END IF;
END;
$$;
```
If even a single user holds $>1$ role, the entire transaction **immediately rolls back**, emitting error code `23505` and preserving all existing data untouched.

---

## 3. Data Reconciliation: Migrating SYSTEM TENANT_ADMIN Assignments

Before enforcing composite foreign keys, any existing assignments referencing `role_type = 'SYSTEM'` (such as `TENANT_ADMIN` created by Migration 18) must be transitioned to organization-owned `CUSTOM` roles:

```sql
DO $$
DECLARE
    v_rec RECORD;
    v_custom_role_id UUID;
    v_act RECORD;
BEGIN
    FOR v_rec IN 
        SELECT DISTINCT ur.organization_id 
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE r.role_type = 'SYSTEM'
    LOOP
        -- Locate or create CUSTOM ORG_ADMIN role for this organization
        SELECT id INTO v_custom_role_id
        FROM public.roles
        WHERE organization_id = v_rec.organization_id 
          AND code = 'ORG_ADMIN' 
          AND role_type = 'CUSTOM';

        IF v_custom_role_id IS NULL THEN
            INSERT INTO public.roles (
                organization_id, name, code, description, role_type, is_active
            ) VALUES (
                v_rec.organization_id, 'Organization Administrator', 'ORG_ADMIN',
                'Migrated Organization-Owned Manager Role', 'CUSTOM', true
            ) RETURNING id INTO v_custom_role_id;

            -- Grant the 7 canonical management permissions to the new custom role
            FOR v_act IN 
                SELECT id FROM public.module_actions 
                WHERE full_key IN (
                    'Role.View','Role.Add','Role.Edit','Role.Delete',
                    'RolePermission.Edit','UserRole.Edit','UserPermission.Edit'
                )
            LOOP
                INSERT INTO public.role_permissions (organization_id, role_id, module_action_id)
                VALUES (v_rec.organization_id, v_custom_role_id, v_act.id)
                ON CONFLICT DO NOTHING;
            END LOOP;
        END IF;

        -- Reassign user_roles records from SYSTEM role to the new CUSTOM role
        UPDATE public.user_roles ur
        SET role_id = v_custom_role_id
        FROM public.roles r
        WHERE r.id = ur.role_id 
          AND ur.organization_id = v_rec.organization_id 
          AND r.role_type = 'SYSTEM';

        -- Reassign legacy organization_members.role_id mirror
        UPDATE public.organization_members om
        SET role_id = v_custom_role_id
        FROM public.roles r
        WHERE r.id = om.role_id 
          AND om.organization_id = v_rec.organization_id 
          AND r.role_type = 'SYSTEM';
    END LOOP;
END;
$$;
```

---

## 4. Constraint Evolution & Referential Integrity

Once reconciliation is complete:
1. `public.roles` is altered to add `CONSTRAINT uq_roles_org_id UNIQUE NULLS NOT DISTINCT (organization_id, id);`.
2. `public.user_roles` primary key constraint `user_roles_pkey` on `(organization_id, user_id, role_id)` is dropped.
3. New primary key `PRIMARY KEY (organization_id, user_id)` is applied to `public.user_roles`.
4. Composite foreign key `fk_user_roles_org_role` is added:
   `FOREIGN KEY (organization_id, role_id) REFERENCES public.roles(organization_id, id) ON DELETE RESTRICT`.

This guarantees:
- A user can never hold more than one role per organization at the database level.
- A user can never be assigned a role owned by another organization.
- An assigned role cannot be hard-deleted while a user holds it (`ON DELETE RESTRICT`).

---

## 5. Postconditions & Validation Queries

```sql
-- 1. Verify single role primary key
SELECT conname, pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
WHERE t.relname = 'user_roles' AND c.contype = 'p';
-- Expected: PRIMARY KEY (organization_id, user_id)

-- 2. Verify zero SYSTEM roles remain in user_roles
SELECT count(*)
FROM public.user_roles ur
JOIN public.roles r ON r.id = ur.role_id
WHERE r.role_type = 'SYSTEM';
-- Expected: 0

-- 3. Verify zero cross-organization role assignments
SELECT count(*)
FROM public.user_roles ur
JOIN public.roles r ON r.id = ur.role_id
WHERE r.organization_id <> ur.organization_id;
-- Expected: 0
```

### Safety & Compensating Rollback Strategy:
- If a rollback of Phase B is required before downstream phases apply, a forward compensating script can revert the primary key constraint to `(organization_id, user_id, role_id)` and drop `fk_user_roles_org_role`.
- The reconciled custom roles and assignments remain valid and do not cause data corruption.
