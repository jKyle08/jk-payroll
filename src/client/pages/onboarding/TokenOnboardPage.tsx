// ==============================================================================
// JK-PAYROLL: TOKENIZED INVITATION ONBOARDING PAGE
// Route: /onboarding/:token (Private invite onboarding)
// File: src/client/pages/onboarding/TokenOnboardPage.tsx
// ==============================================================================

import React from 'react';
import { useParams } from 'react-router-dom';
import { OnboardingLayout } from '../../layouts/OnboardingLayout.js';
import { OrganizationOnboardingWizard } from '../../components/onboarding/OrganizationOnboardingWizard.js';

export default function TokenOnboardPage() {
  const { token } = useParams<{ token?: string }>();

  return (
    <OnboardingLayout>
      <OrganizationOnboardingWizard mode="standalone" initialToken={token} />
    </OnboardingLayout>
  );
}

export { TokenOnboardPage };
