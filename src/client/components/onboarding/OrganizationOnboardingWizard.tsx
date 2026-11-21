// ==============================================================================
// JK-PAYROLL: MULTI-STEP INTERACTIVE ORGANIZATION ONBOARDING WIZARD
// Reusable across standalone public URL (/onboard) and dashboard (/organizations/new)
// Design System: "Midnight & Champagne Steel" (Ramp / Stripe / Mercury Aesthetic)
// File: src/components/onboarding/OrganizationOnboardingWizard.tsx
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Coins,
  Shield,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Lock,
  Globe,
  Check,
  Eye,
  EyeOff,
  User,
  UserCheck,
  Clock,
  Landmark,
  Briefcase,
  HeartHandshake,
  Laptop,
} from 'lucide-react';
import { CustomSelect, Button, Badge } from '../ui/index.js';
import {
  organizationOnboardingSchema,
  OrganizationOnboardingInput,
  OrganizationOnboardingFormInput,
} from '../../../features/organizations/organization.schema.js';
import {
  Organization,
  OrganizationSector,
  PayFrequency,
  WorkMode,
  DEFAULT_ORGANIZATION_SETTINGS,
} from '../../../features/organizations/types.js';
import { useOrganizationMutations } from '../../../features/organizations/hooks/useOrganizationMutations.js';
import { useFormDraft } from '../../hooks/useFormDraft.js';

export interface OrganizationOnboardingWizardProps {
  mode?: 'standalone' | 'internal';
  initialToken?: string;
  onSuccess?: (organization: Organization, redirectUrl: string) => void;
  onCancel?: () => void;
}

const STEPS = [
  { id: 1, name: 'Company', label: 'Organization Identity' },
  { id: 2, name: 'Payroll', label: 'Localization & Modalities' },
  { id: 3, name: 'Admin', label: 'Root Administrator' },
  { id: 4, name: 'Launch', label: 'Review & Finalize' },
] as const;

const SECTOR_OPTIONS: {
  value: OrganizationSector;
  title: string;
  subtitle: string;
  icon: typeof Building2;
}[] = [
  {
    value: 'Private',
    title: 'Private Sector',
    subtitle: 'Commercial Enterprises & Corporations (DOLE & SSS Rules)',
    icon: Briefcase,
  },
  {
    value: 'Public',
    title: 'Public Sector',
    subtitle: 'Government Agencies, LGUs, & SUCs (Plantilla & GSIS)',
    icon: Landmark,
  },
  {
    value: 'NonProfit',
    title: 'Non-Profit / NGO',
    subtitle: 'Charities, Foundations, & NGOs (Donor Project Rules)',
    icon: HeartHandshake,
  },
];

const CURRENCY_OPTIONS = [
  { value: 'PHP', label: 'PHP - Philippine Peso (₱)' },
  { value: 'USD', label: 'USD - United States Dollar ($)' },
  { value: 'SGD', label: 'SGD - Singapore Dollar (S$)' },
  { value: 'EUR', label: 'EUR - Euro (€)' },
];

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Manila', label: 'Asia/Manila (GMT+8)' },
  { value: 'UTC', label: 'UTC (Universal Coordinated Time)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (GMT+8)' },
];

const FREQUENCY_OPTIONS: { value: PayFrequency; label: string }[] = [
  { value: 'Semi-Monthly', label: 'Semi-Monthly (15th & End of Month)' },
  { value: 'Monthly', label: 'Monthly (End of Month)' },
  { value: 'Bi-Weekly', label: 'Bi-Weekly (Every 2 Weeks)' },
  { value: 'Weekly', label: 'Weekly (Every 7 Days)' },
];

