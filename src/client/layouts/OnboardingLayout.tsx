// ==============================================================================
// JK-PAYROLL: STANDALONE ONBOARDING LAYOUT
// File: src/client/layouts/OnboardingLayout.tsx
// ==============================================================================

import React from 'react';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 md:p-10 font-sans">
      <div className="w-full max-w-4xl">
        {children}
      </div>
    </div>
  );
}

export { OnboardingLayout };
