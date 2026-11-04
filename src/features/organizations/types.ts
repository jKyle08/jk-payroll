// ==============================================================================
// JK-PAYROLL: ORGANIZATION DIRECTORY TYPES & MODULE DEPENDENCIES
// Design System: "Midnight & Champagne Steel" (Ramp / Stripe / Mercury Aesthetic)
// File: src/features/organizations/types.ts
// ==============================================================================

export type OrganizationStatus = 'Active' | 'Onboarding' | 'Suspended';
export type OrganizationTier = 'Enterprise' | 'Standard' | 'Starter';
export type OrganizationHealth = 'healthy' | 'syncing' | 'error';
export type PayFrequency = 'Semi-Monthly' | 'Monthly' | 'Bi-Weekly' | 'Weekly';

export interface OrganizationAdmin {
  name: string;
  fullName?: string;
  email: string;
  username: string;
  title: string;
  avatarInitials?: string;
  isExistingUser?: boolean;
  userId?: string;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  slug: string;
  domain: string;
  industry: string;
  planTier: OrganizationTier;
  status: OrganizationStatus;
  healthStatus: OrganizationHealth;
  headcount: number;
  defaultPayFrequency: PayFrequency;
  admin: OrganizationAdmin;
  modules: string[];
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface OrgFilterState {
  search: string;
  status: OrganizationStatus | 'All';
  planTier: OrganizationTier | 'All';
  tier?: OrganizationTier | 'All';
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
