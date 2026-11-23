// ==============================================================================
// PAYPULSE: SYSTEM STATUS & FALLBACK ERROR PAGES
// Design System: Balanced Glossy Graphite
// File: src/client/components/ui/StatusPages.tsx
// ==============================================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Construction, ArrowLeft, LogIn } from 'lucide-react';
import { Button } from './Button.js';

interface StatusLayoutProps {
  icon: React.ReactNode;
  code?: string;
  title: string;
  description: string;
  actions: React.ReactNode;
  fullScreen?: boolean;
}

const StatusLayout: React.FC<StatusLayoutProps> = ({
  icon,
  code,
  title,
  description,
  actions,
  fullScreen,
}) => (
  <div
    className={`flex items-center justify-center px-4 ${
      fullScreen ? 'min-h-screen bg-[#FBFBFC] dark:bg-[#0B0E14]' : 'min-h-[60vh]'
    }`}
  >
    <div className="relative max-w-md w-full text-center bg-white dark:bg-[#181D2A] dark:bg-gradient-to-b dark:from-[#202637] dark:to-[#161B27] border border-[#E5E7EB] dark:border-white/10 rounded-2xl shadow-sm dark:shadow-[0_20px_48px_-8px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.15)] p-8 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:pointer-events-none">
      <div className="mx-auto w-14 h-14 rounded-xl bg-[#0F172A]/5 text-[#0F172A] dark:bg-white/[0.06] dark:text-[#CBD5E1] dark:border dark:border-white/10 flex items-center justify-center mb-4">
        {icon}
      </div>
      {code && (
        <div className="font-mono text-xs font-bold tracking-widest text-[#6B7280] dark:text-[#64748B] mb-1">
          {code}
        </div>
      )}
      <h1 className="text-xl font-semibold text-[#111827] dark:text-[#F8FAFC]">{title}</h1>
      <p className="mt-2 text-sm text-[#475569] dark:text-[#94A3B8]">{description}</p>
      <div className="mt-6 flex items-center justify-center gap-2">{actions}</div>
    </div>
  </div>
);

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const handleLogin = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
  };
  return (
    <StatusLayout
      fullScreen
      icon={<ShieldAlert className="w-7 h-7" />}
      code="ERROR 401"
      title="Unauthorized"
      description="Your session has expired or you are not signed in. Please sign in again to continue."
      actions={
        <>
          <Button type="button" variant="primary" size="md" onClick={handleLogin}>
            <LogIn className="w-4 h-4 mr-1.5" /> Sign in
          </Button>
          <Button type="button" variant="secondary" size="md" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Go back
          </Button>
        </>
      }
    />
  );
};

export const MaintenancePage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <StatusLayout
      icon={<Construction className="w-7 h-7" />}
      code="UNDER CONSTRUCTION"
      title="We're still building this module"
      description="This module isn't available yet. It's being built and will be released soon."
      actions={
        <>
          <Button type="button" variant="primary" size="md" onClick={() => navigate('/organizations')}>
            Back to Organizations
          </Button>
          <Button type="button" variant="secondary" size="md" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Go back
          </Button>
        </>
      }
    />
  );
};
