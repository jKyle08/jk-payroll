// ==============================================================================
// JK-PAYROLL: UNIFIED ORGANIZATION FORM PAGE
// Handles BOTH Create (/organizations/new) and Edit (/organizations/:id/edit)
// Validated with react-hook-form and @hookform/resolvers/zod
// Design System: "Midnight & Champagne Steel"
// File: src/features/organizations/components/OrganizationFormPage.tsx
// ==============================================================================

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  Shield,
  Layers,
  ArrowLeft,
  Lock,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Check,
  CheckCircle,
  UserCheck,
  User,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  CustomSelect,
  SearchableSelect,
  SearchableOption,
} from '../../../components/ui/index.js';
import {
  createOrganizationSchema,
  CreateOrganizationInput,
  CreateOrganizationFormInput,
} from '../organization.schema.js';
import {
  ORGANIZATION_MODULES,
  resolveModuleDependencies,
  Organization,
} from '../types.js';
import { useOrganization } from '../hooks/useOrganization.js';
import { useOrganizationMutations } from '../hooks/useOrganizationMutations.js';

export interface OrganizationFormPageProps {
  organizationIdOverride?: string;
  onNavigateBack?: () => void;
  onSuccess?: (org: Organization) => void;
}

export const SYSTEM_ADMIN_CANDIDATES: SearchableOption[] = [
  {
    value: 'rachel.sterling@enterprise.net',
    label: 'Rachel Sterling',
    sublabel: 'rachel.sterling@enterprise.net • VP of People',
    badge: 'Operations Lead',
    avatarText: 'RS',
    avatarColor: 'bg-purple-600',
    searchTerms: 'rachel sterling operations lead hr',
  },
  {
    value: 'm.vance@enterprise.net',
    label: 'Marcus Vance',
    sublabel: 'm.vance@enterprise.net • HR Director',
    badge: 'HR Manager',
    avatarText: 'MV',
    avatarColor: 'bg-blue-600',
    searchTerms: 'marcus vance human resources hr manager',
  },
  {
    value: 'e.rostova@enterprise.net',
    label: 'Elena Rostova',
    sublabel: 'e.rostova@enterprise.net • IT Architect',
    badge: 'Tech Lead',
    avatarText: 'ER',
    avatarColor: 'bg-emerald-600',
    searchTerms: 'elena rostova enterprise solutions architect technical',
  },
  {
    value: 'david.kim@enterprise.net',
    label: 'David Kim',
    sublabel: 'david.kim@enterprise.net • CFO',
    badge: 'Finance Director',
    avatarText: 'DK',
    avatarColor: 'bg-amber-600',
    searchTerms: 'david kim chief financial officer finance',
  },
  {
    value: 's.jenkins@enterprise.net',
    label: 'Sarah Jenkins',
    sublabel: 's.jenkins@enterprise.net • People Partner',
    badge: 'Payroll Officer',
    avatarText: 'SJ',
    avatarColor: 'bg-rose-600',
    searchTerms: 'sarah jenkins senior people partner payroll',
  },
  {
    value: 'm.chang@enterprise.net',
    label: 'Michael Chang',
    sublabel: 'm.chang@enterprise.net • Infrastructure',
    badge: 'SysAdmin',
    avatarText: 'MC',
    avatarColor: 'bg-indigo-600',
    searchTerms: 'michael chang senior director infrastructure sysadmin',
  },
];

