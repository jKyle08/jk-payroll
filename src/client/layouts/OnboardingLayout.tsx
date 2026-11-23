// ==============================================================================
// JK-PAYROLL: ENTERPRISE ONBOARDING LAYOUT
// File: src/client/layouts/OnboardingLayout.tsx
// ==============================================================================

import React from 'react';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-10 font-sans text-[#0F172A] dark:text-slate-100 antialiased">
      <div className="w-full max-w-5xl">
        {children}
      </div>
    </div>
  );
}

export { OnboardingLayout };
