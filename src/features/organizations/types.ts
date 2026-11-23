// ==============================================================================
// JK-PAYROLL: ORGANIZATION DIRECTORY TYPES & MODULE DEPENDENCIES
// Design System: Balanced Glossy Graphite (Ramp / Stripe / Mercury Aesthetic)
// File: src/features/organizations/types.ts
// ==============================================================================

export type OrganizationSector = 'Private' | 'Public' | 'NonProfit';
export type OrganizationStatus = 'Active' | 'Onboarding' | 'Suspended';
export type OrganizationTier = 'Starter' | 'Standard' | 'Enterprise';
export type OrganizationHealth = 'healthy' | 'syncing' | 'error';
export type PayFrequency = 'Weekly' | 'Bi-Weekly' | 'Semi-Monthly' | 'Monthly';
export type WorkMode = 'OnSite' | 'Remote' | 'Hybrid';
export type ProrationMethod = 'CalendarDays' | 'WorkingDays' | 'FixedHours';
export type StatutoryDeductionSplit = 'SplitEqually' | 'FirstPeriodOnly' | 'SecondPeriodOnly';

export interface PayrollSettings {
  standardDailyHours: number;
  standardWorkingDaysPerYear: number;
  prorationMethod: ProrationMethod;
  statutoryDeductionSplit: StatutoryDeductionSplit;
}

export interface TimeAndAttendanceSettings {
  gracePeriodMinutes: number;
  overtimeMinimumMinutes: number;
  allowWebClockIn: boolean;
  requireGeofence: boolean;
  geofenceRadiusMeters: number;
}

export interface LeavesSettings {
  allowNegativeBalance?: boolean;
  requireApprovalLevels?: number;
  carryOverLimitDays?: number;
}

export interface SecuritySettings {
  enforce2FA: boolean;
  protectPayslipWithPassword: boolean;
  payslipPasswordFormat: string;
}

export interface OrganizationSettings {
  payroll: PayrollSettings;
  timeAndAttendance: TimeAndAttendanceSettings;
  leaves: LeavesSettings;
  security: SecuritySettings;
}

export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
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
};

export interface PayrollCalculationSnapshot {
  organizationId: string;
  payFrequency: PayFrequency;
  currency: string;
  settings: OrganizationSettings;
  statutoryIds: Record<string, string>;
  effectiveDate: string;
  capturedAt: string;
}

export interface OrganizationOnboardingResult {
  organization: Organization;
  redirectUrl: string;
}

export interface OrganizationAdminInput {
  fullName: string;
  email: string;
  username?: string;
  title?: string;
  password?: string;
  confirmPassword?: string;
}

export interface OrganizationAdmin {
  name: string;
  fullName?: string;
  email: string;
  username: string;
  title: string;
  avatarInitials?: string;
  userId?: string;
}

export interface Organization {
  id: string;
  code: string;
  slug: string;
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  industry: string;
  domain?: string | null;
  logoUrl?: string | null;
  sector: OrganizationSector;
  tier: OrganizationTier;
  status: OrganizationStatus;
  startDate: string;
  endDate?: string | null;

  // Multi-modal work & Statutory registrations
  supportedWorkModes: WorkMode[];
  statutoryIds: Record<string, string>;

  // Dynamic organizational settings
  settings: OrganizationSettings;

  // HRIS / Payroll config
  currency: string;
  timezone: string;
  countryCode: string;
  defaultPayFrequency: PayFrequency;
  modules: string[];

  // Relations / Metadata
  primaryContactId?: string | null;
  createdAt: string;
  createdBy?: string | null;
  updatedAt: string;
  updatedBy?: string | null;

  // Normalized Legal Entities & Statutory Registrations
  primaryLegalEntity?: OrganizationLegalEntity;
  legalEntities?: OrganizationLegalEntity[];
  statutoryRegistrations?: OrganizationStatutoryRegistration[];

  // Presentation & UI backward-compatibility aliases
  planTier?: OrganizationTier;
  headcount?: number;
  healthStatus?: OrganizationHealth;
  admin?: OrganizationAdmin;
}

export interface OrgFilterState {
  search: string;
  status: OrganizationStatus | 'All';
  sector?: OrganizationSector | 'All';
  tier: OrganizationTier | 'All';
  planTier?: OrganizationTier | 'All';
  payFrequency: PayFrequency | 'All';
}

