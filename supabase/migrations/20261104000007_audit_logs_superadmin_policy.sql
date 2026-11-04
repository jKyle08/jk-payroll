-- ==============================================================================
-- JK-PAYROLL: MULTI-TENANT AUDIT LOGS RLS POLICY UPDATE
-- Enables Superadmin to view all organizations, and limits others to their own organization
-- Migration: 20261104000007_audit_logs_superadmin_policy.sql
-- ==============================================================================

-- 1. Replace SELECT policy on public.audit_logs
DROP POLICY IF EXISTS audit_logs_select_policy ON public.audit_logs;
CREATE POLICY audit_logs_select_policy ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        -- 1. Superadmin can see audit logs across ALL organizations
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.is_super_admin = true
        )
        OR (auth.jwt()->'app_metadata'->>'role' = 'SUPER_ADMIN')
        OR (auth.jwt()->'app_metadata'->>'role_name' = 'SUPER_ADMIN')
        OR (auth.jwt()->'app_metadata'->>'role_name' = 'Platform Super Administrator')

        -- 2. Non-superadmins can ONLY see audit logs of their own organization
        OR (
            (
                organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() AND p.is_active = true)
                OR (auth.jwt()->'app_metadata'->>'organization_id')::UUID = organization_id
            )
            AND (
                -- Organization admin flag
                EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid()
                      AND p.is_organization_admin = true
                )
                -- Or active member in this organization
                OR EXISTS (
                    SELECT 1 
                    FROM public.organization_members om
                    LEFT JOIN public.roles r ON om.role_id = r.id
                    WHERE om.user_id = auth.uid()
                      AND om.organization_id = public.audit_logs.organization_id
                      AND om.is_active = true
                )
                -- Or user assigned to an administrative role in this organization
                OR EXISTS (
                    SELECT 1
                    FROM public.user_roles ur
                    JOIN public.roles r ON ur.role_id = r.id
                    WHERE ur.user_id = auth.uid()
                      AND ur.organization_id = public.audit_logs.organization_id
                )
            )
        )
    );

