-- ==============================================================================
-- JK-PAYROLL: ADD START_DATE AND END_DATE TO TENANTS
-- Allows configurable access windows. Nullable for SuperAdmin / lifetime access.
-- ==============================================================================

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