export const OrganizationOnboardingWizard: React.FC<OrganizationOnboardingWizardProps> = ({
  mode = 'standalone',
  initialToken,
  onSuccess,
  onCancel,
}) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [launchProgress, setLaunchProgress] = useState<string | null>(null);

  const { onboardOrg, isSubmitting, mutationError, clearError } = useOrganizationMutations();

  const form = useForm<OrganizationOnboardingFormInput, any, OrganizationOnboardingInput>({
    resolver: zodResolver(organizationOnboardingSchema) as any,
    mode: 'onTouched',
    defaultValues: {
      name: '',
      code: '',
      slug: '',
      sector: 'Private',
      tier: 'Enterprise',
      status: 'Active',
      currency: 'PHP',
      timezone: 'Asia/Manila',
      countryCode: 'PH',
      defaultPayFrequency: 'Semi-Monthly',
      admin: {
        fullName: '',
        email: '',
        username: '',
        title: 'Super Administrator',
        password: '',
        confirmPassword: '',
      },
      supportedWorkModes: ['OnSite', 'Remote', 'Hybrid'],
      statutoryIds: {},
      settings: DEFAULT_ORGANIZATION_SETTINGS,
      modules: ['Department', 'EmployeeProfile', 'RolePermission'],
    },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    trigger,
    formState: { errors },
  } = form;

  const { isRestored, clearDraft, discardDraft } = useFormDraft<OrganizationOnboardingFormInput>({
    formId: `organization-onboarding-${mode}`,
    form,
    currentStep,
    onRestored: (draft) => {
      if (draft.currentStep && draft.currentStep >= 1 && draft.currentStep <= 4) {
        setCurrentStep(draft.currentStep);
      }
    },
  });

  const watchedName = watch('name') || '';
  const watchedCode = watch('code') || '';
  const watchedSlug = watch('slug') || '';
  const watchedSector = watch('sector') || 'Private';
  const watchedWorkModes = (watch('supportedWorkModes') as WorkMode[]) || [];
  const formValues = watch();

  // Auto-generate code and slug from company name
  const handleNameBlur = () => {
    if (!watchedCode && watchedName) {
      const generatedCode = watchedName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 8);
      if (generatedCode) {
        setValue('code', generatedCode, { shouldValidate: true });
        setValue('slug', generatedCode.toLowerCase(), { shouldValidate: true });
      }
    }
  };

  const handleWorkModeToggle = (workMode: WorkMode) => {
    const isChecked = watchedWorkModes.includes(workMode);
    let next: WorkMode[];
    if (isChecked) {
      if (watchedWorkModes.length === 1) return; // Must have at least 1
      next = watchedWorkModes.filter((m) => m !== workMode);
    } else {
      next = [...watchedWorkModes, workMode];
    }
    setValue('supportedWorkModes', next, { shouldValidate: true });
  };

  // Step-by-step validation
  const validateStep = async (step: number): Promise<boolean> => {
    clearError();
    if (step === 1) {
      return trigger(['name', 'code', 'slug', 'sector']);
    }
    if (step === 2) {
      return trigger(['currency', 'timezone', 'defaultPayFrequency', 'supportedWorkModes']);
    }
    if (step === 3) {
      const isValid = await trigger([
        'admin.fullName',
        'admin.email',
        'admin.username',
        'admin.title',
        'admin.password',
        'admin.confirmPassword' as any,
      ]);
      const password = watch('admin.password');
      const confirmPassword = watch('admin.confirmPassword' as any);
      if (password && confirmPassword && password !== confirmPassword) {
        setError('admin.confirmPassword' as any, {
          type: 'manual',
          message: 'Passwords do not match',
        });
        return false;
      }
      if (password && !confirmPassword) {
        setError('admin.confirmPassword' as any, {
          type: 'manual',
          message: 'Please confirm your password',
        });
        return false;
      }
      return isValid;
    }
    return true;
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    clearError();
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Keyboard navigation: Enter progresses; Escape steps back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept Enter inside textareas or during submission
      if (isSubmitting) return;
      if (e.key === 'Escape' && currentStep > 1) {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, isSubmitting]);

  const onFinalSubmit = async (data: OrganizationOnboardingInput) => {
    clearError();
    if (mode === 'standalone' && !initialToken) {
      setLaunchProgress(null);
      setError('admin.email', { type: 'manual', message: 'Open this page using a valid SuperAdmin onboarding link.' });
      return;
    }
    const finalData: OrganizationOnboardingInput = {
      ...data,
      status: 'Active',
    };
    setLaunchProgress(
      mode === 'standalone'
        ? 'Registering the invited organization administrator...'
        : 'Provisioning organization database record...'
    );
    try {
      const result = await onboardOrg(finalData, initialToken);
      clearDraft();
      setLaunchProgress(
        mode === 'standalone'
          ? 'Organization and administrator registered. Continue to sign in...'
          : 'Workspace successfully activated. Redirecting...'
      );

      if (onSuccess) {
        onSuccess(result.organization, result.redirectUrl);
      } else if (mode === 'standalone') {
        setTimeout(() => {
          window.location.href = result.redirectUrl;
        }, 800);
      } else {
        setTimeout(() => {
          navigate('/organizations');
        }, 800);
      }
    } catch {
      setLaunchProgress(null);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-[#E5E7EB] dark:border-slate-800 shadow-xl overflow-hidden font-sans transition-all">
      {/* TOP BRANDING & MODE HEADER */}
      <div className="bg-[#0F172A] text-white p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono tracking-widest uppercase text-amber-400 font-semibold">
                  JK Payroll Platform
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-white/10 text-slate-300 border border-white/10">
                  {mode === 'standalone' ? 'SuperAdmin Invitation' : 'Super Admin Provisioning'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
                Workspace Setup Wizard
              </h1>
            </div>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/10 transition-all self-start sm:self-auto"
            >
              Exit Setup
            </button>
          )}
        </div>

        {/* STEPPER PROGRESS INDICATOR */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="grid grid-cols-4 gap-2">
            {STEPS.map((s) => {
              const isDone = currentStep > s.id;
              const isCurrent = currentStep === s.id;
              return (
                <div key={s.id} className="flex flex-col gap-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      isDone
                        ? 'bg-emerald-400'
                        : isCurrent
                        ? 'bg-amber-400'
                        : 'bg-white/15'
                    }`}
                  />
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        isDone
                          ? 'text-emerald-400'
                          : isCurrent
                          ? 'text-amber-300'
                          : 'text-slate-400'
                      }`}
                    >
                      0{s.id}.
                    </span>
                    <span
                      className={`text-[11px] font-semibold truncate hidden sm:inline ${
                        isCurrent
                          ? 'text-white'
                          : isDone
                          ? 'text-slate-300'
                          : 'text-slate-500'
                      }`}
                    >
                      {s.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RESTORED DRAFT RECOVERY BANNER */}
      {isRestored && (
        <div className="mx-6 sm:mx-8 mt-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>
              <strong>Draft Recovered:</strong> Unsaved onboarding progress was restored for this tab.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              discardDraft();
              setCurrentStep(1);
            }}
            className="text-xs font-semibold text-amber-900 dark:text-amber-200 underline hover:no-underline cursor-pointer flex-shrink-0"
          >
            Discard Draft
          </button>
        </div>
      )}

      {/* ERROR & STATUS BANNERS */}
      {mutationError && (
        <div className="mx-6 sm:mx-8 mt-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Setup Failed</p>
            <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">{mutationError}</p>
          </div>
        </div>
      )}

      {launchProgress && (
        <div className="mx-6 sm:mx-8 mt-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-300 text-xs font-medium flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-amber-600 animate-spin flex-shrink-0" />
          <div>
            <p className="font-semibold">Activating Enterprise Tenant...</p>
            <p className="text-[11px] text-amber-800 dark:text-amber-400">{launchProgress}</p>
          </div>
        </div>
      )}

      {/* FORM BODY CONTAINER */}
      <form onSubmit={handleSubmit(onFinalSubmit)} className="p-6 sm:p-8 space-y-6">
        {/* ==================================================================== */}
        {/* STEP 1: ORGANIZATION IDENTITY & SECTOR                                */}
        {/* ==================================================================== */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base font-bold text-[#111827] dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" /> Step 1: Organization Identity & Sector
              </h2>
              <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
                Establish company credentials, tenant routing code, and statutory classification.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Organization Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1.5">
                  Organization Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('name')}
                  onBlur={handleNameBlur}
                  placeholder="e.g. City Government of Pasig or Apex Global Holdings Inc."
                  className="w-full h-11 px-4 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                />
                {errors.name && <p className="text-[11px] text-rose-600 mt-1">{errors.name.message}</p>}
              </div>

              {/* Organization Code */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300">
                    Routing Code <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-[#6B7280] font-mono">Alphanumeric</span>
                </div>
                <input
                  type="text"
                  {...register('code')}
                  onChange={(e) => {
                    const uppercaseVal = e.target.value.toUpperCase();
                    setValue('code', uppercaseVal, { shouldValidate: true });
                    setValue('slug', uppercaseVal.toLowerCase(), { shouldValidate: true });
                  }}
                  placeholder="e.g. PASIG-GOV, APEX"
                  className="w-full h-11 px-4 text-xs font-mono font-bold rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white placeholder-[#9CA3AF] uppercase focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                />
                {errors.code && <p className="text-[11px] text-rose-600 mt-1">{errors.code.message}</p>}
              </div>

              {/* Live Slug Preview */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1.5">
                  Live URL Slug Route
                </label>
                <div className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center gap-2 text-xs font-mono text-slate-700 dark:text-slate-300">
                  <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-400 truncate">app.jkpayroll.internal/</span>
                  <span className="font-bold text-[#0F172A] dark:text-white">
                    {watchedSlug || watchedCode.toLowerCase() || 'workspace'}
                  </span>
                </div>
              </div>

              {/* Optional Corporate Profile Metadata */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1.5">
                  Registered Legal Name <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  {...register('legalName')}
                  placeholder="e.g. Apex Global Technologies Holdings, Inc."
                  className="w-full h-11 px-4 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1.5">
                  Corporate Email Domain <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  {...register('domain')}
                  placeholder="e.g. apex.com"
                  className="w-full h-11 px-4 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                />
              </div>
            </div>

            {/* SECTOR SELECTOR CARDS */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300">
                Operating Sector <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {SECTOR_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = watchedSector === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue('sector', opt.value, { shouldValidate: true })}
                      className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#0F172A] dark:border-amber-400/80 bg-slate-50 dark:bg-slate-800/80 shadow-xs'
                          : 'border-[#E5E7EB] dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isSelected
                              ? 'bg-[#0F172A] text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#111827] dark:text-white">{opt.title}</h4>
                        <p className="text-[11px] text-[#6B7280] dark:text-slate-400 mt-1 leading-relaxed">
                          {opt.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* DYNAMIC SECTOR UX CALLOUT */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5 text-xs text-[#374151] dark:text-slate-300">
                <Landmark className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                {watchedSector === 'Public' && (
                  <p>
                    <span className="font-semibold text-[#111827] dark:text-white">Public Sector Configuration Active:</span>{' '}
                    Pre-configures GSIS Agency IDs, Civil Service plantilla positions, and statutory government payroll schedules.
                  </p>
                )}
                {watchedSector === 'Private' && (
                  <p>
                    <span className="font-semibold text-[#111827] dark:text-white">Private Sector Configuration Active:</span>{' '}
                    Structured for DOLE compliance, SSS employer contributions, night differentials, and corporate tax tables.
                  </p>
                )}
                {watchedSector === 'NonProfit' && (
                  <p>
                    <span className="font-semibold text-[#111827] dark:text-white">Non-Profit Configuration Active:</span>{' '}
                    Pre-enables grant/project cost center allocations and tax-exempt payroll structures.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP 2: LOCALIZATION & PAYROLL DEFAULTS                              */}
        {/* ==================================================================== */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base font-bold text-[#111827] dark:text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" /> Step 2: Localization & Payroll Modalities
              </h2>
              <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
                Set base currencies, attendance timezones, and authorized workplace modalities.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Currency */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1.5">
                  Base Currency <span className="text-rose-500">*</span>
                </label>
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={CURRENCY_OPTIONS}
                      className="w-full"
                    />
                  )}
                />
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1.5">
                  Operating Timezone <span className="text-rose-500">*</span>
                </label>
                <Controller
                  name="timezone"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={TIMEZONE_OPTIONS}
                      className="w-full"
                    />
                  )}
                />
              </div>

              {/* Pay Frequency */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1.5">
                  Default Pay Frequency <span className="text-rose-500">*</span>
                </label>
                <Controller
                  name="defaultPayFrequency"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={FREQUENCY_OPTIONS}
                      className="w-full"
                    />
                  )}
                />
              </div>
            </div>

            {/* WORK MODALITY CHIPS */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300">
                Supported Work Modalities <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { mode: 'OnSite' as WorkMode, title: 'On-Site Staff', subtitle: 'Biometric & Office Geofence' },
                  { mode: 'Remote' as WorkMode, title: 'Remote / WFH', subtitle: 'Web Portal & Flexible Hours' },
                  { mode: 'Hybrid' as WorkMode, title: 'Hybrid Schedule', subtitle: 'Split Schedule & Roaming' },
                ].map((item) => {
                  const isChecked = watchedWorkModes.includes(item.mode);
                  return (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() => handleWorkModeToggle(item.mode)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                        isChecked
                          ? 'border-[#0F172A] bg-slate-50 dark:bg-slate-800 text-[#0F172A] dark:text-white shadow-xs'
                          : 'border-[#E5E7EB] dark:border-slate-700 text-[#6B7280] hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                          isChecked
                            ? 'bg-[#0F172A] border-[#0F172A] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{item.title}</p>
                        <p className="text-[10px] text-[#6B7280] dark:text-slate-400">{item.subtitle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP 3: INITIAL ROOT ADMINISTRATOR ACCOUNT                           */}
        {/* ==================================================================== */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base font-bold text-[#111827] dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" /> Step 3: Root Administrator Account
              </h2>
              <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
                Bootstrap root administrative credentials for tenant governance, security, and setup.
              </p>
            </div>

            {/* MANDATORY NEW USER NOTICE */}
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
              <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                <strong>New User Provisioning:</strong> Onboarding always creates a fresh, isolated root administrator user profile for this organization.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('admin.fullName', {
                    required: 'Full name is required for the root administrator',
                    minLength: { value: 2, message: 'Name must be at least 2 characters' },
                  })}
                  placeholder="e.g. Maria Corazon Santos"
                  className="w-full h-11 px-4 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                />
                {errors.admin?.fullName && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.admin.fullName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1.5">
                  Official Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  {...register('admin.email', {
                    required: 'Official email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Valid email address is required',
                    },
                  })}
                  placeholder="admin@yourcompany.com"
                  className="w-full h-11 px-4 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                />
                {errors.admin?.email && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.admin.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  {...register('admin.username')}
                  placeholder="e.g. msantos (defaults to email prefix)"
                  className="w-full h-11 px-4 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1.5">
                  Administrator Title
                </label>
                <input
                  type="text"
                  {...register('admin.title')}
                  defaultValue="Super Administrator"
                  placeholder="Super Administrator"
                  className="w-full h-11 px-4 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1.5">
                  Root Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('admin.password', {
                      required: 'Password is required for the new root administrator account',
                      minLength: { value: 8, message: 'Password must be at least 8 characters' },
                    })}
                    placeholder="At least 8 characters"
                    className="w-full h-11 pl-4 pr-11 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title={showPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.admin?.password && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.admin.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1.5">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...register('admin.confirmPassword' as any, {
                      required: 'Please confirm your root administrator password',
                      validate: (value) =>
                        value === watch('admin.password') || 'Passwords do not match',
                    })}
                    placeholder="Re-enter your password"
                    className="w-full h-11 pl-4 pr-11 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title={showConfirmPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {(errors.admin as any)?.confirmPassword && (
                  <p className="text-[11px] text-rose-600 mt-1">{(errors.admin as any).confirmPassword.message}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP 4: REVIEW & LAUNCH WORKSPACE                                    */}
        {/* ==================================================================== */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base font-bold text-[#111827] dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" /> Step 4: Review Configuration & Launch
              </h2>
              <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
                Confirm your tenant parameters before initial database provisioning.
              </p>
            </div>

            {/* REVIEW SUMMARY CARD */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] uppercase font-mono text-[#6B7280]">Tenant Name</span>
                  <p className="text-xs font-bold text-[#111827] dark:text-white mt-0.5">{formValues.name}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-[#6B7280]">Routing Code / Slug</span>
                  <p className="text-xs font-mono font-bold text-[#111827] dark:text-white mt-0.5">
                    {formValues.code} ({formValues.slug})
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-[#6B7280]">Sector</span>
                  <p className="text-xs font-semibold text-emerald-600 mt-0.5">{formValues.sector}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] uppercase font-mono text-[#6B7280]">Currency & Timezone</span>
                  <p className="text-xs font-medium text-[#111827] dark:text-white mt-0.5">
                    {formValues.currency} • {formValues.timezone}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-[#6B7280]">Pay Frequency</span>
                  <p className="text-xs font-medium text-[#111827] dark:text-white mt-0.5">
                    {formValues.defaultPayFrequency}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-[#6B7280]">Work Modalities</span>
                  <p className="text-xs font-medium text-[#111827] dark:text-white mt-0.5">
                    {watchedWorkModes.join(', ')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-mono text-[#6B7280]">Root Administrator</span>
                  <p className="text-xs font-bold text-[#111827] dark:text-white mt-0.5">
                    {formValues.admin?.fullName}
                  </p>
                  <p className="text-[11px] text-[#6B7280]">{formValues.admin?.title || 'Super Administrator'}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-[#6B7280]">Administrator Work Email</span>
                  <p className="text-xs font-mono text-[#111827] dark:text-white mt-0.5">
                    {formValues.admin?.email}
                  </p>
                  <p className="text-[11px] font-mono text-[#6B7280]">
                    @{formValues.admin?.username || (formValues.admin?.email ? formValues.admin.email.split('@')[0] : 'admin')}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-[#6B7280]">Initial Access Rights</span>
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <Shield className="w-4 h-4 text-amber-500" />
                    <span>{mode === 'standalone' ? 'Onboarding & Setup Only' : 'Full Admin Provisioned'}</span>
                  </div>
                </div>
              </div>

              {/* Informative Restricted Scope Notice for Public Signups */}
              {mode === 'standalone' && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                      Restricted Onboarding Access Mode
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                      Upon sign-up, your organization begins in <strong>Onboarding</strong> status. You will have immediate access to complete your company profile, statutory agency IDs, and payroll parameters. Live payroll computation and payouts unlock once approved.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex items-center justify-between pt-5 border-t border-[#E5E7EB] dark:border-slate-800">
          <div>
            {currentStep > 1 && (
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handlePrev}
                disabled={isSubmitting}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep < 4 ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleNext}
              >
                Next Step <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                <Sparkles className="w-4 h-4 mr-1.5 text-amber-300" />
                <span>Launch &amp; Activate Workspace</span>
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default OrganizationOnboardingWizard;

