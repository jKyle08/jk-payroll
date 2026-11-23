-- ==============================================================================
-- JK-PAYROLL (PAYPULSE) — MIGRATION: NORMALIZE LEGAL ENTITIES & STATUTORY REGISTRATIONS
-- Migration: 20261123130000_normalize_legal_entities_and_statutory_registrations.sql
--
-- Scope:
-- 1. Create normalized reference tables: countries and statutory_identifier_definitions
-- 2. Create organization_legal_entities and organization_statutory_registrations
-- 3. Seed initial country jurisdictions (PH, US, SG) and statutory definitions
-- 4. Enable Row Level Security (RLS) with strict multi-tenant boundaries
-- 5. Safe, idempotent legacy data migration from organizations.statutory_ids
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. COUNTRIES REFERENCE TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.countries (
    code VARCHAR(2) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ------------------------------------------------------------------------------
-- 2. STATUTORY IDENTIFIER DEFINITIONS REFERENCE TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.statutory_identifier_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code VARCHAR(2) NOT NULL REFERENCES public.countries(code) ON DELETE CASCADE,
    identifier_key VARCHAR(64) NOT NULL,
    label VARCHAR(150) NOT NULL,
    description TEXT,
    authority_name VARCHAR(150),
    validation_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    input_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_required BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_statutory_id_defs_country_key UNIQUE (country_code, identifier_key)
);

CREATE INDEX IF NOT EXISTS idx_statutory_defs_country ON public.statutory_identifier_definitions(country_code);

-- ------------------------------------------------------------------------------
-- 3. ORGANIZATION LEGAL ENTITIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_legal_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    legal_name VARCHAR(255) NOT NULL,
    trading_name VARCHAR(255),
    country_code VARCHAR(2) NOT NULL REFERENCES public.countries(code) ON DELETE RESTRICT,
    registration_number VARCHAR(100),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(32) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_legal_entities_org ON public.organization_legal_entities(organization_id);
CREATE INDEX IF NOT EXISTS idx_legal_entities_country ON public.organization_legal_entities(country_code);

-- Partial unique index: at most one primary legal entity per organization
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_primary_legal_entity 
ON public.organization_legal_entities(organization_id) 
WHERE is_primary = true;

