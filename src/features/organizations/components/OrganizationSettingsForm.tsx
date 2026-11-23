// ==============================================================================
// JK-PAYROLL: COMPLETE ORGANIZATION SETTINGS & EDIT FORM REDESIGN
// Design System: Balanced Glossy Graphite (Premium International Enterprise SaaS)
// File: src/features/organizations/components/OrganizationSettingsForm.tsx
// ==============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Calendar,
  Loader2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Copy,
  Check,
  MapPin,
  Save,
  Globe,
  Sliders,
  Plus,
  Trash2,
  Landmark,
  ChevronRight,
  Info,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  Badge,
  Button,
  StatusIndicator,
  CustomSelect,
  ConfirmDialog,
  toast,
} from '../../../client/components/ui/index.js';
import {
  updateOrganizationSettingsSchema,
  UpdateOrganizationSettingsInput,
} from '../organization.schema.js';
import {
  Organization,
  OrganizationSector,
  OrganizationTier,
  OrganizationStatus,
  PayFrequency,
  WorkMode,
  ProrationMethod,
  StatutoryDeductionSplit,
  DEFAULT_ORGANIZATION_SETTINGS,
  Country,
  StatutoryIdentifierDefinition,
  OrganizationLegalEntity,
  OrganizationStatutoryRegistration,
} from '../types.js';
import { useOrganizationMutations } from '../hooks/useOrganizationMutations.js';
import {
  fetchCountries,
  fetchStatutoryDefinitions,
  fetchLegalEntities,
  createLegalEntity,
  updateLegalEntity,
  saveStatutoryRegistration,
  fetchStatutoryRegistrations,
  updateOrganization,
} from '../services/client.js';
import { useAuth } from '../../auth/hooks/use-auth.js';

export interface OrganizationSettingsFormProps {
  organization: Organization;
  onSuccess?: (updated: Organization) => void;
}

export type SettingsSection =
  | 'general'
  | 'legal-entities'
  | 'statutory'
  | 'attendance'
  | 'payroll'
  | 'leaves'
  | 'security'
  | 'superadmin';

// Static Configuration Constants
const SECTOR_OPTIONS: { value: OrganizationSector; label: string }[] = [
  { value: 'Private', label: 'Private Sector (Corporate / Commercial / DOLE)' },
  { value: 'Public', label: 'Public Sector (Government / LGU / GSIS)' },
  { value: 'NonProfit', label: 'Non-Profit / NGO (Tax-Exempt / Grants)' },
];

const PAY_FREQUENCY_OPTIONS: { value: PayFrequency; label: string }[] = [
  { value: 'Semi-Monthly', label: 'Semi-Monthly (15th / End of Month — Default)' },
  { value: 'Monthly', label: 'Monthly (End of Month)' },
  { value: 'Bi-Weekly', label: 'Bi-Weekly (Every 2 Weeks)' },
  { value: 'Weekly', label: 'Weekly (Every 7 Days)' },
];

const CURRENCY_OPTIONS = [
  { value: 'PHP', label: 'PHP — Philippine Peso (₱)' },
  { value: 'USD', label: 'USD — United States Dollar ($)' },
  { value: 'SGD', label: 'SGD — Singapore Dollar (S$)' },
  { value: 'EUR', label: 'EUR — Euro (€)' },
  { value: 'GBP', label: 'GBP — British Pound (£)' },
  { value: 'AUD', label: 'AUD — Australian Dollar (A$)' },
  { value: 'CAD', label: 'CAD — Canadian Dollar (C$)' },
  { value: 'JPY', label: 'JPY — Japanese Yen (¥)' },
];

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Manila', label: 'Asia/Manila (GMT+8 — Manila, Singapore, Taipei)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT — New York)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT — Los Angeles)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST — Tokyo)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST — Dubai)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST — London)' },
];

const PRORATION_OPTIONS: { value: ProrationMethod; label: string }[] = [
  { value: 'WorkingDays', label: 'Working Days Only (Standard: Excludes Weekends & Holidays)' },
  { value: 'CalendarDays', label: 'Calendar Days (Actual Days in Pay Period)' },
  { value: 'FixedHours', label: 'Fixed Base Hours Ratio' },
];

const DEDUCTION_SPLIT_OPTIONS: { value: StatutoryDeductionSplit; label: string }[] = [
  { value: 'SplitEqually', label: 'Split Equally Across Both Pay Periods' },
  { value: 'FirstPeriodOnly', label: 'Deduct Entire Amount in 1st Period' },
  { value: 'SecondPeriodOnly', label: 'Deduct Entire Amount in 2nd Period' },
];

const PASSWORD_FORMAT_OPTIONS = [
  { value: 'BIRTHDATE_YYYYMMDD', label: 'Employee Birthdate (YYYYMMDD)' },
  { value: 'EMPLOYEE_ID_LAST4', label: 'Last 4 Digits of Employee ID' },
  { value: 'CUSTOM_PIN', label: 'Custom Employee Security PIN' },
];

