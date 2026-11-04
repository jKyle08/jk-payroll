// ==============================================================================
// JK-PAYROLL: ROLES FEATURE TYPES
// File: src/features/roles/types.ts
// ==============================================================================

export type RoleType = 'SYSTEM' | 'CUSTOM';

export interface Role {
  id: string;
  /** NULL => global SYSTEM role available to every organization */
  organizationId: string | null;
  code: string;
  name: string;
  description?: string;
  roleType: RoleType;
  isDefault: boolean;
  isMutable: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleItem {
  id: string;
  organizationId: string | null;
  organizationName: string;
  organizationCode: string | null;
  code: string;
  name: string;
  description?: string;
  roleType: RoleType;
  isDefault: boolean;
  isMutable: boolean;
  /** true when the current actor may edit/delete (CUSTOM + mutable) */
  isEditable: boolean;
  assignedUsers: number;
}

export interface RoleFilterState {
  search: string;
  organizationId: string | 'All';
  roleType: RoleType | 'All';
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
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

export interface UserRoleItem {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantCode: string;
  userId: string;
  userName: string;
  userEmail: string;
  userUsername?: string;
  roleId: string;
  roleName: string;
  roleCode: string;
  roleDescription?: string;
  isActive: boolean;
  assignedAt: string;
  updatedAt?: string;
}

export interface CreateUserRoleInput {
  tenantId: string;
  userId: string;
  roleId: string;
  isActive?: boolean;
}

export interface UpdateUserRoleInput {
  tenantId?: string;
  userId?: string;
  roleId?: string;
  isActive?: boolean;
}

export interface UserRoleFilterState {
  search: string;
  tenantId: string | 'All';
  roleId: string | 'All';
  status: 'All' | 'Active' | 'Inactive';
}

export interface CreateRoleInput {
  organizationId: string | null;
  code: string;
  name: string;
  description?: string;
  roleType?: RoleType;
  isDefault?: boolean;
  isMutable?: boolean;
  isActive?: boolean;
}

export interface AssignRolePermissionsInput {
  actionIds: string[];
}

export const DEFAULT_USER_ROLE_ORGANIZATIONS = [
  { id: '00000000-0000-0000-0000-000000000000', name: 'SuperAdmin Platform', code: 'ROOT' },
  { id: '00000000-0000-0000-0000-000000000001', name: 'Apex Health Systems (Admin)', code: 'APEX-HLTH' },
];
