// ==============================================================================
// JK-PAYROLL: ORGANIZATION FORM PAGE
// Routes to OrganizationOnboardingForm (/organizations/new)
// or OrganizationSettingsForm (/organizations/:id/edit)
// Design System: "Midnight & Champagne Steel"
// File: src/features/organizations/components/OrganizationFormPage.tsx
// ==============================================================================

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Organization } from '../types.js';
import { useOrganization } from '../hooks/useOrganization.js';
import { OrganizationSettingsForm } from './OrganizationSettingsForm.js';
import { OrganizationOnboardingWizard } from '../../../client/components/onboarding/OrganizationOnboardingWizard.js';

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

  // Single-record fetching for edit mode
  const {
    organization: existingOrg,
    isLoading: isLoadingOrg,
    error: loadError,
  } = useOrganization(id);

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
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 p-6 text-center shadow-xs">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-[#111827] dark:text-white">Organization Not Found</h3>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-1">
            {loadError || `Organization with ID '${id}' could not be located.`}
          </p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#0F172A] text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Organizations</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 text-[#111827] dark:text-white font-sans w-full">
      <div className="flex items-center space-x-2 pb-1">
        <button
          type="button"
          onClick={handleBack}
          className="text-xs font-semibold text-[#6B7280] hover:underline cursor-pointer transition-colors"
        >
          Organizations
        </button>
        <span className="text-xs text-[#E5E7EB] dark:text-slate-700">/</span>
        <span className="text-xs font-semibold text-[#111827] dark:text-slate-200">
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
