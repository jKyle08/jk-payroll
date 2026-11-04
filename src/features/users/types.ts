// ==============================================================================
// JK-PAYROLL: USERS FEATURE TYPES
// File: src/features/users/types.ts
// ==============================================================================

import { Module, UserPermission } from '../../types/index.js';

export interface Profile {
  id: string; // Auth User ID
  tenantId: string;
  departmentId: string | null;
  fullName: string;
  email?: string;
  isTenantAdmin: boolean;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  tenantId: string;
  departmentId?: string | null;
  fullName: string;
  email?: string;
  isTenantAdmin?: boolean;
  isSuperAdmin?: boolean;
}

export interface AssignUserPermissionsInput {
  actionIds: string[];
}
