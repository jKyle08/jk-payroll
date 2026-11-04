-- ==============================================================================
-- JK-PAYROLL: DEPARTMENTS HIERARCHY & OPERATIONAL SCHEMA v2
-- Migration: 20261104000003_departments_hierarchy_v2.sql
--
-- Features:
-- 1. Full schema alignment with departments table:
--    id, organization_id, parent_department_id, code, name, description,
--    head_user_id, depth, tree_path, is_active, created_at, updated_at,
--    created_by, updated_by
-- 2. Materialized path (tree_path) & depth tracking for subtrees
-- 3. Self-referencing FK with ON DELETE RESTRICT
-- 4. Head of department linkage to users/profiles
-- 5. Helper functions and triggers for depth & tree_path maintenance
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. ADD / ALTER COLUMNS IN DEPARTMENTS TABLE
-- ------------------------------------------------------------------------------

-- Ensure description column exists
ALTER TABLE public.departments 
    ADD COLUMN IF NOT EXISTS description TEXT;

-- Operational Hierarchy Info: Head User (Department Lead)
ALTER TABLE public.departments 
    ADD COLUMN IF NOT EXISTS head_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Hierarchy depth: 0 = Head / Top-level, 1 = Sub-department, 2 = Unit
ALTER TABLE public.departments 
    ADD COLUMN IF NOT EXISTS depth INTEGER NOT NULL DEFAULT 0;

-- Materialized tree path: e.g. 'opg/opg-itd' for rapid subtree lookups
ALTER TABLE public.departments 
    ADD COLUMN IF NOT EXISTS tree_path TEXT;

-- Audit columns
ALTER TABLE public.departments 
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.departments 
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Ensure constraint uq_departments_organization_code exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_departments_organization_code'
    ) THEN
        ALTER TABLE public.departments 
            ADD CONSTRAINT uq_departments_organization_code UNIQUE (organization_id, code);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_departments_organization ON public.departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON public.departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_departments_org_active ON public.departments(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_departments_depth ON public.departments(organization_id, depth);
CREATE INDEX IF NOT EXISTS idx_departments_tree_path ON public.departments(tree_path text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_departments_head_user ON public.departments(head_user_id);

-- ------------------------------------------------------------------------------
-- 3. FUNCTION & TRIGGER: AUTOMATIC DEPTH AND TREE_PATH CALCULATION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_sync_department_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_parent_depth INTEGER;
    v_parent_path  TEXT;
BEGIN
    -- If root department (no parent)
    IF NEW.parent_department_id IS NULL THEN
        NEW.depth := 0;
        NEW.tree_path := lower(NEW.code);
    ELSE
        -- Fetch parent's depth and tree_path
        SELECT depth, tree_path
          INTO v_parent_depth, v_parent_path
          FROM public.departments
         WHERE id = NEW.parent_department_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent department % does not exist', NEW.parent_department_id;
        END IF;

        NEW.depth := COALESCE(v_parent_depth, 0) + 1;
        NEW.tree_path := COALESCE(v_parent_path, '') || '/' || lower(NEW.code);
    END IF;

    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_department_hierarchy ON public.departments;
CREATE TRIGGER trg_sync_department_hierarchy
    BEFORE INSERT OR UPDATE OF parent_department_id, code ON public.departments
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_department_hierarchy();

-- ------------------------------------------------------------------------------
-- 4. SEED SAMPLE HIERARCHICAL DEPARTMENTS (OPG, OPG-ITD, OPG-PIO, HR, HR-PAYROLL)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_org_id UUID;
    v_opg_id UUID := 'd0000000-0000-0000-0000-000000000001';
    v_itd_id UUID := 'd0000000-0000-0000-0000-000000000002';
    v_pio_id UUID := 'd0000000-0000-0000-0000-000000000003';
    v_hr_id  UUID := 'd0000000-0000-0000-0000-000000000004';
    v_pay_id UUID := 'd0000000-0000-0000-0000-000000000005';
BEGIN
    -- Select first existing organization (e.g. Apex Health Systems or SuperAdmin Platform)
    SELECT id INTO v_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
    
    IF v_org_id IS NOT NULL THEN
        -- 1. OPG: Office of the Provincial Governor (Head Department, depth 0)
        INSERT INTO public.departments (id, organization_id, parent_department_id, code, name, description, depth, tree_path, is_active)
        VALUES (v_opg_id, v_org_id, NULL, 'OPG', 'Office of the Provincial Governor', 'Executive leadership and strategic administrative office', 0, 'opg', true)
        ON CONFLICT (organization_id, code) DO UPDATE
           SET name = EXCLUDED.name, description = EXCLUDED.description, depth = 0, tree_path = 'opg';

        -- 2. OPG-ITD: IT Division (Sub-department of OPG, depth 1)
        INSERT INTO public.departments (id, organization_id, parent_department_id, code, name, description, depth, tree_path, is_active)
        VALUES (v_itd_id, v_org_id, v_opg_id, 'OPG-ITD', 'IT Division', 'Systems administration, security infrastructure, and digital payroll technology', 1, 'opg/opg-itd', true)
        ON CONFLICT (organization_id, code) DO UPDATE
           SET name = EXCLUDED.name, description = EXCLUDED.description, parent_department_id = v_opg_id, depth = 1, tree_path = 'opg/opg-itd';

        -- 3. OPG-PIO: Public Information Office (Sub-department of OPG, depth 1)
        INSERT INTO public.departments (id, organization_id, parent_department_id, code, name, description, depth, tree_path, is_active)
        VALUES (v_pio_id, v_org_id, v_opg_id, 'OPG-PIO', 'Public Information Office', 'Government relations, public communications, and transparency', 1, 'opg/opg-pio', true)
        ON CONFLICT (organization_id, code) DO UPDATE
           SET name = EXCLUDED.name, description = EXCLUDED.description, parent_department_id = v_opg_id, depth = 1, tree_path = 'opg/opg-pio';

        -- 4. HR: Human Resources Management (Head Department, depth 0)
        INSERT INTO public.departments (id, organization_id, parent_department_id, code, name, description, depth, tree_path, is_active)
        VALUES (v_hr_id, v_org_id, NULL, 'HR', 'Human Resources Management', 'Personnel management, employee welfare, and organizational compliance', 0, 'hr', true)
        ON CONFLICT (organization_id, code) DO UPDATE
           SET name = EXCLUDED.name, description = EXCLUDED.description, depth = 0, tree_path = 'hr';

        -- 5. HR-PAYROLL: Payroll Unit (Sub-department of HR, depth 1)
        INSERT INTO public.departments (id, organization_id, parent_department_id, code, name, description, depth, tree_path, is_active)
        VALUES (v_pay_id, v_org_id, v_hr_id, 'HR-PAYROLL', 'Payroll Operations Unit', 'Compensation disbursement, statutory deductions, and tax reporting', 1, 'hr/hr-payroll', true)
        ON CONFLICT (organization_id, code) DO UPDATE
           SET name = EXCLUDED.name, description = EXCLUDED.description, parent_department_id = v_hr_id, depth = 1, tree_path = 'hr/hr-payroll';
    END IF;
END $$;

COMMIT;
