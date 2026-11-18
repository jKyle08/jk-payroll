import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Construction, ArrowLeft, LogIn } from 'lucide-react';

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
      fullScreen ? 'min-h-screen bg-slate-50' : 'min-h-[60vh]'
    }`}
  >
    <div className="max-w-md w-full text-center bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-8">
      <div className="mx-auto w-14 h-14 rounded-xl bg-[#0F172A]/5 text-[#0F172A] flex items-center justify-center mb-4">
        {icon}
      </div>
      {code && (
        <div className="font-mono text-xs font-bold tracking-widest text-[#6B7280] mb-1">{code}</div>
      )}
      <h1 className="text-xl font-semibold text-[#111827]">{title}</h1>
      <p className="mt-2 text-sm text-[#475569]">{description}</p>
      <div className="mt-6 flex items-center justify-center gap-2">{actions}</div>
    </div>
  </div>
);

const primaryBtn =
  'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F172A] text-white text-sm font-medium hover:bg-[#1E293B] transition-colors';
const secondaryBtn =
  'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E5E7EB] text-[#111827] text-sm font-medium hover:bg-[#F1F5F9] transition-colors';

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
          <button type="button" onClick={handleLogin} className={primaryBtn}>
            <LogIn className="w-4 h-4" /> Sign in
          </button>
          <button type="button" onClick={() => navigate(-1)} className={secondaryBtn}>
            <ArrowLeft className="w-4 h-4" /> Go back
          </button>
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
          <button type="button" onClick={() => navigate('/organizations')} className={primaryBtn}>
            Back to Organizations
          </button>
          <button type="button" onClick={() => navigate(-1)} className={secondaryBtn}>
            <ArrowLeft className="w-4 h-4" /> Go back
          </button>
        </>
      }
    />
  );
};