-- ------------------------------------------------------------------------------
-- 4. ORGANIZATION STATUTORY REGISTRATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_statutory_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_entity_id UUID NOT NULL REFERENCES public.organization_legal_entities(id) ON DELETE CASCADE,
    identifier_definition_id UUID NOT NULL REFERENCES public.statutory_identifier_definitions(id) ON DELETE RESTRICT,
    country_code VARCHAR(2) NOT NULL REFERENCES public.countries(code) ON DELETE RESTRICT,
    jurisdiction_code VARCHAR(32),
    encrypted_value TEXT NOT NULL,
    encryption_key_version VARCHAR(16) NOT NULL DEFAULT 'v1',
    masked_value VARCHAR(100) NOT NULL,
    registration_status VARCHAR(32) NOT NULL DEFAULT 'Active',
    effective_date DATE,
    expiration_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT uq_org_stat_regs_entity_def UNIQUE (legal_entity_id, identifier_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_stat_regs_legal_entity ON public.organization_statutory_registrations(legal_entity_id);
CREATE INDEX IF NOT EXISTS idx_stat_regs_def ON public.organization_statutory_registrations(identifier_definition_id);

-- ------------------------------------------------------------------------------
-- 5. SEED INITIAL COUNTRIES
-- ------------------------------------------------------------------------------
INSERT INTO public.countries (code, name, is_active) VALUES
    ('PH', 'Philippines', true),
    ('US', 'United States', true),
    ('SG', 'Singapore', true)
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    updated_at = clock_timestamp();

-- ------------------------------------------------------------------------------
-- 6. SEED INITIAL STATUTORY IDENTIFIER DEFINITIONS
-- ------------------------------------------------------------------------------
-- 6.1 Philippines (PH)
INSERT INTO public.statutory_identifier_definitions 
    (country_code, identifier_key, label, description, authority_name, validation_config, input_config, is_required, display_order)
VALUES
    ('PH', 'TIN', 'Tax Identification Number', 'Mandatory corporate tax registration number', 'Bureau of Internal Revenue (BIR)', '{"regex": "^[0-9]{3}-[0-9]{3}-[0-9]{3}-[0-9]{3,5}$", "placeholder": "000-000-000-000"}'::jsonb, '{"mask": "999-999-999-999"}'::jsonb, true, 1),
    ('PH', 'SSS', 'SSS Employer Number', 'Social Security System employer registration code for private employers', 'Social Security System (SSS)', '{"regex": "^[0-9]{2}-[0-9]{7}-[0-9]$", "placeholder": "00-0000000-0"}'::jsonb, '{"mask": "99-9999999-9"}'::jsonb, false, 2),
    ('PH', 'GSIS', 'GSIS Agency Code', 'Government Service Insurance System identification for public-sector institutions', 'Government Service Insurance System (GSIS)', '{"placeholder": "GSIS-0000-0000"}'::jsonb, '{}'::jsonb, false, 3),
    ('PH', 'PHILHEALTH', 'PhilHealth Employer Number (PEN)', 'National health insurance agency identification for employee coverage', 'Philippine Health Insurance Corporation (PhilHealth)', '{"regex": "^[0-9]{2}-[0-9]{9}-[0-9]$", "placeholder": "00-000000000-0"}'::jsonb, '{"mask": "99-999999999-9"}'::jsonb, false, 4),
    ('PH', 'PAGIBIG', 'Pag-IBIG Employer ID (HDMF)', 'Housing Development Mutual Fund registration for mandatory savings contributions', 'Home Development Mutual Fund (Pag-IBIG)', '{"regex": "^[0-9]{4}-[0-9]{4}-[0-9]{4}$", "placeholder": "0000-0000-0000"}'::jsonb, '{"mask": "9999-9999-9999"}'::jsonb, false, 5)
ON CONFLICT (country_code, identifier_key) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    authority_name = EXCLUDED.authority_name,
    validation_config = EXCLUDED.validation_config,
    input_config = EXCLUDED.input_config,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = clock_timestamp();

-- 6.2 United States (US)
INSERT INTO public.statutory_identifier_definitions 
    (country_code, identifier_key, label, description, authority_name, validation_config, input_config, is_required, display_order)
VALUES
    ('US', 'EIN', 'Employer Identification Number (FEIN)', 'Federal Tax Identification Number for businesses', 'Internal Revenue Service (IRS)', '{"regex": "^[0-9]{2}-[0-9]{7}$", "placeholder": "00-0000000"}'::jsonb, '{"mask": "99-9999999"}'::jsonb, true, 1),
    ('US', 'STATE_TAX_ID', 'State Tax Registration ID', 'State-level employer withholding identification number', 'State Department of Revenue', '{"placeholder": "State Withholding ID"}'::jsonb, '{}'::jsonb, false, 2),
    ('US', 'STATE_UNEMPLOYMENT_ID', 'State Unemployment Insurance Account', 'State SUTA employer account number for unemployment insurance', 'State Department of Labor / UI', '{"placeholder": "SUTA Account Number"}'::jsonb, '{}'::jsonb, false, 3)
ON CONFLICT (country_code, identifier_key) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    authority_name = EXCLUDED.authority_name,
    validation_config = EXCLUDED.validation_config,
    input_config = EXCLUDED.input_config,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = clock_timestamp();

-- 6.3 Singapore (SG)
INSERT INTO public.statutory_identifier_definitions 
    (country_code, identifier_key, label, description, authority_name, validation_config, input_config, is_required, display_order)
VALUES
    ('SG', 'UEN', 'Unique Entity Number (UEN)', 'Standard identification number for entities registered in Singapore', 'Accounting and Corporate Regulatory Authority (ACRA)', '{"regex": "^[0-9]{8,9}[A-Z]|[A-Z0-9]{10}$", "placeholder": "200812345M"}'::jsonb, '{}'::jsonb, true, 1),
    ('SG', 'GST', 'GST Registration Number', 'Goods and Services Tax registration identifier', 'Inland Revenue Authority of Singapore (IRAS)', '{"placeholder": "GST Reg Number"}'::jsonb, '{}'::jsonb, false, 2),
    ('SG', 'CPF', 'CPF Employer Reference', 'Central Provident Fund submission reference number', 'Central Provident Fund Board (CPF)', '{"placeholder": "CPF Submission Number"}'::jsonb, '{}'::jsonb, false, 3)
ON CONFLICT (country_code, identifier_key) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    authority_name = EXCLUDED.authority_name,
    validation_config = EXCLUDED.validation_config,
    input_config = EXCLUDED.input_config,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = clock_timestamp();

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statutory_identifier_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_legal_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_statutory_registrations ENABLE ROW LEVEL SECURITY;

-- 7.1 Countries RLS
DROP POLICY IF EXISTS policy_countries_select ON public.countries;
CREATE POLICY policy_countries_select ON public.countries
    FOR SELECT TO authenticated, anon
    USING (is_active = true OR private.is_super_admin());

DROP POLICY IF EXISTS policy_countries_admin ON public.countries;
CREATE POLICY policy_countries_admin ON public.countries
    FOR ALL TO authenticated
    USING (private.is_super_admin())
    WITH CHECK (private.is_super_admin());

-- 7.2 Statutory Identifier Definitions RLS
DROP POLICY IF EXISTS policy_stat_defs_select ON public.statutory_identifier_definitions;
CREATE POLICY policy_stat_defs_select ON public.statutory_identifier_definitions
    FOR SELECT TO authenticated, anon
    USING (is_active = true OR private.is_super_admin());

DROP POLICY IF EXISTS policy_stat_defs_admin ON public.statutory_identifier_definitions;
CREATE POLICY policy_stat_defs_admin ON public.statutory_identifier_definitions
    FOR ALL TO authenticated
    USING (private.is_super_admin())
    WITH CHECK (private.is_super_admin());

-- 7.3 Organization Legal Entities RLS
DROP POLICY IF EXISTS policy_legal_entities_select ON public.organization_legal_entities;
CREATE POLICY policy_legal_entities_select ON public.organization_legal_entities
    FOR SELECT TO authenticated
    USING (private.is_organization_member(organization_id));

DROP POLICY IF EXISTS policy_legal_entities_insert ON public.organization_legal_entities;
CREATE POLICY policy_legal_entities_insert ON public.organization_legal_entities
    FOR INSERT TO authenticated
    WITH CHECK (private.is_organization_admin(organization_id));

DROP POLICY IF EXISTS policy_legal_entities_update ON public.organization_legal_entities;
CREATE POLICY policy_legal_entities_update ON public.organization_legal_entities
    FOR UPDATE TO authenticated
    USING (private.is_organization_admin(organization_id))
    WITH CHECK (private.is_organization_admin(organization_id));

DROP POLICY IF EXISTS policy_legal_entities_delete ON public.organization_legal_entities;
CREATE POLICY policy_legal_entities_delete ON public.organization_legal_entities
    FOR DELETE TO authenticated
    USING (private.is_organization_admin(organization_id));

-- 7.4 Organization Statutory Registrations RLS
DROP POLICY IF EXISTS policy_stat_regs_select ON public.organization_statutory_registrations;
CREATE POLICY policy_stat_regs_select ON public.organization_statutory_registrations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_legal_entities le
            WHERE le.id = legal_entity_id 
              AND private.is_organization_member(le.organization_id)
        )
    );

