// ==============================================================================
// JK-PAYROLL: ORGANIZATION FORM PAGE
// Routes to OrganizationOnboardingForm (/organizations/new)
// or OrganizationSettingsForm (/organizations/:id/edit)
// Design System: Balanced Glossy Graphite
// File: src/features/organizations/components/OrganizationFormPage.tsx
// ==============================================================================

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Organization } from '../types.js';
import { useOrganization } from '../hooks/useOrganization.js';
import { OrganizationSettingsForm } from './OrganizationSettingsForm.js';
import { OrganizationOnboardingWizard } from '../../../client/components/onboarding/OrganizationOnboardingWizard.js';
import { useAuth } from '../../auth/hooks/use-auth.js';
import { UnauthorizedPage } from '../../../client/components/ui/StatusPages.js';

export interface OrganizationFormPageProps {
  organizationIdOverride?: string;
  onNavigateBack?: () => void;
  onSuccess?: (org: Organization) => void;
}

export const OrganizationFormPage: React.FC<OrganizationFormPageProps> = ({
  organizationIdOverride,
  onNavigateBack,
  onSuccess,
}) => {
  const { id: routeId } = useParams<{ id: string }>();
  const id = organizationIdOverride || routeId;
  const isEditMode = Boolean(id);
  const { user } = useAuth();

  // Safe router navigation with fallback
  let navigate: ((path: string) => void) | undefined;
  try {
    navigate = useNavigate();
  } catch {
    navigate = undefined;
  }

  const handleBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else if (navigate) {
      navigate('/organizations');
    }
  };

  // Role & permission evaluation
  const isSuperAdmin = Boolean(
    user?.isSuperAdmin ||
      (user as any)?.role === 'SUPER_ADMIN' ||
      (user as any)?.role === 'SuperAdmin'
  );
  const isTenantAdmin = Boolean(
    user?.isTenantAdmin ||
      (user as any)?.role === 'ORG_ADMIN' ||
      (user as any)?.role === 'TENANT_ADMIN' ||
      (user as any)?.role === 'Admin'
  );
  const hasOrgEditPermission = Boolean(
    user?.effectivePermissions?.includes('Organization.Edit') ||
      user?.effectivePermissions?.includes('Tenant.Edit') ||
      user?.effectivePermissions?.includes('Organization.Settings.Update') ||
      user?.effectivePermissions?.includes('*') ||
      (user as any)?.permissions?.includes('Organization.Edit')
  );

  const canEditAny = isSuperAdmin;
  const canEditOwn = (isTenantAdmin || hasOrgEditPermission) && (user?.tenantId === id || (user as any)?.organizationId === id);
  const isAuthorized = isSuperAdmin || (isEditMode ? canEditOwn : true);

  // Single-record fetching for edit mode
  const {
    organization: existingOrg,
    isLoading: isLoadingOrg,
    error: loadError,
  } = useOrganization(isAuthorized ? id : undefined);

  // Check authorization - reject regular users attempting to navigate to organization edit
  if (user && isEditMode && !isAuthorized) {
    return <UnauthorizedPage />;
  }

  if (isEditMode && isLoadingOrg) {
    return (
      <div className="p-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-[#0F172A]" />
          <span className="text-xs font-medium">Loading organization metadata...</span>
        </div>
      </div>
    );
  }

  if (isEditMode && (loadError || !existingOrg)) {
    return (
      <div className="p-12 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-[#181D2A] rounded-2xl border border-rose-200 dark:border-rose-500/30 p-6 text-center shadow-xs dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)]">
          <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">Organization Not Found</h3>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
            {loadError || `Organization with ID '${id}' could not be located.`}
          </p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#0F172A] dark:bg-[#202637] text-white dark:text-[#F8FAFC] border border-transparent dark:border-white/10 hover:dark:bg-[#252C3D] text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Organizations</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 text-[#111827] dark:text-[#F8FAFC] font-sans w-full">
      <div className="flex items-center space-x-2 pb-1">
        <button
          type="button"
          onClick={handleBack}
          className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC] hover:underline cursor-pointer transition-colors"
        >
          Organizations
        </button>
        <span className="text-xs text-[#E5E7EB] dark:text-white/20">/</span>
        <span className="text-xs font-semibold text-[#111827] dark:text-[#CBD5E1]">
          {isEditMode ? 'Edit Organization Settings' : 'New Workspace Onboarding'}
        </span>
      </div>

      {isEditMode && existingOrg ? (
        <OrganizationSettingsForm
          organization={existingOrg}
          onSuccess={(updated) => {
            if (onSuccess) {
              onSuccess(updated);
            }
          }}
        />
      ) : (
        <OrganizationOnboardingWizard
          mode="internal"
          onSuccess={(org) => {
            if (onSuccess) {
              onSuccess(org);
            } else {
              handleBack();
            }
          }}
          onCancel={handleBack}
        />
      )}
    </div>
  );
};

export default OrganizationFormPage;
