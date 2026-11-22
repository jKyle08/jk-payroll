-- ==============================================================================
-- JK-PAYROLL: PHASE 3.0A FORWARD MIGRATION
-- Migration: 20261122100001_phase_3_0a_organization_permission_entitlements.sql
-- Target: Normalized Organization Permission Entitlements
-- Preconditions: Migration 20261121153500 applied; canonical catalog populated.
-- Safety: Transactional; Additive Expand Phase; Reversible via compensating script.
-- ==============================================================================
BEGIN;

-- ------------------------------------------------------------------------------
-- 1. EXPAND ORGANIZATION_MODULES TABLE
-- Add active lifecycle flag to organization_modules to distinguish disabled modules
-- ------------------------------------------------------------------------------
ALTER TABLE public.organization_modules 
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ------------------------------------------------------------------------------
-- 2. CREATE NORMALIZED ORGANIZATION_PERMISSIONS TABLE
-- Binds individual module actions to organizations as authoritative entitlements
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 3. INTEGRITY TRIGGER: VERIFY ACTION-MODULE RELATIONSHIP
-- Ensures module_action_id strictly belongs to declared module_id
-- ------------------------------------------------------------------------------
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

DROP TRIGGER IF EXISTS trg_validate_org_permission_module ON public.organization_permissions;
CREATE TRIGGER trg_validate_org_permission_module
    BEFORE INSERT OR UPDATE ON public.organization_permissions
    FOR EACH ROW EXECUTE FUNCTION public.fn_validate_organization_permission_module();

-- ------------------------------------------------------------------------------
-- 4. PERFORMANCE & COVERING INDEXES
-- Optimizes runtime permission resolution and reverse catalog lookups
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_org_permissions_org_mod 
    ON public.organization_permissions (organization_id, module_id);

CREATE INDEX IF NOT EXISTS idx_org_permissions_action 
    ON public.organization_permissions (module_action_id);

CREATE INDEX IF NOT EXISTS idx_org_permissions_active 
    ON public.organization_permissions (organization_id, is_active);

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY & PRIVILEGE BOUNDARIES
-- Enforces that tenant users can only read entitlements for their own organization
-- ------------------------------------------------------------------------------
ALTER TABLE public.organization_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_permissions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_permissions_select_policy ON public.organization_permissions;
CREATE POLICY org_permissions_select_policy ON public.organization_permissions
    FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_member(organization_id)
        )
    );

-- Strictly revoke direct DML from authenticated and anonymous users
REVOKE ALL ON public.organization_permissions FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.organization_permissions FROM authenticated;
GRANT SELECT ON public.organization_permissions TO authenticated;
GRANT ALL ON public.organization_permissions TO service_role, postgres;

-- ------------------------------------------------------------------------------
-- 6. SAFE REVERSIBLE DATA BACKFILL
-- Automatically populate entitlements for all active organization_modules
-- ------------------------------------------------------------------------------
INSERT INTO public.organization_permissions (
    organization_id,
    module_id,
    module_action_id,
    is_active,
    created_at
)
SELECT 
    om.organization_id,
    om.module_id,
    ma.id,
    true,
    clock_timestamp()
FROM public.organization_modules om
JOIN public.module_actions ma ON ma.module_id = om.module_id
WHERE om.is_active = true
ON CONFLICT (organization_id, module_action_id) DO NOTHING;

COMMIT;
