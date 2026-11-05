// ==============================================================================
// JK-PAYROLL: REACT LOGIN PAGE COMPONENT
// Design System: "Midnight & Champagne Steel"
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
} from 'lucide-react';
import { useAuth } from '../hooks/use-auth.js';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, logout } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clear any existing or stale session when landing on the login page
  React.useEffect(() => {
    logout();
  }, [logout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login(email, password);
      navigate('/organizations');
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
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
      await login(quickEmail, quickPass);
      navigate('/organizations');
    } catch (err: any) {
      setErrorMessage(err.message || 'Quick login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] dark:bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      {/* Background Decorative Accent */}
      <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-slate-100 to-transparent dark:from-slate-900 dark:to-transparent pointer-events-none -z-10" />

      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0F172A] text-white shadow-md mb-2">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-white">
            PayPulse Portal
          </h1>
          <p className="text-xs text-[#6B7280] dark:text-slate-400">
            Multi-Tenant Enterprise Payroll & Granular RBAC
          </p>
        </div>

        {/* Quick Demo Logins Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-[#E5E7EB] dark:border-slate-800 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>1-Click Test Personas</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Demo Access
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickLogin('superadmin@paypulse.internal', 'SuperAdmin2026!')}
              className="p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100/60 dark:hover:bg-indigo-950/60 text-left transition-all group cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                <span>Super Admin</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Global platform scope
              </p>
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickLogin('admin@apexcorp.com', 'Password123!')}
              className="p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-950/60 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/60 text-left transition-all group cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                <span>Tenant Admin</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Apex Health scope
              </p>
            </button>
          </div>
        </div>

        {/* Credentials Form Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-[#E5E7EB] dark:border-slate-800 shadow-sm space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  disabled={isLoading}
                  className="h-10 w-full pl-10 pr-3.5 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 dark:focus:ring-white/20 focus:border-[#0F172A] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300">
                  Password
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => { e.preventDefault(); alert('Please use one of the 1-click test personas above.'); }}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  disabled={isLoading}
                  className="h-10 w-full pl-10 pr-10 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 dark:focus:ring-white/20 focus:border-[#0F172A] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 mt-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Badge Footer */}
        <div className="text-center text-[11px] text-[#6B7280] dark:text-slate-500 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Secured by PayPulse RBAC Multi-Tenant Isolation Engine</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

