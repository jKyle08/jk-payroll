// ==============================================================================
// PAYPULSE: ENTERPRISE ORGANIZATION ONBOARDING INTERFACE
// Design System: Minimal Enterprise SaaS (Balanced Glossy Graphite)
// Inspired by: Stripe, Linear, and Ramp
// File: src/client/components/onboarding/OrganizationOnboardingWizard.tsx
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  Eye,
  EyeOff,
  Info,
  Loader2,
  AlertCircle,
  Users,
  Wallet,
  Settings2,
} from 'lucide-react';
import {
  organizationOnboardingSchema,
  OrganizationOnboardingInput,
  OrganizationOnboardingFormInput,
} from '../../../features/organizations/organization.schema.js';
import {
  Organization,
  OrganizationSector,
  DEFAULT_ORGANIZATION_SETTINGS,
} from '../../../features/organizations/types.js';
import { useOrganizationMutations } from '../../../features/organizations/hooks/useOrganizationMutations.js';
import { toast } from '../ui/index.js';

export interface OrganizationOnboardingWizardProps {
  mode?: 'standalone' | 'internal';
  initialToken?: string;
  onSuccess?: (organization: Organization, redirectUrl: string) => void;
  onCancel?: () => void;
}

const SECTOR_OPTIONS: {
  value: OrganizationSector;
  title: string;
  subtitle: string;
}[] = [
  {
    value: 'Private',
    title: 'Private Sector',
    subtitle: 'Corporate (DOLE & SSS)',
  },
  {
    value: 'Public',
    title: 'Public Sector',
    subtitle: 'Government (GSIS & Civil Service)',
  },
  {
    value: 'NonProfit',
    title: 'Non-Profit / NGO',
    subtitle: 'Non-Profit (Grants & Tax-Exempt)',
  },
];

