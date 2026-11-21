// ==============================================================================
// JK-PAYROLL: STANDALONE CLIENT ONBOARDING PAGE
// Route: /onboard (Public signup or manual invitation link)
// File: src/client/pages/onboarding/StandaloneOnboardPage.tsx
// ==============================================================================

import React from 'react';
import { OnboardingLayout } from '../../layouts/OnboardingLayout.js';
import { OrganizationOnboardingWizard } from '../../components/onboarding/OrganizationOnboardingWizard.js';

export default function StandaloneOnboardPage() {
  const initialToken = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('token') || undefined
    : undefined;
  return (
    <OnboardingLayout>
      <OrganizationOnboardingWizard mode="standalone" initialToken={initialToken} />
    </OnboardingLayout>
  );
}

export { StandaloneOnboardPage };