DROP POLICY IF EXISTS policy_stat_regs_insert ON public.organization_statutory_registrations;
CREATE POLICY policy_stat_regs_insert ON public.organization_statutory_registrations
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_legal_entities le
            WHERE le.id = legal_entity_id 
              AND private.is_organization_admin(le.organization_id)
        )
    );

DROP POLICY IF EXISTS policy_stat_regs_update ON public.organization_statutory_registrations;
CREATE POLICY policy_stat_regs_update ON public.organization_statutory_registrations
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_legal_entities le
            WHERE le.id = legal_entity_id 
              AND private.is_organization_admin(le.organization_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_legal_entities le
            WHERE le.id = legal_entity_id 
              AND private.is_organization_admin(le.organization_id)
        )
    );

DROP POLICY IF EXISTS policy_stat_regs_delete ON public.organization_statutory_registrations;
CREATE POLICY policy_stat_regs_delete ON public.organization_statutory_registrations
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_legal_entities le
            WHERE le.id = legal_entity_id 
              AND private.is_organization_admin(le.organization_id)
        )
    );

-- ------------------------------------------------------------------------------
-- 8. IDEMPOTENT LEGACY DATA MIGRATION
-- ------------------------------------------------------------------------------
-- 8.1 Create primary legal entity for each existing organization if missing
INSERT INTO public.organization_legal_entities (
    organization_id,
    legal_name,
    trading_name,
    country_code,
    registration_number,
    is_primary,
    status
)
SELECT 
    o.id,
    COALESCE(NULLIF(o.legal_name, ''), o.name),
    o.name,
    CASE 
        WHEN o.country_code IN ('PH', 'US', 'SG') THEN o.country_code 
        ELSE 'PH' 
    END,
    o.tax_id,
    true,
    'Active'
