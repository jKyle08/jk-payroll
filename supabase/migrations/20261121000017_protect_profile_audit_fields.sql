-- ==============================================================================
-- PAYPULSE PHASE 1.1.2: PROTECT PROFILE AUDIT / PROVISIONING FIELDS
-- Sequential migration after 20261121000016. No existing profile rows are changed.
-- ==============================================================================
BEGIN;

-- Preflight: fail before changing anything if the expected schema has drifted.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at'
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_by'
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at'
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_by'
    ) THEN
        RAISE EXCEPTION 'Phase 1.1.2 preflight failed: expected profile audit columns are missing';
    END IF;
END;
$$;

-- RLS cannot protect individual columns. This invoker trigger runs as the caller,
-- so authenticated users and organization admins cannot impersonate a trusted role.
CREATE OR REPLACE FUNCTION public.fn_protect_profile_audit_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Audit timestamps and actor IDs are server-controlled on self-registration
        -- and organization-admin profile creation.
        NEW.created_at := clock_timestamp();
        NEW.updated_at := NEW.created_at;
        NEW.created_by := NULL;
        NEW.updated_by := NULL;
        -- A user-created profile remains unprovisioned and cannot become an active
        -- tenant-capable account by supplying is_active = true at registration.
        IF NEW.id = auth.uid() THEN
            NEW.is_active := false;
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.updated_by IS DISTINCT FROM OLD.updated_by THEN
        RAISE EXCEPTION 'Security violation: profile audit fields are server controlled'
            USING ERRCODE = '42501';
    END IF;

    -- Never accept a client-supplied modification timestamp.
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_audit_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_audit_fields
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_protect_profile_audit_fields();

COMMIT;

-- Rollback guidance (manual, after review):
--   BEGIN;
--   DROP TRIGGER IF EXISTS trg_protect_profile_audit_fields ON public.profiles;
--   DROP FUNCTION IF EXISTS public.fn_protect_profile_audit_fields();
--   COMMIT;
-- This rollback restores client control over audit columns. It does not alter data.
