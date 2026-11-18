// ==============================================================================
// JK-PAYROLL: STANDALONE CLIENT ONBOARDING PAGE
// Route: /onboard (Public signup or manual invitation link)
// File: src/client/pages/onboarding/StandaloneOnboardPage.tsx
// ==============================================================================

import React from 'react';
import { OnboardingLayout } from '../../layouts/OnboardingLayout.js';
import { OrganizationOnboardingWizard } from '../../components/onboarding/OrganizationOnboardingWizard.js';

export default function StandaloneOnboardPage() {
  return (
    <OnboardingLayout>
      <OrganizationOnboardingWizard mode="standalone" />
    </OnboardingLayout>
  );
}

export { StandaloneOnboardPage };
