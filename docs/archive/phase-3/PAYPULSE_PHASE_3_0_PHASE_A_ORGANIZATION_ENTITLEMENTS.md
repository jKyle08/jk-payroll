# PayPulse Phase 3.0 — Phase A: Organization Permission Entitlements Specification

**Status:** Migration Authored (Ready for Controlled Review)  
**Date:** 2026-11-22  
**Migration Version:** `20261122100001_phase_3_0a_organization_permission_entitlements.sql`  
**Document Reference:** `docs/phase-3/PAYPULSE_PHASE_3_0_PHASE_A_ORGANIZATION_ENTITLEMENTS.md`  

---

## 1. Executive Summary & Objective

In PayPulse, organization licensing was historically tracked in `public.organization_modules` and advisory JSONB arrays on `organizations.modules`. However, individual action entitlements (e.g. distinguishing whether a tenant entitled to `Role` can perform `Role.Add` or only `Role.View`) were not represented as normalized relational records.

**Phase A** executes the first expand phase of the target authorization architecture by introducing `public.organization_permissions`. This table establishes the relational boundary that bounds all role grants and user-custom assignments: an action cannot be effectively granted to any role or user unless an active entitlement exists for that organization.

---

## 2. Table Structure & Integrity Design

### 2.1 Table Schema: `public.organization_permissions`

```sql
CREATE TABLE IF NOT EXISTS public.organization_permissions (
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    module_action_id UUID NOT NULL REFERENCES public.module_actions(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    PRIMARY KEY (organization_id, module_action_id),
    CONSTRAINT fk_org_permissions_module FOREIGN KEY (organization_id, module_id)
        REFERENCES public.organization_modules(organization_id, module_id) ON DELETE CASCADE,
    CONSTRAINT fk_org_permissions_action FOREIGN KEY (module_action_id)
        REFERENCES public.module_actions(id) ON DELETE CASCADE
);
```

### 2.2 Relational Integrity & Action-Module Validation Trigger
Because composite foreign keys alone cannot verify that `module_action_id` was declared under `module_id`, a PostgreSQL before-trigger enforces action-module consistency:
```sql
CREATE OR REPLACE FUNCTION public.fn_validate_organization_permission_module()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.module_actions ma
        WHERE ma.id = NEW.module_action_id AND ma.module_id = NEW.module_id
    ) THEN
        RAISE EXCEPTION 'Module action does not belong to specified module'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
```

---

## 3. Row Level Security & Privilege Lockdown

1. **Row Level Security:**
   - Enabled and forced on `public.organization_permissions`.
   - `SELECT` policy grants visibility only to active organization members querying their own organization's entitlements, and platform SuperAdmins (`profiles.is_super_admin = true`).
2. **Direct DML Lockdown:**
   - Direct `INSERT`, `UPDATE`, `DELETE`, and `TRUNCATE` are revoked from `authenticated`, `anon`, and `PUBLIC`.
   - Entitlements can only be modified via platform administration RPCs or database migration scripts.

---

## 4. Reversible Backfill Strategy

To ensure zero downtime and prevent accidental lockout upon migration deployment, Phase A includes an atomic backfill script:
```sql
INSERT INTO public.organization_permissions (
    organization_id, module_id, module_action_id, is_active, created_at
)
SELECT 
    om.organization_id, om.module_id, ma.id, true, clock_timestamp()
FROM public.organization_modules om
JOIN public.module_actions ma ON ma.module_id = om.module_id
WHERE om.is_active = true
ON CONFLICT (organization_id, module_action_id) DO NOTHING;
```
This guarantees that any module currently active in `organization_modules` has all of its canonical actions immediately entitled in `organization_permissions`.

---

## 5. Preconditions, Postconditions & Validation Queries

### Preconditions:
- Base migration `20261121153500` applied.
- `public.modules` and `public.module_actions` populated.

### Post-Migration Validation Queries:
```sql
-- 1. Verify table exists and has RLS enabled
SELECT relname, relrowsecurity, relforcerowsecurity 
FROM pg_class 
WHERE relname = 'organization_permissions';

-- 2. Verify entitlement count matches active module actions
SELECT count(*) FROM public.organization_permissions;

-- 3. Verify zero orphan or mismatched module entitlements
SELECT op.organization_id, op.module_id, op.module_action_id
FROM public.organization_permissions op
JOIN public.module_actions ma ON ma.id = op.module_action_id
WHERE ma.module_id <> op.module_id;
-- Expected output: 0 rows.
```

### Safety & Compensating Rollback:
- Phase A is strictly additive (Expand phase).
- If rollback is required before downstream phases apply, a forward compensating script can safely execute:
  `DROP TABLE IF EXISTS public.organization_permissions;`
  `ALTER TABLE public.organization_modules DROP COLUMN IF EXISTS is_active;`
