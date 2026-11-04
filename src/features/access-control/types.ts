// ==============================================================================
// JK-PAYROLL: ACCESS CONTROL & PERMISSION TYPES
// File: src/features/access-control/types.ts
// ==============================================================================

export type ActionType = 'View' | 'Add' | 'Edit' | 'Delete' | 'Approval.Create';

export interface ModuleActionItem {
  id: string;
  moduleId: string;
  action: ActionType;
  fullKey: string;
  description?: string;
  createdAt?: string | Date;
}

export type ModuleCategory =
  | 'Settings'
  | 'Transactions'
  | 'Reports'
  | 'Payroll'
  | 'Administration';

export interface ModuleData {
  id: string;
  code: string;
  name: string;
  category: ModuleCategory;
  isActive: boolean;
  actions?: ModuleActionItem[];
  createdAt?: string | Date;
}

export interface PermissionState {
  effectivePermissions: string[];
  hasPermission: (key: string) => boolean;
  hasAnyPermission: (...keys: string[]) => boolean;
  hasAllPermissions: (...keys: string[]) => boolean;
}