export interface ModuleDefinition {
  code: string;
  name: string;
  category: 'Core' | 'Add-On';
  description: string;
  isLockedCore?: boolean;
  dependsOn?: string[]; // Code of prerequisites
}

export const ORGANIZATION_MODULES: ModuleDefinition[] = [
  // Core Platform Modules (Always enabled & locked)
  {
    code: 'Department',
    name: 'Department Hierarchy',
    category: 'Core',
    description: 'Recursive organizational tree & departmental scoping',
    isLockedCore: true,
  },
  {
    code: 'EmployeeProfile',
    name: 'Staff & Personnel Directory',
    category: 'Core',
    description: 'Employee profiles, records, and departmental placement',
    isLockedCore: true,
  },
  {
    code: 'RolePermission',
    name: 'Base RBAC & Scoping',
    category: 'Core',
    description: 'Granular permissions matrix and access control policies',
    isLockedCore: true,
  },

  // Add-On Modules (Opt-in with dependency gating)
  {
    code: 'PayrollProcessing',
    name: 'Payroll Engine',
    category: 'Add-On',
    description: 'Automated payroll computation, tax formulas, and payslips',
    dependsOn: ['Department', 'RolePermission'],
  },
  {
    code: 'TypeOfLeave',
    name: 'Leave Policies & Types',
    category: 'Add-On',
    description: 'Statutory leave types, accrual rules, and balances',
    dependsOn: ['EmployeeProfile'],
  },
  {
    code: 'RequestForLeave',
    name: 'Leave Approvals Queue',
    category: 'Add-On',
    description: 'Multi-level approval workflows and calendar visibility',
    dependsOn: ['TypeOfLeave', 'Department'],
  },
];

/**
 * Validates and resolves module dependencies.
 * If an addon requires prerequisites, returns the list of missing prerequisites.
 */
export function resolveModuleDependencies(selectedModules: string[]): {
  resolvedModules: string[];
  autoEnabled: string[];
} {
  const current = new Set(selectedModules);
  const autoEnabled: string[] = [];

  // Always ensure core modules are active
  ORGANIZATION_MODULES.filter((m) => m.isLockedCore).forEach((core) => {
    if (!current.has(core.code)) {
      current.add(core.code);
      autoEnabled.push(core.code);
    }
  });

  // Gated dependency check
  ORGANIZATION_MODULES.forEach((mod) => {
    if (current.has(mod.code) && mod.dependsOn) {
      mod.dependsOn.forEach((dep) => {
        if (!current.has(dep)) {
          current.add(dep);
          autoEnabled.push(dep);
        }
      });
    }
  });

  return {
    resolvedModules: Array.from(current),
    autoEnabled,
  };
}

// Default values removed in favor of dynamic database lookups
export const DEFAULT_ORGANIZATIONS: Organization[] = [];

// ==============================================================================
// NORMALIZED INTERNATIONAL JURISDICTION, LEGAL ENTITY & STATUTORY INTERFACES
// ==============================================================================

export interface Country {
  code: string;
  name: string;
  isActive: boolean;
  currency?: string;
  defaultTimezone?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface StatutoryIdentifierDefinition {
  id: string;
  countryCode: string;
  identifierKey: string;
  label: string;
  description?: string;
  authorityName?: string;
  validationConfig: {
    regex?: string;
    placeholder?: string;
    minLength?: number;
    maxLength?: number;
  };
  inputConfig: {
    mask?: string;
  };
  isRequired: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface OrganizationLegalEntity {
  id: string;
  organizationId: string;
  legalName: string;
  tradingName?: string | null;
  countryCode: string;
  registrationNumber?: string | null;
  isPrimary: boolean;
  status: 'Active' | 'Inactive';
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface OrganizationStatutoryRegistration {
  id: string;
  legalEntityId: string;
  identifierDefinitionId: string;
  countryCode: string;
  jurisdictionCode?: string | null;
  maskedValue: string;
  encryptedValue?: string;
  encryptionKeyVersion?: string;
  registrationStatus: 'Active' | 'Pending' | 'Expired';
  effectiveDate?: string | null;
  expirationDate?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  createdBy?: string | null;
  updatedBy?: string | null;
  definition?: StatutoryIdentifierDefinition;
}

