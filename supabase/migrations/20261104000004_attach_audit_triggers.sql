-- ==============================================================================
-- JK-PAYROLL: ATTACH AUDIT LOG TRIGGERS & SEED INITIAL AUDIT SNAPSHOTS
-- Migration: 20261104000004_attach_audit_triggers.sql
-- ==============================================================================

-- 1. Departments Trigger (Module: 'DEPARTMENTS')
DROP TRIGGER IF EXISTS trg_audit_departments ON public.departments;
CREATE TRIGGER trg_audit_departments
    AFTER INSERT OR UPDATE OR DELETE ON public.departments
    FOR EACH ROW
    EXECUTE FUNCTION public.record_audit_log('DEPARTMENTS');

-- 2. Organizations Trigger (Module: 'ORGANIZATION')
DROP TRIGGER IF EXISTS trg_audit_organizations ON public.organizations;
CREATE TRIGGER trg_audit_organizations
    AFTER INSERT OR UPDATE OR DELETE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.record_audit_log('ORGANIZATION');

-- 3. Roles Trigger (Module: 'RBAC')
DROP TRIGGER IF EXISTS trg_audit_roles ON public.roles;
CREATE TRIGGER trg_audit_roles
    AFTER INSERT OR UPDATE OR DELETE ON public.roles
    FOR EACH ROW
    EXECUTE FUNCTION public.record_audit_log('RBAC');

-- 4. User Roles Trigger (Module: 'USER_ROLES')
DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles
    AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.record_audit_log('USER_ROLES');

-- 5. Profiles Trigger (Module: 'PROFILES')
DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.record_audit_log('PROFILES');

-- ------------------------------------------------------------------------------
-- 6. SEED INITIAL POINT-IN-TIME AUDIT LOG ENTRIES
-- ------------------------------------------------------------------------------

INSERT INTO public.audit_logs (
    organization_id,
    actor_id,
    actor_name,
    actor_email,
    actor_role_name,
    actor_department_name,
    module_id,
    entity_type,
    entity_id,
    action,
    old_values,
    new_values,
    ip_address,
    user_agent,
    created_at
)
SELECT 
    o.id,
    p.id,
    p.full_name,
    p.email,
    'Super Administrator',
    'Executive Board & Platform Operations',
    'ORGANIZATION',
    'organizations',
    o.id::TEXT,
    'CREATE'::public.audit_action,
    NULL,
    jsonb_build_object(
        'id', o.id,
        'code', o.code,
        'name', o.name,
        'tier', o.tier,
        'status', o.status
    ),
    '127.0.0.1'::INET,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PayPulse/1.0',
    timezone('utc'::text, now()) - INTERVAL '2 hours'
FROM public.organizations o
CROSS JOIN (
    SELECT id, full_name, email FROM public.profiles WHERE is_super_admin = true LIMIT 1
) p
ON CONFLICT DO NOTHING;

INSERT INTO public.audit_logs (
    organization_id,
    actor_id,
    actor_name,
    actor_email,
    actor_role_name,
    actor_department_name,
    module_id,
    entity_type,
    entity_id,
    action,
    old_values,
    new_values,
    ip_address,
    user_agent,
    created_at
)
SELECT 
    d.organization_id,
    p.id,
    p.full_name,
    p.email,
    'Super Administrator',
    'Executive Board & Platform Operations',
    'DEPARTMENTS',
    'departments',
    d.id::TEXT,
    'CREATE'::public.audit_action,
    NULL,
    jsonb_build_object(
        'id', d.id,
        'code', d.code,
        'name', d.name,
        'organization_id', d.organization_id
    ),
    '127.0.0.1'::INET,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PayPulse/1.0',
    timezone('utc'::text, now()) - INTERVAL '90 minutes'
FROM public.departments d
CROSS JOIN (
    SELECT id, full_name, email FROM public.profiles WHERE is_super_admin = true LIMIT 1
) p
ON CONFLICT DO NOTHING;

