-- ==============================================================================
-- JK-PAYROLL: EXPAND ORGANIZATIONS SECTOR, MODALITIES, SETTINGS & IMMUTABLE PAYROLL SNAPSHOT
-- Migration: 20261104000009_expand_organizations_sector_settings.sql
-- ==============================================================================

-- 1. Organization Sector Enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_sector') THEN
        CREATE TYPE organization_sector AS ENUM ('Private', 'Public', 'NonProfit');
    END IF;
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

-- 2. Alter public.organizations to add sector, statutory_ids, supported_work_modes, and settings
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS sector organization_sector NOT NULL DEFAULT 'Private',
    ADD COLUMN IF NOT EXISTS statutory_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS supported_work_modes JSONB NOT NULL DEFAULT '["OnSite", "Remote", "Hybrid"]'::jsonb,
    ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{
        "payroll": {
            "standardDailyHours": 8,
            "standardWorkingDaysPerYear": 261,
            "prorationMethod": "WorkingDays",
            "statutoryDeductionSplit": "SplitEqually"
        },
        "timeAndAttendance": {
            "gracePeriodMinutes": 15,
            "overtimeMinimumMinutes": 60,
            "allowWebClockIn": true,
            "requireGeofence": false,
            "geofenceRadiusMeters": 100
        },
        "security": {
            "enforce2FA": false,
            "protectPayslipWithPassword": true,
            "payslipPasswordFormat": "BIRTHDATE_YYYYMMDD"
        }
    }'::jsonb;

-- 3. Clean up and ensure optimal indexes
-- Drop duplicate explicit btree indexes on unique constraint columns if they exist
DROP INDEX IF EXISTS public.idx_organizations_code;
DROP INDEX IF EXISTS public.idx_organizations_slug;

CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_sector ON public.organizations(sector);
CREATE INDEX IF NOT EXISTS idx_organizations_primary_contact ON public.organizations(primary_contact_id);
CREATE INDEX IF NOT EXISTS idx_organizations_settings ON public.organizations USING gin (settings);

-- 4. Upcoming Payroll Runs Schema with Calculation Snapshot Architecture
CREATE TABLE IF NOT EXISTS public.payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    payout_date DATE NOT NULL,
    pay_frequency pay_frequency NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Draft',
    
    -- Immutable historical rules snapshot captured at the exact moment payroll is calculated
    -- Preserves the organizational settings (divisors, formulas, deduction splits) and rates
    calculation_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    total_gross NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_net NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_org_period ON public.payroll_runs(organization_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON public.payroll_runs(status);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_snapshot ON public.payroll_runs USING gin (calculation_snapshot);

