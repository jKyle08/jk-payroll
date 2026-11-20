// ==============================================================================
// JK-PAYROLL: ORGANIZATION SETTINGS / EDIT FORM
// Target Audience: Existing tenant administrators updating company profile & policies
// Structured into 4 logical sub-tabs: General, Statutory, Attendance, and Payroll
// Design System: "Midnight & Champagne Steel"
// File: src/features/organizations/components/OrganizationSettingsForm.tsx
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  FileText,
  Clock,
  Coins,
  Shield,
  ShieldCheck,
  Lock,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  Laptop,
  MapPin,
  Save,
  Globe,
  Sliders,
} from 'lucide-react';
import { Badge, Button, StatusIndicator } from '../../../client/components/ui/index.js';
import { CustomSelect } from '../../../client/components/ui/index.js';
import {
  updateOrganizationSettingsSchema,
  UpdateOrganizationSettingsInput,
  UpdateOrganizationSettingsFormInput,
} from '../organization.schema.js';
import {
  Organization,
  OrganizationSector,
  PayFrequency,
  WorkMode,
  ProrationMethod,
  StatutoryDeductionSplit,
  DEFAULT_ORGANIZATION_SETTINGS,
} from '../types.js';
import { useOrganizationMutations } from '../hooks/useOrganizationMutations.js';

export interface OrganizationSettingsFormProps {
  organization: Organization;
  onSuccess?: (updated: Organization) => void;
}

type SettingsTab = 'general' | 'statutory' | 'attendance' | 'payroll';

const PAY_FREQUENCY_OPTIONS: { value: PayFrequency; label: string }[] = [
  { value: 'Semi-Monthly', label: 'Semi-Monthly (15th / End of Month - Default)' },
  { value: 'Monthly', label: 'Monthly (End of Month)' },
  { value: 'Bi-Weekly', label: 'Bi-Weekly (Every 2 Weeks)' },
  { value: 'Weekly', label: 'Weekly (Every 7 Days)' },
];

const CURRENCY_OPTIONS = [
  { value: 'PHP', label: 'PHP - Philippine Peso (₱)' },
  { value: 'USD', label: 'USD - United States Dollar ($)' },
  { value: 'SGD', label: 'SGD - Singapore Dollar (S$)' },
  { value: 'EUR', label: 'EUR - Euro (€)' },
  { value: 'GBP', label: 'GBP - British Pound (£)' },
  { value: 'AUD', label: 'AUD - Australian Dollar (A$)' },
  { value: 'CAD', label: 'CAD - Canadian Dollar (C$)' },
  { value: 'JPY', label: 'JPY - Japanese Yen (¥)' },
];

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Manila', label: 'Asia/Manila (GMT+8 - Manila, Singapore, Taipei)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT - New York)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT - Los Angeles)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST - Tokyo)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST - Dubai)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST - London)' },
];

const SECTOR_OPTIONS: { value: OrganizationSector; label: string }[] = [
  { value: 'Private', label: 'Private Sector (Corporate / Commercial / DOLE)' },
  { value: 'Public', label: 'Public Sector (Government / LGU / GSIS)' },
  { value: 'NonProfit', label: 'Non-Profit / NGO (Tax-Exempt / Grants)' },
];

const PRORATION_OPTIONS: { value: ProrationMethod; label: string }[] = [
  { value: 'WorkingDays', label: 'Working Days Only (Excludes Weekends & Holidays)' },
  { value: 'CalendarDays', label: 'Calendar Days (Actual Days in Pay Period)' },
  { value: 'FixedHours', label: 'Fixed Base Hours Ratio' },
];

const DEDUCTION_SPLIT_OPTIONS: { value: StatutoryDeductionSplit; label: string }[] = [
  { value: 'SplitEqually', label: 'Split Equally Across Both Pay Periods' },
  { value: 'FirstPeriodOnly', label: 'Deduct Entire Amount in 1st Period' },
  { value: 'SecondPeriodOnly', label: 'Deduct Entire Amount in 2nd Period' },
];