export const OrganizationOnboardingWizard: React.FC<OrganizationOnboardingWizardProps> = ({
  mode = 'standalone',
  initialToken,
  onSuccess,
  onCancel,
}) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Clear any legacy form draft cache on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(`organization-onboarding-${mode}`);
        window.localStorage.removeItem('organization-onboarding-standalone');
        window.localStorage.removeItem('organization-onboarding-internal');
      }
    } catch {
      // Ignore storage errors
    }
  }, [mode]);

  const { onboardOrg, isSubmitting, mutationError, clearError } = useOrganizationMutations();

  const form = useForm<OrganizationOnboardingFormInput, any, OrganizationOnboardingInput>({
    resolver: zodResolver(organizationOnboardingSchema) as any,
    mode: 'onTouched',
    defaultValues: {
      name: '',
      code: '',
      slug: undefined,
      sector: 'Private',
      tier: 'Enterprise',
      status: 'Active',
      currency: 'PHP',
      timezone: 'Asia/Manila',
      countryCode: 'PH',
      defaultPayFrequency: 'Semi-Monthly',
      supportedWorkModes: ['OnSite', 'Remote', 'Hybrid'],
      statutoryIds: {},
      settings: {
        payroll: {
          standardDailyHours: 8,
          standardWorkingDaysPerYear: 261,
          prorationMethod: 'WorkingDays',
          statutoryDeductionSplit: 'SplitEqually',
        },
        timeAndAttendance: {
          gracePeriodMinutes: 15,
          overtimeMinimumMinutes: 60,
          allowWebClockIn: true,
          requireGeofence: false,
          geofenceRadiusMeters: 100,
        },
        leaves: {
          allowNegativeBalance: false,
          requireApprovalLevels: 1,
          carryOverLimitDays: 5,
        },
        security: {
          enforce2FA: false,
          protectPayslipWithPassword: true,
          payslipPasswordFormat: 'BIRTHDATE_YYYYMMDD',
        },
      },
      modules: ['Department', 'EmployeeProfile', 'RolePermission'],
      admin: {
        fullName: '',
        email: '',
        username: undefined,
        title: 'Super Administrator',
        password: '',
        confirmPassword: '',
      },
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const watchedName = (watch('name') as string | undefined) || '';
  const watchedCode = (watch('code') as string | undefined) || '';
  const watchedSlug = (watch('slug') as string | undefined) || '';
  const watchedSector = watch('sector') || 'Private';

  // Real-time automatic slug and code generation from company name
  const handleNameBlur = () => {
    if (!watchedCode && watchedName) {
      const generatedCode = watchedName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 10);
      if (generatedCode && generatedCode.length >= 2) {
        setValue('code', generatedCode, { shouldValidate: true, shouldDirty: true });
        setValue('slug', generatedCode.toLowerCase(), { shouldValidate: true });
      }
    }
  };

  const onFinalSubmit = async (data: OrganizationOnboardingInput) => {
    clearError();
    if (mode === 'standalone' && !initialToken) {
      form.setError('admin.email', {
        type: 'manual',
        message: 'Open this page using a valid SuperAdmin onboarding link.',
      });
      return;
    }

    const email = data.admin.email.trim().toLowerCase();
    const derivedCode = data.code.trim().toUpperCase();
    const derivedSlug =
      data.slug && data.slug.length >= 2
        ? data.slug
        : derivedCode.length >= 2
          ? derivedCode.toLowerCase()
          : undefined;

    const finalData: OrganizationOnboardingInput = {
      ...data,
      code: derivedCode,
      slug: derivedSlug,
      status: 'Active',
      tier: 'Enterprise',
      currency: 'PHP',
      timezone: 'Asia/Manila',
      countryCode: 'PH',
      defaultPayFrequency: 'Semi-Monthly',
      supportedWorkModes: ['OnSite', 'Remote', 'Hybrid'],
      statutoryIds: {},
      settings: {
        ...DEFAULT_ORGANIZATION_SETTINGS,
        leaves: {
          allowNegativeBalance: false,
          requireApprovalLevels: 1,
          carryOverLimitDays: 5,
        },
      },
      modules: ['Department', 'EmployeeProfile', 'RolePermission'],
      admin: {
        ...data.admin,
        email,
        title: data.admin.title || 'Super Administrator',
        username: data.admin.username || email.split('@')[0],
      },
    };

    try {
      const result = await onboardOrg(finalData, initialToken);
      toast.success('organization.created', {
        name: result.organization?.name || 'New Organization',
        code: result.organization?.code || '',
      });

      if (onSuccess) {
        onSuccess(result.organization, result.redirectUrl);
      } else if (mode === 'standalone') {
        setTimeout(() => {
          window.location.href = result.redirectUrl;
        }, 600);
      } else {
        setTimeout(() => {
          navigate('/organizations');
        }, 600);
      }
    } catch (err: any) {
      toast.fromError(err, 'Organization registration failed');
    }
  };

  return (
    <div className="w-full">
      {/* MUTATION ERROR ALERT */}
      {mutationError && (
        <div className="mb-6 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Registration Failed</p>
            <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">{mutationError}</p>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TWO-COLUMN ENTERPRISE COMPOSITION                                    */}
      {/* Desktop: 38% Intro Panel (5 cols) + 62% Registration Form (7 cols)  */}
      {/* Mobile: Stacked Single-Column Composition                           */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        {/* ================================================================== */}
        {/* LEFT PANEL: WORKSPACE INTRODUCTION (Midnight Navy Identity)        */}
        {/* ================================================================== */}
        <div className="lg:col-span-5 bg-[#0F172A] dark:bg-[#121620] border border-slate-800 dark:border-white/10 rounded-xl p-6 sm:p-8 flex flex-col justify-between text-white shadow-2xs relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent">
          <div>
            {/* 1. Compact Brand Identity */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800/90 dark:bg-[#181D2A] border border-slate-700/80 dark:border-white/10 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                  <span className="text-[#CBD5E1]">P</span>
                </div>
                <span className="text-base font-bold tracking-tight text-white dark:text-[#F8FAFC]">
                  PayPulse
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 dark:bg-[#181D2A] text-slate-300 dark:text-[#CBD5E1] border border-slate-700/80 dark:border-white/10">
                {mode === 'standalone' ? 'Invited Setup' : 'Admin Setup'}
              </span>
            </div>

            {/* 2. Small Registration Context Label */}
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#CBD5E1] font-semibold mt-6">
              ORGANIZATION REGISTRATION
            </p>

            {/* 3. Prominent Workspace Introduction Heading */}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white dark:text-[#F8FAFC] mt-2 leading-snug">
              Everything your organization needs, in one workspace.
            </h1>

            {/* 4. Short Supporting Description */}
            <p className="text-xs sm:text-sm text-slate-400 dark:text-[#94A3B8] mt-2.5 leading-relaxed">
              A centralized space to manage your people, payroll operations, and organization settings.
            </p>

            {/* 5. Thin Divider */}
            <div className="border-t border-slate-800/80 dark:border-white/10 my-6" />

            {/* 6. Three Platform Capability Descriptions */}
            <div className="space-y-5">
              {/* People Management */}
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-white/5 dark:bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0 mt-0.5 text-[#CBD5E1]">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-white dark:text-[#F8FAFC]">People Management</h2>
                  <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-0.5 leading-relaxed">
                    Keep employee information organized.
                  </p>
                </div>
              </div>

              {/* Payroll Operations */}
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-white/5 dark:bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0 mt-0.5 text-[#CBD5E1]">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-white dark:text-[#F8FAFC]">Payroll Operations</h2>
                  <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-0.5 leading-relaxed">
                    Manage payroll in one place.
                  </p>
                </div>
              </div>

              {/* Organization Settings */}
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-white/5 dark:bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0 mt-0.5 text-[#CBD5E1]">
                  <Settings2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-white dark:text-[#F8FAFC]">Organization Settings</h2>
                  <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-0.5 leading-relaxed">
                    Configure your workspace to fit your needs.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 7. Flexible Vertical Spacing & 8. Subtle Footer */}
          <div className="mt-8 pt-4 border-t border-slate-800/80 dark:border-white/10">
            <span className="text-[10px] font-mono tracking-widest text-slate-500 dark:text-[#64748B] uppercase">
              PAYPULSE &middot; ORGANIZATION WORKSPACE
            </span>
          </div>
        </div>

        {/* ================================================================== */}
        {/* RIGHT PANEL: PRIMARY REGISTRATION FORM                             */}
        {/* ================================================================== */}
        <div className="lg:col-span-7 bg-white dark:bg-[#181D2A] border border-[#E2E8F0] dark:border-white/12 rounded-xl p-6 sm:p-8 shadow-xs dark:shadow-[0_8px_30px_rgb(0,0,0,0.6)] flex flex-col justify-between relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent">
          <form
            onSubmit={handleSubmit(
              onFinalSubmit,
              (formErrors) => {
                console.warn('Organization Onboarding validation errors:', formErrors);
              }
            )}
            className="space-y-6"
          >
            {/* Top error alert if non-field or general validation blocks submit */}
            {Object.keys(errors).length > 0 &&
              !errors.name &&
              !errors.code &&
              !errors.admin?.fullName &&
              !errors.admin?.email &&
              !errors.admin?.password &&
              !(errors.admin as any)?.confirmPassword && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Please review all fields before creating the organization.</span>
                </div>
              )}

            {/* ================================================================ */}
            {/* 1. ORGANIZATION IDENTITY                                          */}
            {/* ================================================================ */}
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  Organization Identity
                </h2>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                  Define your tenant organization name and regulatory classification.
                </p>
              </div>

              {/* Organization Name */}
              <div>
                <label
                  htmlFor="org-name"
                  className="block text-xs font-medium text-[#0F172A] dark:text-[#CBD5E1] mb-1"
                >
                  Organization Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="org-name"
                  type="text"
                  {...register('name')}
                  onBlur={(e) => {
                    register('name').onBlur(e);
                    handleNameBlur();
                  }}
                  placeholder="e.g. Acme Corporation or Pasig City Government"
                  className="w-full h-10 px-3 text-xs rounded-lg border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-[#121620] text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors"
                />
                {errors.name && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Operating Sector Selection (Compact Segmented Cards) */}
              <div>
                <label className="block text-xs font-medium text-[#0F172A] dark:text-[#CBD5E1] mb-1.5">
                  Operating Sector <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {SECTOR_OPTIONS.map((opt) => {
                    const isSelected = watchedSector === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setValue('sector', opt.value, { shouldValidate: true })}
                        className={`p-3 rounded-lg border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#0F172A] dark:border-white/30 bg-[#F8FAFC] dark:bg-[#202637] ring-1 ring-[#0F172A] dark:ring-white/20'
                            : 'border-[#E2E8F0] dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-[#141924]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                            {opt.title}
                          </span>
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-[#0F172A] dark:border-white/40'
                                : 'border-slate-300 dark:border-white/20'
                            }`}
                          >
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0F172A] dark:bg-[#CBD5E1]" />
                            )}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-tight">
                          {opt.subtitle}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Workspace Code & Live URL Route */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="org-code"
                      className="block text-xs font-medium text-[#0F172A] dark:text-[#CBD5E1]"
                    >
                      Workspace Routing Code <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-mono">Alphanumeric</span>
                  </div>
                  <input
                    id="org-code"
                    type="text"
                    {...register('code')}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-_]/g, '');
                      setValue('code', val, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                      if (val.length >= 2) {
                        setValue('slug', val.toLowerCase(), { shouldValidate: true });
                      } else {
                        setValue('slug', undefined, { shouldValidate: false });
                      }
                    }}
                    placeholder="e.g. ACME"
                    className="w-full h-10 px-3 text-xs font-mono uppercase font-semibold rounded-lg border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-[#121620] text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors"
                  />
                  {errors.code && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{errors.code.message}</p>
                  )}
                  <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1">Unique alphanumeric tenant code.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#0F172A] dark:text-[#CBD5E1] mb-1">
                    Workspace URL Preview
                  </label>
                  <div className="h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/10 bg-[#F8FAFC] dark:bg-[#121620] flex items-center gap-2 text-xs font-mono text-[#64748B] dark:text-[#94A3B8]">
                    <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-[#64748B] shrink-0" />
                    <span className="text-slate-400 dark:text-[#64748B] truncate">app.jkpayroll.internal/</span>
                    <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                      {watchedSlug || watchedCode.toLowerCase() || 'workspace'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1">Generated URL for tenant routing.</p>
                </div>
              </div>
            </div>

            {/* DIVIDER */}
            <div className="border-t border-[#E2E8F0] dark:border-white/10" />

            {/* ================================================================ */}
            {/* 2. ROOT ADMINISTRATOR ACCOUNT                                     */}
            {/* ================================================================ */}
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  Administrator Account
                </h2>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                  Initial workspace owner credentials for tenant governance and security.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Administrator Full Name */}
                <div>
                  <label
                    htmlFor="admin-name"
                    className="block text-xs font-medium text-[#0F172A] dark:text-[#CBD5E1] mb-1"
                  >
                    Administrator Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="admin-name"
                    type="text"
                    {...register('admin.fullName')}
                    placeholder="e.g. Maria Corazon Santos"
                    className="w-full h-10 px-3 text-xs rounded-lg border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-[#121620] text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors"
                  />
                  {errors.admin?.fullName && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                      {errors.admin.fullName.message}
                    </p>
                  )}
                </div>

                {/* Official Work Email */}
                <div>
                  <label
                    htmlFor="admin-email"
                    className="block text-xs font-medium text-[#0F172A] dark:text-[#CBD5E1] mb-1"
                  >
                    Official Work Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="admin-email"
                    type="email"
                    {...register('admin.email')}
                    placeholder="admin@yourcompany.com"
                    className="w-full h-10 px-3 text-xs rounded-lg border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-[#121620] text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors"
                  />
                  {errors.admin?.email && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{errors.admin.email.message}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="admin-password"
                    className="block text-xs font-medium text-[#0F172A] dark:text-[#CBD5E1] mb-1"
                  >
                    Root Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      {...register('admin.password')}
                      placeholder="At least 8 characters"
                      className="w-full h-10 pl-3 pr-10 text-xs rounded-lg border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-[#121620] text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-[#64748B] dark:hover:text-[#F8FAFC] cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.admin?.password && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                      {errors.admin.password.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="admin-confirm-password"
                    className="block text-xs font-medium text-[#0F172A] dark:text-[#CBD5E1] mb-1"
                  >
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="admin-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...register('admin.confirmPassword' as any)}
                      placeholder="Re-enter password"
                      className="w-full h-10 pl-3 pr-10 text-xs rounded-lg border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-[#121620] text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-[#64748B] dark:hover:text-[#F8FAFC] cursor-pointer"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {(errors.admin as any)?.confirmPassword && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                      {(errors.admin as any).confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ================================================================ */}
            {/* 3. CONFIGURATION INFORMATION PANEL                                */}
            {/* ================================================================ */}
            <div className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#121620] border border-[#E2E8F0] dark:border-white/10 flex items-start gap-2.5 text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              <Info className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] shrink-0 mt-0.5" />
              <span>
                Your workspace comes with predefined operational settings, including PHP currency, Manila timezone (GMT+8), semi-monthly payroll schedules, and an initial HR department. You can customize these settings anytime.
              </span>
            </div>

            {/* ================================================================ */}
            {/* 4. ACTIONS (Cancel Button if SuperAdmin mode; Full-width if invite link) */}
            {/* ================================================================ */}
            <div className="pt-2">
              {mode === 'internal' && onCancel ? (
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="h-10 px-4 rounded-lg border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-[#121620] hover:bg-[#F8FAFC] dark:hover:bg-[#181D2A] text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-initial sm:min-w-[180px] h-10 px-5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] active:bg-[#020617] text-white dark:bg-[#CBD5E1] dark:hover:bg-[#E2E8F0] dark:active:bg-[#94A3B8] dark:text-[#0F172A] text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer shadow-2xs"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span>Activating workspace...</span>
                      </>
                    ) : (
                      <span>Create Organization</span>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] active:bg-[#020617] text-white dark:bg-[#CBD5E1] dark:hover:bg-[#E2E8F0] dark:active:bg-[#94A3B8] dark:text-[#0F172A] text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer shadow-2xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span>Activating workspace...</span>
                    </>
                  ) : (
                    <span>Create Organization</span>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OrganizationOnboardingWizard;