export const OrganizationFormPage: React.FC<OrganizationFormPageProps> = ({
  organizationIdOverride,
  onNavigateBack,
  onSuccess,
}) => {
  // Extract route params
  const params = useParams<{ id?: string }>();
  const id = organizationIdOverride || params.id;
  const isEditMode = Boolean(id);

  // Safe router navigation with fallback
  let navigate: ((path: string) => void) | undefined;
  try {
    navigate = useNavigate();
  } catch {
    navigate = undefined;
  }

  const handleBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else if (navigate) {
      navigate('/organizations');
    }
  };

  // Single-record fetching for edit mode
  const {
    organization: existingOrg,
    isLoading: isLoadingOrg,
    error: loadError,
  } = useOrganization(id);

  // Mutation handlers
  const {
    createOrg,
    updateOrg,
    isSubmitting,
    mutationError,
  } = useOrganizationMutations();

  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState<'new' | 'existing'>('new');
  const [selectedCandidateEmail, setSelectedCandidateEmail] = useState<string>(
    SYSTEM_ADMIN_CANDIDATES[0].value
  );
  const [showPassword, setShowPassword] = useState(false);

  // React Hook Form initialization with shared Zod schema
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateOrganizationFormInput, any, CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema) as any,
    defaultValues: {
      name: '',
      code: '',
      domain: '',
      industry: 'Technology & Software',
      planTier: 'Enterprise',
      status: 'Active',
      adminMode: 'new',
      admin: {
        fullName: '',
        email: '',
        username: '',
        title: 'Administrator',
        password: '',
      },
      modules: ['Department', 'EmployeeProfile', 'RolePermission', 'PayrollProcessing'],
      startDate: '',
      endDate: '',
    },
  });

  const selectedModules = watch('modules') || [];
  const watchedCode = watch('code') || '';

  // Pre-fill form when existing organization loads in edit mode
  useEffect(() => {
    if (existingOrg && isEditMode) {
      reset({
        name: existingOrg.name,
        code: existingOrg.code,
        domain: existingOrg.domain || '',
        industry: existingOrg.industry || 'Technology & Software',
        planTier: existingOrg.planTier || 'Enterprise',
        status: existingOrg.status || 'Active',
        adminMode: 'existing',
        admin: {
          fullName: existingOrg.admin?.fullName || existingOrg.admin?.name || '',
          email: existingOrg.admin?.email || '',
          username: existingOrg.admin?.username || '',
          title: 'Administrator',
          password: '',
        },
        modules: existingOrg.modules || [
          'Department',
          'EmployeeProfile',
          'RolePermission',
        ],
        startDate: existingOrg.startDate ? existingOrg.startDate.slice(0, 16) : '',
        endDate: existingOrg.endDate ? existingOrg.endDate.slice(0, 16) : '',
      });
    }
  }, [existingOrg, isEditMode, reset]);

  // Handle module entitlement toggle with automated dependency enforcement
  const handleToggleModule = (modCode: string) => {
    const isCurrentlyChecked = selectedModules.includes(modCode);
    let nextModules: string[];

    if (isCurrentlyChecked) {
      // Don't allow removal of locked core platform modules
      const modDef = ORGANIZATION_MODULES.find((m) => m.code === modCode);
      if (modDef?.isLockedCore) return;

      // Uncheck and also uncheck dependents
      nextModules = selectedModules.filter((code) => {
        if (code === modCode) return false;
        const otherDef = ORGANIZATION_MODULES.find((m) => m.code === code);
        if (otherDef?.dependsOn?.includes(modCode)) return false;
        return true;
      });
    } else {
      nextModules = [...selectedModules, modCode];
    }

    const { resolvedModules } = resolveModuleDependencies(nextModules);
    setValue('modules', resolvedModules, { shouldValidate: true });
  };

  const handleSelectCandidateUser = (email: string) => {
    setSelectedCandidateEmail(email);
    const candidate = SYSTEM_ADMIN_CANDIDATES.find((c) => c.value === email);
    if (candidate) {
      setValue('admin.fullName', candidate.label, { shouldValidate: true });
      setValue('admin.email', candidate.value, { shouldValidate: true });
      setValue('admin.username', candidate.value.split('@')[0], { shouldValidate: true });
      setValue('admin.title', 'Administrator', { shouldValidate: true });
    }
  };

  // Form submission handler
  const onSubmit = async (data: CreateOrganizationInput) => {
    setFormSuccessMessage(null);
    try {
      let savedOrg: Organization;

      if (isEditMode && id) {
        // Submit via PUT
        savedOrg = await updateOrg(id, {
          name: data.name,
          domain: data.domain,
          industry: data.industry,
          planTier: data.planTier,
          status: data.status,
          startDate: data.startDate || null,
          endDate: data.endDate || null,
          admin: {
            fullName: data.admin.fullName,
            email: data.admin.email,
            title: data.admin.title,
          },
          modules: data.modules,
        });
      } else {
        // Submit via POST
        savedOrg = await createOrg(data);
      }

      setFormSuccessMessage(
        isEditMode
          ? 'Organization settings updated successfully.'
          : 'Organization and administrator provisioned successfully.'
      );

      if (onSuccess) {
        onSuccess(savedOrg);
      } else {
        // Smooth redirect back after brief moment
        setTimeout(() => {
          handleBack();
        }, 750);
      }
    } catch {
      // Errors handled by useOrganizationMutations
    }
  };

  if (isEditMode && isLoadingOrg) {
    return (
      <div className="p-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-[#0F172A]" />
          <span className="text-xs font-medium">Loading organization metadata...</span>
        </div>
      </div>
    );
  }

  if (isEditMode && loadError) {
    return (
      <div className="p-12 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 p-6 text-center shadow-xs">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-[#111827]">Organization Not Found</h3>
          <p className="text-xs text-[#6B7280] mt-1">{loadError}</p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#0F172A] text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Organizations</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 text-[#111827] dark:text-white font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB] dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <button
              type="button"
              onClick={handleBack}
              className="text-xs font-semibold text-[#6B7280] hover:underline cursor-pointer"
            >
              Organizations
            </button>
            <span className="text-xs text-[#E5E7EB] dark:text-slate-700">/</span>
            <span className="text-xs font-semibold text-[#111827] dark:text-slate-200">
              Organization Form
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-white">
            {isEditMode ? 'Edit Organization Settings' : 'Provision New Organization'}
          </h1>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
            Configure organization profile, root administrator credentials, and enterprise module entitlements.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Notification Banners */}
          {formSuccessMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{formSuccessMessage}</span>
            </div>
          )}

          {mutationError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{mutationError}</span>
            </div>
          )}

          {/* CARD 1: ORGANIZATION IDENTITY */}
          <section className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB]">
              <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] text-[#0F172A] flex items-center justify-center font-bold">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#111827]">
                  1. Organization Profile & Metadata
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Multi-tenant isolation keys, billing identity, and operational domain.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Organization Name */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Legal Organization Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('name')}
                  placeholder="e.g. Acme Global Technologies Inc."
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-all"
                />
                {errors.name && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Organization Code / Slug */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#374151]">
                    Organization Routing Code <span className="text-rose-500">*</span>
                  </label>
                  {isEditMode && (
                    <span className="text-[10px] font-mono text-[#6B7280] flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Immutable
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  {...register('code')}
                  disabled={isEditMode}
                  placeholder="e.g. ACME-GLOBAL"
                  className={`w-full h-10 px-3.5 text-xs rounded-xl border font-mono uppercase transition-all ${
                    isEditMode
                      ? 'bg-slate-100 border-[#E5E7EB] text-[#6B7280] cursor-not-allowed'
                      : 'bg-white border-[#E5E7EB] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A]'
                  }`}
                />
                {watchedCode && (
                  <p className="text-[11px] text-[#6B7280] mt-1 font-mono">
                    Isolation Slug:{' '}
                    <span className="text-[#0F172A] font-semibold">
                      org_{watchedCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}
                    </span>
                  </p>
                )}
                {errors.code && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.code.message}</p>
                )}
              </div>

              {/* Domain / Website */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Custom Domain / Hostname
                </label>
                <input
                  type="text"
                  {...register('domain')}
                  placeholder="e.g. acmeglobal.com"
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-all"
                />
                {errors.domain && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.domain.message}</p>
                )}
              </div>

              {/* Industry Sector (Dropdown WITHOUT search) */}
              <Controller
                name="industry"
                control={control}
                render={({ field }) => (
                  <CustomSelect
                    label="Industry Sector"
                    value={field.value || 'Technology & Software'}
                    onChange={field.onChange}
                    options={[
                      { value: 'Technology & Software', label: 'Technology & Software' },
                      { value: 'Financial Services & Banking', label: 'Financial Services & Banking' },
                      { value: 'Healthcare & Life Sciences', label: 'Healthcare & Life Sciences' },
                      { value: 'Manufacturing & Logistics', label: 'Manufacturing & Logistics' },
                      { value: 'Retail & E-commerce', label: 'Retail & E-commerce' },
                      { value: 'Hospitality & Services', label: 'Hospitality & Services' },
                    ]}
                  />
                )}
              />

              {/* Subscription Tier (Dropdown WITHOUT search) */}
              <Controller
                name="planTier"
                control={control}
                render={({ field }) => (
                  <CustomSelect
                    label="Subscription Tier"
                    value={field.value || 'Enterprise'}
                    onChange={field.onChange}
                    options={[
                      { value: 'Enterprise', label: 'Enterprise', description: 'Full capabilities & custom modules' },
                      { value: 'Standard', label: 'Standard', description: 'Automated payroll & leaves' },
                      { value: 'Starter', label: 'Starter', description: 'Core department & staff directory' },
                    ]}
                  />
                )}
              />

              {/* Status (Dropdown WITHOUT search) */}
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <CustomSelect
                    label="Organization Status"
                    value={field.value || 'Active'}
                    onChange={field.onChange}
                    options={[
                      { value: 'Active', label: 'Active', description: 'Operational & Accessible' },
                      { value: 'Onboarding', label: 'Onboarding', description: 'Setup in progress' },
                      { value: 'Suspended', label: 'Suspended', description: 'Access blocked' },
                    ]}
                  />
                )}
              />

              {/* Start Date & Time and End Date & Time */}
              <div className="md:col-span-2 pt-3 border-t border-[#F3F4F6]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Date and Time */}
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      Start Date and Time
                    </label>
                    <input
                      type="datetime-local"
                      {...register('startDate')}
                      className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-all"
                    />
                    <p className="text-[11px] text-[#6B7280] mt-1">
                      Organization activation timestamp (optional).
                    </p>
                  </div>

                  {/* End Date and Time */}
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      End Date and Time
                    </label>
                    <input
                      type="datetime-local"
                      {...register('endDate')}
                      className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-all"
                    />
                    <p className="text-[11px] text-[#6B7280] mt-1">
                      Access expiration cutoff. Leave blank for SuperAdmin / lifetime access (no time bomb).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CARD 2: ROOT ORGANIZATION ADMINISTRATOR */}
          <section className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#111827]">
                    2. Root Organization Administrator
                  </h2>
                  <p className="text-xs text-[#6B7280]">
                    Assign a new administrator or search an existing system user.
                  </p>
                </div>
              </div>

              {/* Mode Switcher: New vs Existing */}
              <div className="flex items-center h-9 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setAdminMode('new')}
                  className={`h-7 px-3 rounded-lg text-xs font-semibold transition-all ${
                    adminMode === 'new'
                      ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  New User
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdminMode('existing');
                    handleSelectCandidateUser(selectedCandidateEmail || SYSTEM_ADMIN_CANDIDATES[0].value);
                  }}
                  className={`h-7 px-3 rounded-lg text-xs font-semibold transition-all ${
                    adminMode === 'existing'
                      ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Existing User
                </button>
              </div>
            </div>

            {/* Dropdown WITH Search (Searchable Combobox) */}
            {adminMode === 'existing' && (
              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200/70 space-y-3">
                <SearchableSelect
                  label="Select Existing User to Assign as Administrator (Dropdown WITH Search)"
                  value={selectedCandidateEmail}
                  onChange={handleSelectCandidateUser}
                  options={SYSTEM_ADMIN_CANDIDATES}
                  placeholder="Search user by name, email, or role..."
                  searchPlaceholder="Search by name, email, or role..."
                />
                <div className="text-[11px] text-purple-800 font-medium flex items-center gap-1.5 pt-2 border-t border-purple-200/60">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                  <span>The selected user profile will be automatically scoped as Organization Administrator.</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Admin Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Administrator Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('admin.fullName')}
                  placeholder="e.g. Alexander Vance"
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-all"
                />
                {errors.admin?.fullName && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    {errors.admin.fullName.message}
                  </p>
                )}
              </div>

              {/* Admin Email */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Administrator Email (Sign-in ID) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  {...register('admin.email')}
                  placeholder="e.g. admin@acmeglobal.com"
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-all"
                />
                {errors.admin?.email && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    {errors.admin.email.message}
                  </p>
                )}
              </div>

              {/* Temporary Password (Create Mode only) */}
              {!isEditMode && (
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Initial Secure Password (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('admin.password')}
                      placeholder="Auto-generated if left blank"
                      className="w-full h-10 pl-3.5 pr-10 text-xs font-mono rounded-xl border border-[#E5E7EB] bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-[#F8FAFC] flex items-center justify-center transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* CARD 3: MODULE ALLOCATIONS & ENTITLEMENTS */}
          <section className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB]">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#111827]">
                  3. Enterprise Module Allocation & Entitlements
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Configure active modules for this organization. Departments within this organization can only inherit from allocated modules.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ORGANIZATION_MODULES.map((mod) => {
                const isChecked = selectedModules.includes(mod.code);
                const isLocked = Boolean(mod.isLockedCore);

                return (
                  <div
                    key={mod.code}
                    onClick={() => {
                      if (!isLocked) handleToggleModule(mod.code);
                    }}
                    className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                      isChecked
                        ? 'bg-[#FBFBFC] border-[#0F172A]/30 shadow-2xs'
                        : 'bg-white border-[#E5E7EB] hover:border-slate-300'
                    } ${isLocked ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isLocked}
                      onChange={() => handleToggleModule(mod.code)}
                      className="mt-0.5 rounded border-[#D1D5DB] text-[#0F172A] focus:ring-[#0F172A]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#111827]">
                          {mod.name}
                        </span>
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-[#F1F5F9] text-[#475569] border border-[#E5E7EB]">
                            <Lock className="w-2.5 h-2.5" /> Core
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Add-on
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#6B7280] mt-1 leading-normal">
                        {mod.description}
                      </p>
                      {mod.code === 'PayrollProcessing' && isChecked && (
                        <p className="text-[10px] text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Auto-requires Department Hierarchy & Base RBAC</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Bottom Action Footer */}
          <div className="p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleBack}
              className="h-9 px-4 rounded-lg border border-[#E5E7EB] bg-white text-xs font-semibold text-[#475569] hover:text-[#111827] hover:bg-[#F8FAFC] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs focus:ring-2 focus:ring-[#0F172A]/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isEditMode ? 'Update' : 'Save'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrganizationFormPage;
