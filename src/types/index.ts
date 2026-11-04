// ==============================================================================
// JK PAYROLL: DOMAIN TYPES & INTERFACES
// ==============================================================================

export interface Tenant {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  industry?: string;
  domain?: string;
  adminName?: string;
  adminEmail?: string;
  adminUsername?: string;
  adminTitle?: string;
  modules?: string[];
  planTier?: string;
  defaultPayFrequency?: string;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Department {
  id: string;
  tenantId: string;
  parentDepartmentId: string | null;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepartmentNode extends Department {
  children: DepartmentNode[];
  depth?: number;
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

// Scoping Scopes for Transactional Queries
export type DataScope = 'Self' | 'SubDepartment' | 'EntireDepartment' | 'Tenant';

// Authenticated user request context
export interface AuthUserContext {
  userId: string;
  tenantId: string;
  departmentId: string | null;
  fullName: string;
  isTenantAdmin: boolean;
  isSuperAdmin: boolean;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserContext;
      effectivePermissions?: string[];
      permissionSet?: Set<string>;
    }
  }
}
