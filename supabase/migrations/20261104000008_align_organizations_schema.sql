-- ==============================================================================
-- JK-PAYROLL: ALIGN ORGANIZATIONS SCHEMA MIGRATION
-- Migration: 20261104000008_align_organizations_schema.sql
-- Harmonizes organization status, tier, HRIS/payroll defaults, and primary contact
-- ==============================================================================

-- 1. Create Enums for strict domain boundaries
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_status') THEN
        CREATE TYPE organization_status AS ENUM ('Onboarding', 'Active', 'Suspended');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_tier') THEN
        CREATE TYPE organization_tier AS ENUM ('Starter', 'Standard', 'Enterprise');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pay_frequency') THEN
        CREATE TYPE pay_frequency AS ENUM ('Weekly', 'Bi-Weekly', 'Semi-Monthly', 'Monthly');
    END IF;
END $$;

-- 2. Add / Refactor columns in public.organizations
ALTER TABLE public.organizations 
    ADD COLUMN IF NOT EXISTS slug VARCHAR(64),
    ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS tax_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    ADD COLUMN IF NOT EXISTS country_code CHAR(2) NOT NULL DEFAULT 'US',
    ADD COLUMN IF NOT EXISTS default_pay_frequency pay_frequency NOT NULL DEFAULT 'Semi-Monthly',
    ADD COLUMN IF NOT EXISTS modules JSONB NOT NULL DEFAULT '["Department", "EmployeeProfile", "RolePermission"]'::jsonb,
    ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Populate slug where empty
UPDATE public.organizations
SET slug = LOWER(REGEXP_REPLACE(code, '[^a-zA-Z0-9]', '_', 'g'))
WHERE slug IS NULL OR slug = '';

ALTER TABLE public.organizations ALTER COLUMN slug SET NOT NULL;

-- 4. Ensure unique constraint on slug
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_organizations_slug'
    ) THEN
        ALTER TABLE public.organizations ADD CONSTRAINT uq_organizations_slug UNIQUE (slug);
    END IF;
END $$;

-- 5. Create missing indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_primary_contact ON public.organizations(primary_contact_id);

