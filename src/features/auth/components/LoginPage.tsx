// ==============================================================================
// JK-PAYROLL: REACT LOGIN PAGE COMPONENT
// Design System: Balanced Glossy Graphite
// File: src/features/auth/components/LoginPage.tsx
// ==============================================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  Shield,
  Eye,
  EyeOff,
  Building2,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Loader2,
  Clock,
} from 'lucide-react';
import { useAuth } from '../hooks/use-auth.js';
import { consumeSessionTimeoutMessage } from '../../../client/lib/auth-session.js';
import { resolvePostLoginRedirect } from '../../../client/core/auth/RouteRestoration.js';
import { getTabId } from '../../../client/core/persistence/TabIdentity.js';
import {
  Button,
  Input,
  Alert,
  Card,
  toast,
} from '../../../client/components/ui/index.js';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionTimeoutMessage, setSessionTimeoutMessage] = useState<string | null>(null);

  // Check for session timeout notification
  React.useEffect(() => {
    const timeoutMsg = consumeSessionTimeoutMessage();
    if (timeoutMsg) {
      setSessionTimeoutMessage(timeoutMsg);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await login(email, password);
      toast.success('auth.login_success', { name: data.user?.fullName || 'User' });
      const targetRoute = resolvePostLoginRedirect(
        data.user?.userId || data.user?.id,
        data.user?.tenantId,
        getTabId()
      );
      navigate(targetRoute, { replace: true });
    } catch (err: any) {
      const msg = err.message || 'Authentication failed. Please check your credentials.';
      setErrorMessage(msg);
      toast.fromError(err, 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await login(quickEmail, quickPass);
      toast.success('auth.login_success', { name: data.user?.fullName || 'User' });
      const targetRoute = resolvePostLoginRedirect(
        data.user?.userId || data.user?.id,
        data.user?.tenantId,
        getTabId()
      );
      navigate(targetRoute, { replace: true });
    } catch (err: any) {
      const msg = err.message || 'Quick login failed';
      setErrorMessage(msg);
      toast.fromError(err, 'Quick login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] dark:bg-[#0B0E14] flex flex-col justify-center items-center p-4 sm:p-6 font-sans relative">
      {/* Background Decorative Accent */}
      <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-slate-100 to-transparent dark:from-white/[0.02] dark:to-transparent pointer-events-none -z-10" />

      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0F172A] dark:bg-[#181D2A] text-white dark:text-[#F8FAFC] shadow-md dark:border dark:border-white/10 mb-2">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F8FAFC]">
            PayPulse Portal
          </h1>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
            Multi-Tenant Enterprise Payroll & Granular RBAC
          </p>
        </div>

        {/* Quick Demo Logins Card (Development Only) */}
        {import.meta.env.DEV && (
          <div className="bg-white dark:bg-[#181D2A] rounded-2xl p-4 border border-[#E5E7EB] dark:border-white/10 shadow-xs dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)] space-y-2.5 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>1-Click Test Personas</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#121620] text-slate-600 dark:text-[#CBD5E1] border dark:border-white/10">
                Dev Only
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickLogin('superadmin@paypulse.internal', 'SuperAdmin2026!')}
                className="p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/10 hover:bg-indigo-100/60 dark:hover:bg-indigo-500/20 text-left transition-all group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                  <span>Super Admin</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-[#64748B] mt-0.5 truncate">
                  Global platform scope
                </p>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickLogin('admin@apexcorp.com', 'ApexAdmin2026!')}
                className="p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/10 hover:bg-emerald-100/60 dark:hover:bg-emerald-500/20 text-left transition-all group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                  <span>Tenant Admin</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-[#64748B] mt-0.5 truncate">
                  Apex Health scope
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Credentials Form Card */}
        <Card specular className="p-6 sm:p-8 space-y-5">
          {sessionTimeoutMessage && (
            <Alert variant="info" icon={<Clock className="w-4 h-4" />}>
              {sessionTimeoutMessage}
            </Alert>
          )}

          {errorMessage && (
            <Alert variant="destructive">
              {errorMessage}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                disabled={isLoading}
                leftIcon={<Mail className="w-4 h-4 text-slate-400 dark:text-[#64748B]" />}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1]">
                  Password
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.info('auth.demo_persona_hint');
                  }}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] transition-colors cursor-pointer"
                >
                  Forgot password?
                </a>
              </div>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                disabled={isLoading}
                leftIcon={<Lock className="w-4 h-4 text-slate-400 dark:text-[#64748B]" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:text-[#64748B] dark:hover:text-[#F8FAFC] transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isLoading}
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="mt-2"
            >
              Sign In to Dashboard
            </Button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E5E7EB] dark:border-white/10" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-semibold">
                <span className="bg-white dark:bg-[#181D2A] px-3 text-[#9CA3AF] dark:text-[#64748B]">
                  New Client Organization?
                </span>
              </div>
            </div>

            {/* Onboard Organization CTA */}
            <Button
              type="button"
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => navigate('/onboard')}
              leftIcon={<Building2 className="w-4 h-4 text-amber-500" />}
              rightIcon={<ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-[#64748B]" />}
            >
              Onboard New Organization
            </Button>
          </form>
        </Card>

        {/* Security Badge Footer */}
        <div className="text-center text-[11px] text-[#6B7280] dark:text-[#64748B] flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Secured by PayPulse RBAC Multi-Tenant Isolation Engine</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

