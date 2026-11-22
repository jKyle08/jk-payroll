-- Phase 3.1: Platform SuperAdmin authority is profiles.is_super_admin.
-- Ordinary role assignments may never use the platform SUPER_ADMIN role.
-- Onboarding remains able to grant SYSTEM TENANT_ADMIN as the first-owner role.
BEGIN;

CREATE OR REPLACE FUNCTION public.reject_superadmin_role_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role_id UUID;
    v_role_code TEXT;
BEGIN
    v_role_id := NEW.role_id;

    SELECT upper(trim(r.code)) INTO v_role_code
    FROM public.roles r
    WHERE r.id = v_role_id
    FOR SHARE;

    IF v_role_code IN ('SUPER_ADMIN', 'SUPERADMIN', 'PLATFORM_SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Platform SuperAdmin authority is stored in profiles.is_super_admin and cannot be assigned as an organization role'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_superadmin_user_role_assignment ON public.user_roles;
CREATE TRIGGER trg_reject_superadmin_user_role_assignment
    BEFORE INSERT OR UPDATE OF role_id ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.reject_superadmin_role_assignment();

DROP TRIGGER IF EXISTS trg_reject_superadmin_membership_role_assignment ON public.organization_members;
CREATE TRIGGER trg_reject_superadmin_membership_role_assignment
    BEFORE INSERT OR UPDATE OF role_id ON public.organization_members
    FOR EACH ROW EXECUTE FUNCTION public.reject_superadmin_role_assignment();

-- Prevent a previously assigned ordinary role from being renamed into a
-- platform-superadmin alias after assignment checks have already run.
CREATE OR REPLACE FUNCTION public.reject_superadmin_role_code_with_assignments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF upper(trim(NEW.code)) IN ('SUPER_ADMIN', 'SUPERADMIN', 'PLATFORM_SUPER_ADMIN')
       AND upper(trim(OLD.code)) NOT IN ('SUPER_ADMIN', 'SUPERADMIN', 'PLATFORM_SUPER_ADMIN')
       AND (
           EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.role_id = NEW.id)
           OR EXISTS (SELECT 1 FROM public.organization_members om WHERE om.role_id = NEW.id)
       ) THEN
        RAISE EXCEPTION 'A role with existing assignments cannot be changed into a platform SuperAdmin role'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_superadmin_role_code_with_assignments ON public.roles;
CREATE TRIGGER trg_reject_superadmin_role_code_with_assignments
    BEFORE UPDATE OF code ON public.roles
    FOR EACH ROW EXECUTE FUNCTION public.reject_superadmin_role_code_with_assignments();

REVOKE ALL ON FUNCTION public.reject_superadmin_role_assignment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_superadmin_role_code_with_assignments() FROM PUBLIC, anon, authenticated;

COMMIT;