const TIER_OPTIONS: { value: OrganizationTier; label: string }[] = [
  { value: 'Enterprise', label: 'Enterprise (Full Suite & Dedicated SLA)' },
  { value: 'Standard', label: 'Standard (Multi-Departmental Payroll & HR)' },
  { value: 'Starter', label: 'Starter (Basic Payroll Processing)' },
];

const STATUS_OPTIONS: { value: OrganizationStatus; label: string }[] = [
  { value: 'Active', label: 'Active (Operational Workspace)' },
  { value: 'Onboarding', label: 'Onboarding (Setup Mode)' },
  { value: 'Suspended', label: 'Suspended (Locked Out)' },
];

const ALL_MODULES = [
  { code: 'Department', name: 'Department Hierarchy', locked: true },
  { code: 'EmployeeProfile', name: 'Staff & Personnel Directory', locked: true },
  { code: 'RolePermission', name: 'Base RBAC & Scoping', locked: true },
  { code: 'PayrollComputation', name: 'Payroll Computation Engine', locked: false },
  { code: 'TypeOfLeave', name: 'Leave Policy Management', locked: false },
  { code: 'RequestForLeave', name: 'Leave Application & Approvals', locked: false },
];

export const OrganizationSettingsForm: React.FC<OrganizationSettingsFormProps> = ({
  organization,
  onSuccess,
}) => {
  const { user } = useAuth();
  const isSuperAdmin = Boolean(
    user?.isSuperAdmin ||
    user?.effectivePermissions?.includes('*') ||
    user?.effectivePermissions?.includes('SUPER_ADMIN')
  );

  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // International Jurisdictions & Legal Entities State
  const [countries, setCountries] = useState<Country[]>([]);
  const [legalEntities, setLegalEntities] = useState<OrganizationLegalEntity[]>([]);
  const [primaryLegalEntity, setPrimaryLegalEntity] = useState<OrganizationLegalEntity | null>(null);
  const [definitions, setDefinitions] = useState<StatutoryIdentifierDefinition[]>([]);
  const [registrations, setRegistrations] = useState<OrganizationStatutoryRegistration[]>([]);
  const [isLoadingRefData, setIsLoadingRefData] = useState(false);

  // New Registration Modal / Field States
  const [activeRegEdits, setActiveRegEdits] = useState<Record<string, string>>({});
  const [showCountryChangeWarning, setShowCountryChangeWarning] = useState(false);
  const [pendingCountryCode, setPendingCountryCode] = useState<string | null>(null);

  // SuperAdmin Platform State
  const [adminTier, setAdminTier] = useState<OrganizationTier>(
    organization.tier || organization.planTier || 'Enterprise'
  );
  const [adminStatus, setAdminStatus] = useState<OrganizationStatus>(
    organization.status || 'Active'
  );
  const [adminModules, setAdminModules] = useState<string[]>(
    organization.modules || ['Department', 'EmployeeProfile', 'RolePermission']
  );
  const [adminStartDate, setAdminStartDate] = useState<string>(
    organization.startDate ? organization.startDate.slice(0, 16) : ''
  );
  const [adminEndDate, setAdminEndDate] = useState<string>(
    organization.endDate ? organization.endDate.slice(0, 16) : ''
  );

  const { updateOrgSettings, isSubmitting } = useOrganizationMutations();

  const currentSettings = organization.settings || DEFAULT_ORGANIZATION_SETTINGS;

  // React Hook Form initialization
  const defaultValues: UpdateOrganizationSettingsInput = useMemo(
    () => ({
      name: organization.name,
      legalName: organization.legalName || '',
      taxId: organization.taxId || '',
      industry: organization.industry || 'Technology & Software',
      sector: organization.sector || 'Private',
      domain: organization.domain || '',
      logoUrl: organization.logoUrl || '',
      countryCode: organization.countryCode || 'PH',
      currency: organization.currency || 'PHP',
      timezone: organization.timezone || 'Asia/Manila',
      defaultPayFrequency: organization.defaultPayFrequency || 'Semi-Monthly',
      supportedWorkModes: organization.supportedWorkModes || ['OnSite', 'Remote', 'Hybrid'],
      statutoryIds: organization.statutoryIds || {},
      settings: {
        payroll: {
          standardDailyHours: currentSettings.payroll?.standardDailyHours ?? 8,
          standardWorkingDaysPerYear: currentSettings.payroll?.standardWorkingDaysPerYear ?? 261,
          prorationMethod: currentSettings.payroll?.prorationMethod ?? 'WorkingDays',
          statutoryDeductionSplit: currentSettings.payroll?.statutoryDeductionSplit ?? 'SplitEqually',
        },
        timeAndAttendance: {
          gracePeriodMinutes: currentSettings.timeAndAttendance?.gracePeriodMinutes ?? 15,
          overtimeMinimumMinutes: currentSettings.timeAndAttendance?.overtimeMinimumMinutes ?? 60,
          allowWebClockIn: currentSettings.timeAndAttendance?.allowWebClockIn ?? true,
          requireGeofence: currentSettings.timeAndAttendance?.requireGeofence ?? false,
          geofenceRadiusMeters: currentSettings.timeAndAttendance?.geofenceRadiusMeters ?? 100,
        },
        leaves: {
          allowNegativeBalance: currentSettings.leaves?.allowNegativeBalance ?? false,
          requireApprovalLevels: currentSettings.leaves?.requireApprovalLevels ?? 1,
          carryOverLimitDays: currentSettings.leaves?.carryOverLimitDays ?? 5,
        },
        security: {
          enforce2FA: currentSettings.security?.enforce2FA ?? false,
          protectPayslipWithPassword: currentSettings.security?.protectPayslipWithPassword ?? true,
          payslipPasswordFormat: currentSettings.security?.payslipPasswordFormat ?? 'BIRTHDATE_YYYYMMDD',
        },
      },
    }),
    [organization, currentSettings]
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateOrganizationSettingsInput>({
    resolver: zodResolver(updateOrganizationSettingsSchema) as any,
    defaultValues,
    mode: 'onChange',
  });

  const watchedSector = watch('sector');
  const watchedWorkModes = watch('supportedWorkModes') || [];
  const watchedGeofence = watch('settings.timeAndAttendance.requireGeofence');
  const watchedCountryCode = watch('countryCode') || 'PH';

  // Load Reference Data (Countries, Legal Entities, Definitions)
  const loadReferenceData = useCallback(async () => {
    setIsLoadingRefData(true);
    try {
      const [countriesList, entitiesList] = await Promise.all([
        fetchCountries().catch(() => [
          { code: 'PH', name: 'Philippines', isActive: true },
          { code: 'US', name: 'United States', isActive: true },
          { code: 'SG', name: 'Singapore', isActive: true },
        ]),
        fetchLegalEntities(organization.id).catch(() => []),
      ]);

      setCountries(countriesList);
      setLegalEntities(entitiesList);

      const primary = entitiesList.find((e) => e.isPrimary) || entitiesList[0] || null;
      setPrimaryLegalEntity(primary);

      const activeCountry = primary?.countryCode || organization.countryCode || 'PH';
      const defs = await fetchStatutoryDefinitions(activeCountry).catch(() => []);
      setDefinitions(defs);

      if (primary) {
        const regs = await fetchStatutoryRegistrations(organization.id, primary.id).catch(() => []);
        setRegistrations(regs);
      }
    } catch (err: any) {
      console.warn('Reference data load warning:', err);
    } finally {
      setIsLoadingRefData(false);
    }
  }, [organization.id, organization.countryCode]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  // Handle Country Change with Confirmation
  const handleCountrySelect = (newCountry: string) => {
    if (newCountry === watchedCountryCode) return;
    if (registrations.length > 0) {
      setPendingCountryCode(newCountry);
      setShowCountryChangeWarning(true);
    } else {
      applyCountryChange(newCountry);
    }
  };

  const applyCountryChange = async (code: string) => {
    setValue('countryCode', code, { shouldDirty: true });
    setShowCountryChangeWarning(false);
    setPendingCountryCode(null);
    try {
      const defs = await fetchStatutoryDefinitions(code);
      setDefinitions(defs);
    } catch (err) {
      console.warn('Failed to load definitions for country:', code);
    }
  };

  // Copy helper
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Toggle Work Mode Multi-Select
  const handleToggleWorkMode = (mode: WorkMode) => {
    const current = [...watchedWorkModes];
    const exists = current.includes(mode);
    if (exists && current.length === 1) {
      toast.warning('validation.failed', { reason: 'At least one work modality is required' });
      return;
    }
    const next = exists ? current.filter((m) => m !== mode) : [...current, mode];
    setValue('supportedWorkModes', next, { shouldDirty: true });
  };

  // Save Statutory Registration Inline
  const handleSaveStatutoryRegistration = async (defId: string, value: string) => {
    if (!primaryLegalEntity) {
      toast.error('validation.failed', { reason: 'No primary legal entity found' });
      return;
    }
    if (!value || value.trim() === '') return;

    try {
      await saveStatutoryRegistration(organization.id, primaryLegalEntity.id, {
        identifierDefinitionId: defId,
        value: value.trim(),
        countryCode: watchedCountryCode,
        registrationStatus: 'Active',
      });
      toast.success('statutory.saved', { name: organization.name });
      const updatedRegs = await fetchStatutoryRegistrations(organization.id, primaryLegalEntity.id);
      setRegistrations(updatedRegs);
      setActiveRegEdits((prev) => {
        const next = { ...prev };
        delete next[defId];
        return next;
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to save statutory identifier');
    }
  };

  // Discard all changes
  const handleDiscard = () => {
    reset(defaultValues);
    setAdminTier(organization.tier || organization.planTier || 'Enterprise');
    setAdminStatus(organization.status || 'Active');
    setAdminModules(organization.modules || ['Department', 'EmployeeProfile', 'RolePermission']);
    setActiveRegEdits({});
    toast.info('Changes discarded');
  };

  // Save changes
  const onSubmit = async (formData: UpdateOrganizationSettingsInput) => {
    try {
      // 1. Submit tenant configuration settings
      const updated = await updateOrgSettings(organization.id, formData);

      // 2. If SuperAdmin modified platform administrative properties, submit to administrative route
      if (isSuperAdmin) {
        const adminChanged =
          adminTier !== (organization.tier || organization.planTier) ||
          adminStatus !== organization.status ||
          JSON.stringify(adminModules.sort()) !== JSON.stringify((organization.modules || []).sort()) ||
          adminStartDate !== (organization.startDate ? organization.startDate.slice(0, 16) : '') ||
          adminEndDate !== (organization.endDate ? organization.endDate.slice(0, 16) : '');

        if (adminChanged) {
          await updateOrganization(organization.id, {
            tier: adminTier,
            planTier: adminTier,
            status: adminStatus,
            modules: adminModules,
            startDate: adminStartDate || null,
            endDate: adminEndDate || null,
          });
        }
      }

      toast.success('organization.updated', { name: formData.name || organization.name });
      reset(formData);
      if (onSuccess && updated) {
        onSuccess(updated);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save organization settings');
    }
  };

  // Initials for Monogram Fallback
  const initials =
    organization.name
      ?.split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'OR';

  // Navigation Items
  const navItems = [
    { id: 'general', label: 'General Information', icon: Building2 },
    { id: 'legal-entities', label: 'Legal Entities', icon: Landmark },
    { id: 'statutory', label: 'Statutory & Tax', icon: ShieldCheck },
    { id: 'attendance', label: 'Work & Attendance', icon: Clock },
    { id: 'payroll', label: 'Payroll & Divisors', icon: Coins },
    { id: 'leaves', label: 'Leave Management', icon: Calendar },
    { id: 'security', label: 'Security & Access', icon: Shield },
    ...(isSuperAdmin
      ? [{ id: 'superadmin', label: 'Platform Administration', icon: Sliders, badge: 'SuperAdmin' }]
      : []),
  ] as const;

  return (
    <div className="w-full space-y-6">
      {/* 1. ORGANIZATION IDENTITY HEADER */}
      <div className="bg-white dark:bg-[#181D2A] rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-xs dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)] relative before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {/* Logo / Monogram */}
            <div className="relative flex-shrink-0">
              {organization.logoUrl ? (
                <img
                  src={organization.logoUrl}
                  alt={organization.name}
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-white/10 shadow-xs"
                  onError={(e) => {
                    // Fallback to monogram if URL fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[#0F172A] dark:bg-[#121620] text-slate-100 dark:text-[#CBD5E1] border border-slate-700 dark:border-white/10 font-bold text-xl flex items-center justify-center shadow-md tracking-wider">
                  {initials}
                </div>
              )}
            </div>

            {/* Identity Text */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight truncate">
                  {organization.name}
                </h1>
                <StatusIndicator status={organization.status} />
                <Badge variant="neutral" size="sm">
                  {organization.sector} Sector
                </Badge>
                {isSuperAdmin && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Platform SuperAdmin View
                  </span>
                )}
              </div>

              {organization.legalName && (
                <p className="text-xs font-medium text-slate-500 dark:text-[#94A3B8] mt-0.5">
                  Legal Registration: {organization.legalName}
                </p>
              )}

              {/* Code & Slug Read-Only Identifiers */}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 dark:text-[#94A3B8]">
                <div className="flex items-center gap-1.5 font-mono text-[11px] bg-slate-50 dark:bg-[#121620] px-2 py-1 rounded-md border border-slate-200 dark:border-white/10">
                  <span className="text-slate-400 dark:text-[#64748B] font-sans">Code:</span>
                  <span className="font-semibold text-slate-800 dark:text-[#CBD5E1]">
                    {organization.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(organization.code, 'code')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-[#F8FAFC] transition-colors ml-1 cursor-pointer"
                    title="Copy code"
                  >
                    {copiedField === 'code' ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[11px] bg-slate-50 dark:bg-[#121620] px-2 py-1 rounded-md border border-slate-200 dark:border-white/10">
                  <span className="text-slate-400 dark:text-[#64748B] font-sans">Slug:</span>
                  <span className="font-semibold text-slate-800 dark:text-[#CBD5E1]">
                    {organization.slug || `org_${organization.code.toLowerCase()}`}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        organization.slug || `org_${organization.code.toLowerCase()}`,
                        'slug'
                      )
                    }
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-[#F8FAFC] transition-colors ml-1 cursor-pointer"
                    title="Copy slug"
                  >
                    {copiedField === 'slug' ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                <span className="dark:text-white/10">•</span>
                <span>Tier: {organization.tier || organization.planTier || 'Enterprise'}</span>
                <span className="dark:text-white/10">•</span>
                <span>{organization.domain || 'internal.workspace'}</span>
              </div>
            </div>
          </div>

          {/* Quick Context Summary */}
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-400 dark:text-[#64748B] block font-mono">Workspace ID</span>
            <span className="text-xs font-mono text-slate-600 dark:text-[#94A3B8] font-semibold truncate max-w-[180px] inline-block">
              {organization.id}
            </span>
          </div>
        </div>

        {/* Onboarding Notice */}
        {organization.status === 'Onboarding' && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Workspace In Onboarding Status:</span> Complete statutory,
              attendance, and payroll preferences below to activate full operational disbursements.
            </div>
          </div>
        )}
      </div>

      {/* 2. MAIN SETTINGS WORKSPACE (2-COLUMN ENTERPRISE LAYOUT) */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Vertical Settings Navigation (Left Column) */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-[#181D2A] rounded-2xl border border-slate-200 dark:border-white/10 p-2 space-y-1 shadow-xs sticky top-20">
              <div className="px-3 py-2 text-[11px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wider">
                Configuration Menu
              </div>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id as SettingsSection)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-[#CBD5E1] dark:text-[#0F172A] shadow-xs'
                        : 'text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-amber-300 dark:text-[#0F172A]' : 'text-slate-400 dark:text-[#64748B]'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {(item as any).badge && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono">
                        {(item as any).badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Settings Content Area (Right Column) */}
          <div className="lg:col-span-9 bg-white dark:bg-[#181D2A] rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-xs min-h-[520px]">
            {/* SECTION 1: GENERAL INFORMATION */}
            {activeSection === 'general' && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
                    General Information & Workspace Identity
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                    Manage the public workspace display identity, operating sector, and corporate communication domains.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                      Organization Display Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register('name')}
                      type="text"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-xs font-medium text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors"
                      placeholder="e.g. Apex Health Systems"
                    />
                    {errors.name && (
                      <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                      Registered Legal Name
                    </label>
                    <input
                      {...register('legalName')}
                      type="text"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-xs font-medium text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors"
                      placeholder="e.g. Apex Health Systems Inc."
                    />
                    {errors.legalName && (
                      <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.legalName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                      Operating Sector <span className="text-rose-500">*</span>
                    </label>
                    <Controller
                      name="sector"
                      control={control}
                      render={({ field }) => (
                        <CustomSelect
                          value={field.value || 'Private'}
                          onChange={field.onChange}
                          options={SECTOR_OPTIONS}
                        />
                      )}
                    />
                    <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-1">
                      Determines sector-specific statutory contributions (e.g. GSIS for Public, SSS for Private).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                      Industry Classification
                    </label>
                    <input
                      {...register('industry')}
                      type="text"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-xs font-medium text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors"
                      placeholder="e.g. Healthcare & Life Sciences"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                      Corporate Email Domain
                    </label>
                    <input
                      {...register('domain')}
                      type="text"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-xs font-medium text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors"
                      placeholder="e.g. apexcorp.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                      Tax ID / General Business Reference
                    </label>
                    <input
                      {...register('taxId')}
                      type="text"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-xs font-medium text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors"
                      placeholder="e.g. 12-3456789"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                      Organization Logo URL
                    </label>
                    <input
                      {...register('logoUrl')}
                      type="url"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-xs font-medium text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors"
                      placeholder="https://domain.com/brand/logo.png"
                    />
                    {errors.logoUrl && (
                      <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.logoUrl.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: LEGAL ENTITIES */}
            {activeSection === 'legal-entities' && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
                    Legal Entities & Company Registrations
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                    Legally registered business entities responsible for corporate registrations, tax liabilities, and statutory compliance.
                  </p>
                </div>

                {primaryLegalEntity ? (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#141924] space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-[#181D2A] text-amber-300 dark:text-[#CBD5E1] border dark:border-white/10 flex items-center justify-center font-bold text-xs">
                          {primaryLegalEntity.countryCode}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">
                            {primaryLegalEntity.legalName}
                          </h4>
                          <span className="text-[11px] text-slate-400 dark:text-[#64748B] font-mono">
                            Country: {primaryLegalEntity.countryCode} • Reg #{primaryLegalEntity.registrationNumber || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <Badge variant="neutral" size="sm">
                        Primary Legal Entity
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                      <div>
                        <span className="text-slate-400 dark:text-[#64748B] block text-[11px]">Trading Name:</span>
                        <span className="font-semibold text-slate-800 dark:text-[#F8FAFC]">
                          {primaryLegalEntity.tradingName || primaryLegalEntity.legalName}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-[#64748B] block text-[11px]">Entity Status:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {primaryLegalEntity.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-white/10 text-center text-xs text-slate-500 dark:text-[#64748B]">
                    No primary legal entity registered yet. One will be created automatically upon save.
                  </div>
                )}

                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 flex items-start gap-3">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-900 dark:text-blue-300">
                    <span className="font-semibold">Normalized Multi-Entity Architecture:</span> Every organization
                    maintains a designated primary registered company. Additional subsidiaries and international branches
                    can be registered at the database level while maintaining strict tenant isolation.
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: INTERNATIONAL STATUTORY & TAX */}
            {activeSection === 'statutory' && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                <div className="border-b border-slate-100 dark:border-white/10 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
                      International Statutory & Tax Identifiers
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                      Jurisdiction-driven statutory registrations. Encrypted at rest using AES-256-GCM.
                    </p>
                  </div>

                  {/* Country Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8]">Jurisdiction:</span>
                    <select
                      value={watchedCountryCode}
                      onChange={(e) => handleCountrySelect(e.target.value)}
                      className="h-9 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-xs font-bold text-slate-900 dark:text-[#F8FAFC] cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                    >
                      {countries.map((c) => (
                        <option key={c.code} value={c.code} className="bg-white dark:bg-[#181D2A] text-slate-900 dark:text-[#F8FAFC]">
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Country Switching Impact Banner */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#141924] border border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-[#94A3B8]">
                    <Globe className="w-4 h-4 text-slate-400 dark:text-[#64748B]" />
                    <span>
                      Active Jurisdiction: <strong className="text-slate-900 dark:text-[#F8FAFC]">{watchedCountryCode}</strong>
                      {watchedCountryCode === 'PH' && ' — Philippines (BIR, SSS, PhilHealth, Pag-IBIG)'}
                      {watchedCountryCode === 'US' && ' — United States (IRS FEIN, State UI)'}
                      {watchedCountryCode === 'SG' && ' — Singapore (ACRA UEN, IRAS, CPF)'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    AES-256-GCM Encrypted
                  </span>
                </div>

                {/* Dynamic Definitions List */}
                <div className="space-y-4">
                  {definitions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 dark:text-[#64748B] border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                      No statutory identifiers defined for country code &apos;{watchedCountryCode}&apos;.
                    </div>
                  ) : (
                    definitions.map((def) => {
                      const existingReg = registrations.find(
                        (r) => r.identifierDefinitionId === def.id
                      );
                      const isEditing = activeRegEdits[def.id] !== undefined;

                      return (
                        <div
                          key={def.id}
                          className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141924] space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900 dark:text-[#F8FAFC]">
                                  {def.label}
                                </span>
                                <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#181D2A] text-slate-600 dark:text-[#CBD5E1] border border-transparent dark:border-white/10 font-semibold">
                                  {def.identifierKey}
                                </span>
                                {def.isRequired && (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                    Required
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
                                Authority: {def.authorityName} • {def.description}
                              </p>
                            </div>

                            {/* Saved Status Indicator */}
                            {existingReg && !isEditing ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Configured</span>
                              </span>
                            ) : null}
                          </div>

                          {/* Value Area: Masked or Edit Field */}
                          {existingReg && !isEditing ? (
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#121620] border border-slate-200 dark:border-white/10">
                              <span className="font-mono text-xs tracking-wider text-slate-700 dark:text-[#CBD5E1]">
                                {existingReg.maskedValue || '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveRegEdits((prev) => ({
                                    ...prev,
                                    [def.id]: '',
                                  }))
                                }
                                className="text-xs font-semibold text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] cursor-pointer transition-colors"
                              >
                                Replace
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={activeRegEdits[def.id] ?? ''}
                                onChange={(e) =>
                                  setActiveRegEdits((prev) => ({
                                    ...prev,
                                    [def.id]: e.target.value,
                                  }))
                                }
                                placeholder={def.validationConfig?.placeholder || `Enter ${def.label}`}
                                className="flex-1 h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-xs font-mono font-medium text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                              />
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() =>
                                  handleSaveStatutoryRegistration(def.id, activeRegEdits[def.id])
                                }
                                disabled={!activeRegEdits[def.id]}
                              >
                                Save
                              </Button>
                              {existingReg && (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() =>
                                    setActiveRegEdits((prev) => {
                                      const next = { ...prev };
                                      delete next[def.id];
                                      return next;
                                    })
                                  }
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* SECTION 4: WORK & ATTENDANCE */}
            {activeSection === 'attendance' && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
                    Work Modalities & Attendance Policies
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                    Configure authorized employee work locations, shift grace periods, and geofenced timekeeping bounds.
                  </p>
                </div>

                {/* Work Modalities (Interactive Multi-Select) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-2">
                    Authorized Work Modalities <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['OnSite', 'Remote', 'Hybrid'] as WorkMode[]).map((mode) => {
                      const isSelected = watchedWorkModes.includes(mode);
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => handleToggleWorkMode(mode)}
                          className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'border-slate-900 bg-slate-900 text-white dark:border-white/30 dark:bg-[#202637] dark:text-[#F8FAFC] shadow-xs'
                              : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#141924] text-slate-700 dark:text-[#94A3B8] hover:border-slate-400 dark:hover:border-white/20'
                          }`}
                        >
                          <span className="block text-xs font-bold">
                            {mode === 'OnSite' ? 'On-Site' : mode}
                          </span>
                          <span className="block text-[10px] mt-0.5 opacity-80">
                            {mode === 'OnSite'
                              ? 'Physical Office / Facility'
                              : mode === 'Remote'
                              ? 'Anywhere / Telecommute'
                              : 'Blended Schedule'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                    Operating Timezone <span className="text-rose-500">*</span>
                  </label>
                  <Controller
                    name="timezone"
                    control={control}
                    render={({ field }) => (
                      <CustomSelect
                        value={field.value || 'Asia/Manila'}
                        onChange={field.onChange}
                        options={TIMEZONE_OPTIONS}
                      />
                    )}
                  />
                  <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-1">
                    All attendance punches, overtime accruals, and shift boundaries resolve against this timezone.
                  </p>
                </div>

                {/* Attendance Numeric Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                      Shift Grace Period (Minutes)
                    </label>
                    <input
                      {...register('settings.timeAndAttendance.gracePeriodMinutes', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-xs font-medium text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-1">Grace buffer before tardiness deduction applies.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                      Overtime Minimum Threshold (Minutes)
                    </label>
                    <input
                      {...register('settings.timeAndAttendance.overtimeMinimumMinutes', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-xs font-medium text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-1">Minimum excess minutes before OT computation begins.</p>
                  </div>
                </div>

                {/* Switches: Web Clock-In & Geofence */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#141924]">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] block">
                        Allow Web Browser Clock-In
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-[#64748B]">
                        Enables employees to record attendance via web dashboard without mobile biometric app.
                      </span>
                    </div>
                    <Controller
                      name="settings.timeAndAttendance.allowWebClockIn"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                      )}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#141924]">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] block">
                        Enforce GPS Geofencing
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-[#64748B]">
                        Restricts mobile clock-in strictly within certified geographical office coordinates.
                      </span>
                    </div>
                    <Controller
                      name="settings.timeAndAttendance.requireGeofence"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                      )}
                    />
                  </div>

                  {watchedGeofence && (
                    <div className="pl-4 border-l-2 border-slate-300 dark:border-white/20 pt-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                        Geofence Radius (Meters)
                      </label>
                      <input
                        {...register('settings.timeAndAttendance.geofenceRadiusMeters', { valueAsNumber: true })}
                        type="number"
                        min="10"
                        className="w-48 h-10 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-xs font-medium text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 5: PAYROLL & DIVISORS */}
            {activeSection === 'payroll' && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
                    Payroll & Working Day Divisors
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                    Define base currency, default disbursement frequency, daily working hours, and annual divisor constants.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                      Base Operating Currency <span className="text-rose-500">*</span>
                    </label>
                    <Controller
                      name="currency"
                      control={control}
                      render={({ field }) => (
                        <CustomSelect
                          value={field.value || 'PHP'}
                          onChange={field.onChange}
                          options={CURRENCY_OPTIONS}
                        />
                      )}
                    />
                    <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-1">
                      Independent of legal jurisdiction; used as the default denomination for wage calculations.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                      Default Pay Frequency <span className="text-rose-500">*</span>
                    </label>
                    <Controller
                      name="defaultPayFrequency"
                      control={control}
                      render={({ field }) => (
                        <CustomSelect
                          value={field.value || 'Semi-Monthly'}
                          onChange={field.onChange}
                          options={PAY_FREQUENCY_OPTIONS}
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                      Annual Working Days Divisor <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register('settings.payroll.standardWorkingDaysPerYear', { valueAsNumber: true })}
                      type="number"
                      min="1"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-xs font-medium text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-1">
                      DOLE standard: 261 days (Mon-Fri) or 313 days (Mon-Sat).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                      Standard Daily Hours <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register('settings.payroll.standardDailyHours', { valueAsNumber: true })}
                      type="number"
                      min="1"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-xs font-medium text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-1">Full-time standard daily work hours (usually 8.0).</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                      Proration Method
                    </label>
                    <Controller
                      name="settings.payroll.prorationMethod"
                      control={control}
                      render={({ field }) => (
                        <CustomSelect
                          value={field.value || 'WorkingDays'}
                          onChange={field.onChange}
                          options={PRORATION_OPTIONS}
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                      Statutory Deduction Split Rule
                    </label>
                    <Controller
                      name="settings.payroll.statutoryDeductionSplit"
                      control={control}
                      render={({ field }) => (
                        <CustomSelect
                          value={field.value || 'SplitEqually'}
                          onChange={field.onChange}
                          options={DEDUCTION_SPLIT_OPTIONS}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 6: LEAVE MANAGEMENT */}
            {activeSection === 'leaves' && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
                    Leave Management & Accrual Rules
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                    Configure balance overdraft allowances, approval hierarchies, and year-end carry-over ceilings.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#141924]">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] block">
                        Allow Negative Leave Balance
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-[#64748B]">
                        Permits staff to request unearned leave days in advance against future entitlement accruals.
                      </span>
                    </div>
                    <Controller
                      name="settings.leaves.allowNegativeBalance"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                        Required Approval Levels <span className="text-rose-500">*</span>
                      </label>
                      <input
                        {...register('settings.leaves.requireApprovalLevels', { valueAsNumber: true })}
                        type="number"
                        min="1"
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-xs font-medium text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors"
                      />
                      <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-1">Number of tiered supervisor approvals required.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                        Year-End Carry-Over Limit (Days)
                      </label>
                      <input
                        {...register('settings.leaves.carryOverLimitDays', { valueAsNumber: true })}
                        type="number"
                        min="0"
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-xs font-medium text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors"
                      />
                      <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-1">Maximum unused leave days rolled over into the new year.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 7: SECURITY */}
            {activeSection === 'security' && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
                    Workspace Security & Access Controls
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                    Enforce two-factor authentication boundaries and PDF payslip password protection policies.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#141924]">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] block">
                        Mandatory Two-Factor Authentication (2FA)
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-[#64748B]">
                        Requires all organization personnel to configure TOTP authenticator verification upon login.
                      </span>
                    </div>
                    <Controller
                      name="settings.security.enforce2FA"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                      )}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#141924]">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] block">
                        Protect PDF Payslips with Password
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-[#64748B]">
                        Encrypts generated PDF payslips with employee-specific cryptographic passphrases.
                      </span>
                    </div>
                    <Controller
                      name="settings.security.protectPayslipWithPassword"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                      )}
                    />
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                      Payslip Password Key Format
                    </label>
                    <Controller
                      name="settings.security.payslipPasswordFormat"
                      control={control}
                      render={({ field }) => (
                        <CustomSelect
                          value={field.value || 'BIRTHDATE_YYYYMMDD'}
                          onChange={field.onChange}
                          options={PASSWORD_FORMAT_OPTIONS}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 8: PLATFORM ADMINISTRATION (SUPERADMIN ONLY) */}
            {activeSection === 'superadmin' && isSuperAdmin && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                <div className="border-b border-amber-500/20 pb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h2 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
                      Platform SuperAdmin Controls
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                    Privileged tenant licensing, subscription tier allocation, and platform status overrides.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                      Subscription Plan Tier
                    </label>
                    <CustomSelect
                      value={adminTier}
                      onChange={(val) => setAdminTier(val as OrganizationTier)}
                      options={TIER_OPTIONS}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                      Operational Status Override
                    </label>
                    <CustomSelect
                      value={adminStatus}
                      onChange={(val) => setAdminStatus(val as OrganizationStatus)}
                      options={STATUS_OPTIONS}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                      Subscription Start Date
                    </label>
                    <input
                      type="datetime-local"
                      value={adminStartDate}
                      onChange={(e) => setAdminStartDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-xs font-mono text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                      Subscription Expiration Date
                    </label>
                    <input
                      type="datetime-local"
                      value={adminEndDate}
                      onChange={(e) => setAdminEndDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-xs font-mono text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-1">Leave blank for perpetual / non-expiring license.</p>
                  </div>
                </div>

                {/* Module Entitlements Checkboxes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-2">
                    Tier-1 Module Entitlements Allocation
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ALL_MODULES.map((m) => {
                      const isAllocated = adminModules.includes(m.code);
                      return (
                        <div
                          key={m.code}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#141924]"
                        >
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] block">
                              {m.name}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-[#64748B] font-mono">{m.code}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isAllocated}
                            disabled={m.locked}
                            onChange={(e) => {
                              if (m.locked) return;
                              if (e.target.checked) {
                                setAdminModules((prev) => [...prev, m.code]);
                              } else {
                                setAdminModules((prev) => prev.filter((c) => c !== m.code));
                              }
                            }}
                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer disabled:opacity-50"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. PERSISTENT SAVE ACTION AREA (BOTTOM ACTION BAR) */}
        <div className="sticky bottom-0 z-40 bg-white/95 dark:bg-[#181D2A]/95 backdrop-blur-md border border-slate-200 dark:border-white/12 rounded-2xl py-3.5 px-6 shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs">
            {isDirty ? (
              <span className="inline-flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span>You have unsaved changes in this organization configuration.</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 font-medium text-slate-500 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>All organization settings are saved and current.</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleDiscard}
              disabled={!isDirty || isSubmitting}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Discard Changes
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!isDirty || isSubmitting}
              leftIcon={
                isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )
              }
            >
              {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>

      {/* Confirmation Dialog for Country Switching */}
      <ConfirmDialog
        isOpen={showCountryChangeWarning}
        title="Change Legal Jurisdiction"
        description={`Switching legal entity jurisdiction to '${pendingCountryCode}' will preserve existing statutory registrations and historical records without transferring them to the new jurisdiction. Do you want to proceed?`}
        confirmLabel="Confirm Jurisdiction Switch"
        cancelLabel="Cancel"
        isDestructive={false}
        onConfirm={() => {
          if (pendingCountryCode) applyCountryChange(pendingCountryCode);
        }}
        onClose={() => {
          setShowCountryChangeWarning(false);
          setPendingCountryCode(null);
        }}
      />
    </div>
  );
};

export default OrganizationSettingsForm;