export const OrganizationSettingsForm: React.FC<OrganizationSettingsFormProps> = ({
  organization,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const { updateOrgSettings, isSubmitting, mutationError, clearError } = useOrganizationMutations();

  const currentSettings = organization.settings || DEFAULT_ORGANIZATION_SETTINGS;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateOrganizationSettingsFormInput, any, UpdateOrganizationSettingsInput>({
    resolver: zodResolver(updateOrganizationSettingsSchema) as any,
    defaultValues: {
      name: organization.name,
      legalName: organization.legalName || '',
      taxId: organization.taxId || '',
      industry: organization.industry || 'Technology & Software',
      sector: organization.sector || 'Private',
      currency: organization.currency || 'PHP',
      timezone: organization.timezone || 'Asia/Manila',
      domain: organization.domain || '',
      logoUrl: organization.logoUrl || '',
      supportedWorkModes: organization.supportedWorkModes || ['OnSite', 'Remote', 'Hybrid'],
      defaultPayFrequency: organization.defaultPayFrequency || 'Semi-Monthly',
      statutoryIds: organization.statutoryIds || {},
      settings: currentSettings,
    },
  });

  // Re-sync default values when organization changes
  useEffect(() => {
    if (organization) {
      reset({
        name: organization.name,
        legalName: organization.legalName || '',
        taxId: organization.taxId || '',
        industry: organization.industry || 'Technology & Software',
        sector: organization.sector || 'Private',
        currency: organization.currency || 'PHP',
        timezone: organization.timezone || 'Asia/Manila',
        domain: organization.domain || '',
        logoUrl: organization.logoUrl || '',
        supportedWorkModes: organization.supportedWorkModes || ['OnSite', 'Remote', 'Hybrid'],
        defaultPayFrequency: organization.defaultPayFrequency || 'Semi-Monthly',
        statutoryIds: organization.statutoryIds || {},
        settings: organization.settings || DEFAULT_ORGANIZATION_SETTINGS,
      });
    }
  }, [organization, reset]);

  const watchedWorkModes = (watch('supportedWorkModes') as WorkMode[]) || [];

  const handleWorkModeToggle = (mode: WorkMode) => {
    const isSelected = watchedWorkModes.includes(mode);
    let nextModes: WorkMode[];
    if (isSelected) {
      if (watchedWorkModes.length === 1) return; // Prevent unchecking all
      nextModes = watchedWorkModes.filter((m) => m !== mode);
    } else {
      nextModes = [...watchedWorkModes, mode];
    }
    setValue('supportedWorkModes', nextModes, { shouldDirty: true });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const onSubmit = async (data: UpdateOrganizationSettingsInput) => {
    clearError();
    setSaveSuccess(null);
    try {
      const updated = await updateOrgSettings(organization.id, data);
      setSaveSuccess('Company profile and operational settings updated successfully.');
      if (onSuccess) {
        onSuccess(updated);
      }
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch {
      // Handled by hook
    }
  };

  const isPublicSector = organization.sector === 'Public';

  return (
    <div className="w-full space-y-6">
      {/* Workspace Onboarding Status Alert Banner */}
      {organization.status === 'Onboarding' && (
        <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Workspace Setup in Progress (Restricted Access Mode)
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-200/60 dark:bg-amber-900 text-amber-800 dark:text-amber-300">
                  Onboarding Mode
                </span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-1 leading-relaxed max-w-3xl">
                This workspace is currently undergoing initial setup. You have permissions to configure your <strong>Company Profile</strong>, <strong>Statutory Agency IDs</strong> (TIN, SSS/GSIS, PhilHealth, Pag-IBIG), <strong>Work Modalities</strong>, and <strong>Payroll Policies</strong>. Live payroll computation and payouts unlock once approved.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Header & Protected Identifiers Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB] dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#0F172A] text-white flex items-center justify-center font-bold text-lg shadow-xs">
              {organization.logoUrl ? (
                <img
                  src={organization.logoUrl}
                  alt={organization.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                organization.name.substring(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-base font-bold text-[#111827] dark:text-white">
                  {organization.name}
                </h1>
                <StatusIndicator status={organization.status} />
                <Badge variant="neutral" size="sm">
                  {organization.sector} Sector
                </Badge>
              </div>
              <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
                {organization.industry} • Plan: {organization.tier || organization.planTier}
              </p>
            </div>
          </div>

          {/* Immutable Tenant Identifiers */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-[#374151] dark:text-slate-300">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-[#6B7280]">Code:</span>
              <span className="font-mono font-bold">{organization.code}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(organization.code, 'code')}
                className="text-slate-400 hover:text-slate-600 ml-1"
                title="Copy Code"
              >
                {copiedField === 'code' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-[#374151] dark:text-slate-300">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-[#6B7280]">Slug:</span>
              <span className="font-mono font-medium">/{organization.slug}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 pt-4 border-t border-transparent overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'general'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-[#6B7280] hover:text-[#111827] hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            General Info
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('statutory')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'statutory'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-[#6B7280] hover:text-[#111827] hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Statutory & Tax
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'attendance'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-[#6B7280] hover:text-[#111827] hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Work & Attendance
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payroll')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'payroll'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-[#6B7280] hover:text-[#111827] hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Payroll & Divisors
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {mutationError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{mutationError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* TAB 1: GENERAL INFO */}
        {activeTab === 'general' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-bold text-[#111827] dark:text-white">Company Profile & Branding</h2>
              <p className="text-xs text-[#6B7280] dark:text-slate-400">
                Primary company brand name, legal corporate registration, and digital presence.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1">
                  Organization Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('name')}
                  placeholder="e.g. Apex Technologies Inc."
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                />
                {errors.name && <p className="text-[11px] text-rose-600 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1">
                  Operating Sector
                </label>
                <Controller
                  name="sector"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={SECTOR_OPTIONS}
                      className="w-full"
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1">
                  Registered Legal Name
                </label>
                <input
                  type="text"
                  {...register('legalName')}
                  placeholder="e.g. Apex Global Technologies Holdings, Inc."
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1">
                  Industry Classification
                </label>
                <input
                  type="text"
                  {...register('industry')}
                  placeholder="e.g. Technology & Software"
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1">
                  Corporate Email Domain
                </label>
                <input
                  type="text"
                  {...register('domain')}
                  placeholder="e.g. apex.com"
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1">
                  Company Logo URL
                </label>
                <input
                  type="url"
                  {...register('logoUrl')}
                  placeholder="https://company.cdn/logo.png"
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STATUTORY & TAX */}
        {activeTab === 'statutory' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-bold text-[#111827] dark:text-white">Statutory Agency & Tax Identifiers</h2>
              <p className="text-xs text-[#6B7280] dark:text-slate-400">
                Official employer registration numbers for automatic statutory contribution filings.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* TIN / Tax ID */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1">
                  Tax Identification Number (TIN)
                </label>
                <input
                  type="text"
                  {...register('statutoryIds.tin')}
                  placeholder="000-000-000-000"
                  className="w-full h-10 px-3.5 text-xs font-mono rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                />
              </div>

              {/* Conditional SSS vs GSIS */}
              {isPublicSector ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300">
                      GSIS Agency Code (Government)
                    </label>
                    <Badge variant="neutral" size="sm">
                      Public Sector
                    </Badge>
                  </div>
                  <input
                    type="text"
                    {...register('statutoryIds.gsis')}
                    placeholder="e.g. GSIS-10293847"
                    className="w-full h-10 px-3.5 text-xs font-mono rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                  />
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300">
                      SSS Employer Number
                    </label>
                    <Badge variant="neutral" size="sm">
                      Private / NonProfit
                    </Badge>
                  </div>
                  <input
                    type="text"
                    {...register('statutoryIds.sss')}
                    placeholder="00-0000000-0"
                    className="w-full h-10 px-3.5 text-xs font-mono rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                  />
                </div>
              )}

              {/* PhilHealth */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1">
                  PhilHealth Employer Number (PEN)
                </label>
                <input
                  type="text"
                  {...register('statutoryIds.philhealth')}
                  placeholder="00-000000000-0"
                  className="w-full h-10 px-3.5 text-xs font-mono rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                />
              </div>

              {/* Pag-IBIG */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1">
                  Pag-IBIG Employer ID (HDMF)
                </label>
                <input
                  type="text"
                  {...register('statutoryIds.pagibig')}
                  placeholder="0000-0000-0000"
                  className="w-full h-10 px-3.5 text-xs font-mono rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WORK & ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-bold text-[#111827] dark:text-white">Work Modalities & Attendance Policies</h2>
              <p className="text-xs text-[#6B7280] dark:text-slate-400">
                Authorized workplace modes, clock-in rules, and geofence enforcement thresholds.
              </p>
            </div>

            {/* Work Modalities Checkboxes */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-2">
                Supported Work Modalities
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['OnSite', 'Remote', 'Hybrid'] as WorkMode[]).map((mode) => {
                  const isChecked = watchedWorkModes.includes(mode);
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleWorkModeToggle(mode)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                        isChecked
                          ? 'border-[#0F172A] bg-slate-50 dark:bg-slate-800/80 text-[#0F172A] dark:text-white'
                          : 'border-[#E5E7EB] dark:border-slate-700 text-[#6B7280] hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          isChecked
                            ? 'bg-[#0F172A] border-[#0F172A] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{mode === 'OnSite' ? 'On-Site' : mode}</p>
                        <p className="text-[10px] text-[#6B7280] dark:text-slate-400">
                          {mode === 'OnSite' && 'Physical Office'}
                          {mode === 'Remote' && 'Work From Home (WFH)'}
                          {mode === 'Hybrid' && 'Split Schedule'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1">
                  Operating Timezone
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

              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1">
                  Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  {...register('settings.timeAndAttendance.gracePeriodMinutes', { valueAsNumber: true })}
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1">
                  Overtime Minimum Threshold (Minutes)
                </label>
                <input
                  type="number"
                  {...register('settings.timeAndAttendance.overtimeMinimumMinutes', { valueAsNumber: true })}
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                />
              </div>

              {/* Toggles */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="text-xs font-semibold text-[#111827] dark:text-white">Allow Web Clock-In</p>
                  <p className="text-[10px] text-[#6B7280]">Permit employees to time-in from web browser</p>
                </div>
                <input
                  type="checkbox"
                  {...register('settings.timeAndAttendance.allowWebClockIn')}
                  className="w-4 h-4 text-[#0F172A] rounded border-slate-300 focus:ring-0"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="text-xs font-semibold text-[#111827] dark:text-white">Enforce Geofencing</p>
                  <p className="text-[10px] text-[#6B7280]">Require GPS coordinates within branch radius</p>
                </div>
                <input
                  type="checkbox"
                  {...register('settings.timeAndAttendance.requireGeofence')}
                  className="w-4 h-4 text-[#0F172A] rounded border-slate-300 focus:ring-0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1">
                  Geofence Radius (Meters)
                </label>
                <input
                  type="number"
                  {...register('settings.timeAndAttendance.geofenceRadiusMeters', { valueAsNumber: true })}
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PAYROLL & DIVISORS */}
        {activeTab === 'payroll' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-bold text-[#111827] dark:text-white">Payroll Calculation Rules & Security</h2>
              <p className="text-xs text-[#6B7280] dark:text-slate-400">
                Statutory divisors, proration formulas, deduction splits, and payslip security.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1">
                  Base Currency
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

              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1">
                  Default Pay Frequency
                </label>
                <Controller
                  name="defaultPayFrequency"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={PAY_FREQUENCY_OPTIONS}
                      className="w-full"
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1">
                  Annual Working Days Divisor
                </label>
                <input
                  type="number"
                  {...register('settings.payroll.standardWorkingDaysPerYear', { valueAsNumber: true })}
                  placeholder="261 or 313"
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                />
                <p className="text-[10px] text-[#6B7280] mt-1">261 days (Mon-Fri) or 313 days (Mon-Sat).</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1">
                  Standard Daily Hours
                </label>
                <input
                  type="number"
                  {...register('settings.payroll.standardDailyHours', { valueAsNumber: true })}
                  defaultValue={8}
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1">
                  Proration Method
                </label>
                <Controller
                  name="settings.payroll.prorationMethod"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={PRORATION_OPTIONS}
                      className="w-full"
                    />
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1">
                  Statutory Deductions Split Rule
                </label>
                <Controller
                  name="settings.payroll.statutoryDeductionSplit"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={DEDUCTION_SPLIT_OPTIONS}
                      className="w-full"
                    />
                  )}
                />
              </div>

              {/* Security Toggles */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="text-xs font-semibold text-[#111827] dark:text-white">Protect Payslip with Password</p>
                  <p className="text-[10px] text-[#6B7280]">Requires PIN / birthdate to open exported PDF</p>
                </div>
                <input
                  type="checkbox"
                  {...register('settings.security.protectPayslipWithPassword')}
                  className="w-4 h-4 text-[#0F172A] rounded border-slate-300 focus:ring-0"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="text-xs font-semibold text-[#111827] dark:text-white">Enforce Two-Factor Auth (2FA)</p>
                  <p className="text-[10px] text-[#6B7280]">Mandatory 2FA verification for all tenant staff</p>
                </div>
                <input
                  type="checkbox"
                  {...register('settings.security.enforce2FA')}
                  className="w-4 h-4 text-[#0F172A] rounded border-slate-300 focus:ring-0"
                />
              </div>
            </div>
          </div>
        )}

        {/* SUBMIT BUTTON BAR */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB] dark:border-slate-800">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {isSubmitting ? 'Saving Changes...' : 'Save Organization Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default OrganizationSettingsForm;

