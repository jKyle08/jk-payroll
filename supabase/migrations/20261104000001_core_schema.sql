-- ==============================================================================
-- JK-PAYROLL: CANONICAL CORE DATABASE SCHEMA
-- Migration: 20261104000001_core_schema.sql
-- Modules: Organizations, Departments Hierarchy, Profiles, Roles & User Roles
-- ==============================================================================

-- Enable cryptographic & UUID generation extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. ROLE TYPE ENUM
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
        CREATE TYPE role_type AS ENUM ('SYSTEM', 'CUSTOM');
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. ORGANIZATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(128),
    tier VARCHAR(64) NOT NULL DEFAULT 'Growth',
    domain VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'Active',
    is_active BOOLEAN NOT NULL DEFAULT true,
    admin_name VARCHAR(255),
    admin_email VARCHAR(255),
    admin_username VARCHAR(128),
    admin_title VARCHAR(128),
    employee_count INTEGER NOT NULL DEFAULT 0,
    start_date TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_organizations_code ON public.organizations(code);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON public.organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);

-- ------------------------------------------------------------------------------
-- 3. DEPARTMENTS TABLE (Hierarchical Tree with Materialized Path & Depth)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    parent_department_id UUID REFERENCES public.departments(id) ON DELETE RESTRICT,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    head_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    depth INTEGER NOT NULL DEFAULT 0,
    tree_path TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT uq_departments_organization_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_departments_organization ON public.departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON public.departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_departments_org_active ON public.departments(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_departments_depth ON public.departments(organization_id, depth);
CREATE INDEX IF NOT EXISTS idx_departments_tree_path ON public.departments(tree_path text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_departments_head_user ON public.departments(head_user_id);

-- Department Tree Path & Depth Sync Trigger
CREATE OR REPLACE FUNCTION public.fn_sync_department_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_parent_depth INTEGER;
    v_parent_path  TEXT;
BEGIN
    IF NEW.parent_department_id IS NULL THEN
        NEW.depth := 0;
        NEW.tree_path := lower(NEW.code);
    ELSE
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
-- 4. PROFILES TABLE (User Master linked to auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(128),
    title VARCHAR(128),
    phone VARCHAR(64),
    is_organization_admin BOOLEAN NOT NULL DEFAULT false,
    is_super_admin BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_organization ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(organization_id, is_active);

-- ------------------------------------------------------------------------------
-- 5. ROLES TABLE (SYSTEM & CUSTOM Roles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    role_type role_type NOT NULL DEFAULT 'CUSTOM',
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_mutable BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT uq_organization_role_code UNIQUE NULLS NOT DISTINCT (organization_id, code),
    CONSTRAINT chk_role_type_scope CHECK (
        (role_type = 'SYSTEM' AND organization_id IS NULL)
        OR (role_type = 'CUSTOM' AND organization_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_roles_organization ON public.roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_roles_type ON public.roles(role_type);
CREATE INDEX IF NOT EXISTS idx_roles_active ON public.roles(organization_id, is_active);

-- ------------------------------------------------------------------------------
-- 6. USER ROLES TABLE (Maps Users to Roles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    PRIMARY KEY (organization_id, user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_org_user ON public.user_roles(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role_id);

-- ------------------------------------------------------------------------------
-- 7. RBAC MODULES, ACTIONS & ENTITLEMENT ALLOCATIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS public.module_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    full_key VARCHAR(128) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS public.organization_modules (
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (organization_id, module_id)
);

CREATE TABLE IF NOT EXISTS public.department_modules (
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (organization_id, department_id, module_id)
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    module_action_id UUID NOT NULL REFERENCES public.module_actions(id) ON DELETE CASCADE,
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (organization_id, role_id, module_action_id)
);

CREATE TABLE IF NOT EXISTS public.user_permissions (
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_action_id UUID NOT NULL REFERENCES public.module_actions(id) ON DELETE CASCADE,
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (organization_id, user_id, module_action_id)
);