FROM public.organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM public.organization_legal_entities le 
    WHERE le.organization_id = o.id AND le.is_primary = true
);

-- 8.2 Migrate legacy statutory_ids JSONB to organization_statutory_registrations
DO $$
DECLARE
    r RECORD;
    def_rec RECORD;
    val TEXT;
    leg_id UUID;
    val_masked VARCHAR(100);
BEGIN
    FOR r IN 
        SELECT id, country_code, statutory_ids 
        FROM public.organizations 
        WHERE statutory_ids IS NOT NULL 
          AND statutory_ids != '{}'::jsonb 
    LOOP
        SELECT id INTO leg_id 
        FROM public.organization_legal_entities 
        WHERE organization_id = r.id AND is_primary = true 
        LIMIT 1;

        IF leg_id IS NOT NULL THEN
            FOR def_rec IN 
                SELECT id, identifier_key, country_code 
                FROM public.statutory_identifier_definitions 
                WHERE country_code = CASE 
                    WHEN r.country_code IN ('PH', 'US', 'SG') THEN r.country_code 
                    ELSE 'PH' 
                END
            LOOP
                val := r.statutory_ids->>lower(def_rec.identifier_key);
                IF val IS NULL OR val = '' THEN
                    val := r.statutory_ids->>def_rec.identifier_key;
                END IF;

                IF val IS NOT NULL AND val != '' THEN
                    IF length(val) <= 4 THEN
                        val_masked := repeat('•', length(val));
                    ELSE
                        val_masked := repeat('•', length(val) - 4) || right(val, 4);
                    END IF;

                    INSERT INTO public.organization_statutory_registrations (
                        legal_entity_id,
                        identifier_definition_id,
                        country_code,
                        encrypted_value,
                        encryption_key_version,
                        masked_value,
                        registration_status
                    ) VALUES (
                        leg_id,
                        def_rec.id,
                        def_rec.country_code,
                        val,
                        'v1',
                        val_masked,
                        'Active'
                    )
                    ON CONFLICT (legal_entity_id, identifier_definition_id) DO NOTHING;
                END IF;
            END LOOP;
        END IF;
    END LOOP;
END $$;

COMMIT;
