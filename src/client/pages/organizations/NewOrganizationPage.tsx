// ==============================================================================
// JK-PAYROLL: INTERNAL NEW ORGANIZATION PROVISIONING PAGE
// Route: /organizations/new (Super Admin Provisioning Wizard without Sidebar/Topbar)
// File: src/client/pages/organizations/NewOrganizationPage.tsx
// ==============================================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingLayout } from '../../layouts/OnboardingLayout.js';
import { OrganizationOnboardingWizard } from '../../components/onboarding/OrganizationOnboardingWizard.js';

export default function NewOrganizationPage() {
  const navigate = useNavigate();

  return (
    <OnboardingLayout>
      <OrganizationOnboardingWizard
        mode="internal"
        onCancel={() => navigate('/organizations')}
        onSuccess={() => navigate('/organizations')}
      />
    </OnboardingLayout>
  );
}

export { NewOrganizationPage };
