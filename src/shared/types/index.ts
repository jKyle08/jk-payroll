// ==============================================================================
// JK PAYROLL: SHARED DOMAIN TYPES & INTERFACES
// File: src/shared/types/index.ts
// ==============================================================================

export interface Tenant {
  id: string;
  name: string;
  code: string;
  slug?: string;
  legalName?: string | null;
  taxId?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  industry?: string;
  domain?: string | null;
  sector?: 'Private' | 'Public' | 'NonProfit';
  tier?: string;
  planTier?: string;
  status?: string;
  currency?: string;
  timezone?: string;
  countryCode?: string;
  defaultPayFrequency?: string;
  statutoryIds?: Record<string, string>;
  supportedWorkModes?: ('OnSite' | 'Remote' | 'Hybrid')[];
  settings?: any;
  adminName?: string;
  adminEmail?: string;
  adminUsername?: string;
  adminTitle?: string;
  primaryContactId?: string | null;
  modules?: string[];
  startDate?: string | null;
  endDate?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  roleId?: string | null;
  departmentId?: string | null;
  isOwner: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Department {
  id: string;
  organizationId: string;
  tenantId?: string; // Backward compatibility alias
  parentDepartmentId: string | null;
  code: string;
  name: string;
  description?: string;
  headUserId?: string | null;
  depth: number;
  treePath?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepartmentNode extends Department {
  children: DepartmentNode[];
  path?: string[];
}

export interface Profile {
  id: string; // Auth User ID
  tenantId: string;
  departmentId: string | null;
  fullName: string;
  email?: string;
  username?: string;
  isTenantAdmin: boolean;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ModuleCategory = 'Settings' | 'Transactions' | 'Reports' | 'Payroll' | 'Administration';

export interface Module {
  id: string;
  code: string;
  name: string;
  category: ModuleCategory;
  description?: string;
  createdAt: Date;
}

export interface ModuleAction {
  id: string;
  moduleId: string;
  action: string;
  fullKey: string; // e.g. 'TypeOfLeave.Add'
  description?: string;
  createdAt: Date;
}

export interface TenantModule {
  tenantId: string;
  moduleId: string;
  isActive: boolean;
  enabledAt: Date;
}

export interface DepartmentModule {
  tenantId: string;
  departmentId: string;
  moduleId: string;
  assignedAt: Date;
}

export interface UserPermission {
  tenantId: string;
  userId: string;
  moduleActionId: string;
  grantedAt: Date;
}

export interface PermissionDependency {
  parentActionId: string;
  impliedActionId: string;
  createdAt: Date;
}

export type RoleType = 'SYSTEM' | 'CUSTOM';

export interface Role {
  id: string;
  /** NULL => global SYSTEM role available to every organization */
  organizationId: string | null;
  code: string;
  roleType: RoleType;
  isDefault: boolean;
  isMutable: boolean;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RolePermission {
  roleId: string;
  actionId: string;
  createdAt: Date;
}

export interface UserRole {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface TypeOfLeave {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  daysAllowed: number;
  isPaid?: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface LeaveRequest {
  id: string;
  tenantId: string;
  departmentId: string;
  userId: string;
  typeOfLeaveId: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type Organization = Tenant;
export type OrganizationItem = Tenant;

// Scoping Scopes for Transactional Queries
export type DataScope = 'Self' | 'SubDepartment' | 'EntireDepartment' | 'Tenant' | 'Organization';

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
  validationConfig: Record<string, any>;
  inputConfig: Record<string, any>;
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

// Authenticated user request context
export interface AuthUserContext {
  userId: string;
  organizationId: string;
  tenantId: string; // Backward compatibility alias
  departmentId: string | null;
  fullName: string;
  isOrganizationAdmin: boolean;
  isTenantAdmin: boolean; // Backward compatibility alias
  isSuperAdmin: boolean;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserContext;
      organization?: Tenant;
      tenant?: Tenant;
      effectivePermissions?: string[];
      permissionSet?: Set<string>;
    }
  }
}
