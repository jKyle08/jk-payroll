// ==============================================================================
// JK-PAYROLL: PERMISSION & MODULE KEY CONSTANTS
// File: src/lib/constants/permissions.ts
// ==============================================================================

export const MODULE_KEYS = {
  // Administrative Modules
  ORGANIZATION: 'Organization',
  DEPARTMENT: 'Department',
  PROFILE: 'Profile',
  ROLE: 'Role',
  USER_ROLE: 'UserRole',
  ORGANIZATION_MODULE: 'OrganizationModule',
  DEPARTMENT_MODULE: 'DepartmentModule',
  ROLE_PERMISSION: 'RolePermission',
  USER_PERMISSION: 'UserPermission',

  // Business Modules
  TYPE_OF_LEAVE: 'TypeOfLeave',
  REQUEST_FOR_LEAVE: 'RequestForLeave',
  PAYROLL_COMPUTATION: 'PayrollComputation',

  // Backward-compatibility aliases
  TENANT: 'Organization',
  TENANT_MODULE: 'OrganizationModule',
} as const;

export type ModuleKey = (typeof MODULE_KEYS)[keyof typeof MODULE_KEYS];

export const PERMISSIONS = {
  ORGANIZATION: {
    VIEW: 'Organization.View',
    ADD: 'Organization.Add',
    EDIT: 'Organization.Edit',
    DELETE: 'Organization.Delete',
  },
  // Backward-compatibility alias
  TENANT: {
    VIEW: 'Organization.View',
    ADD: 'Organization.Add',
    EDIT: 'Organization.Edit',
    DELETE: 'Organization.Delete',
  },
  DEPARTMENT: {
    VIEW: 'Department.View',
    ADD: 'Department.Add',
    EDIT: 'Department.Edit',
    DELETE: 'Department.Delete',
  },
  PROFILE: {
    VIEW: 'Profile.View',
    ADD: 'Profile.Add',
    EDIT: 'Profile.Edit',
    DELETE: 'Profile.Delete',
  },
  ROLE: {
    VIEW: 'Role.View',
    ADD: 'Role.Add',
    EDIT: 'Role.Edit',
    DELETE: 'Role.Delete',
  },
  USER_ROLE: {
    VIEW: 'UserRole.View',
    ADD: 'UserRole.Add',
    EDIT: 'UserRole.Edit',
    DELETE: 'UserRole.Delete',
  },
  ORGANIZATION_MODULE: {
    VIEW: 'OrganizationModule.View',
    ADD: 'OrganizationModule.Add',
    EDIT: 'OrganizationModule.Edit',
    DELETE: 'OrganizationModule.Delete',
  },
  // Backward-compatibility alias
  TENANT_MODULE: {
    VIEW: 'OrganizationModule.View',
    ADD: 'OrganizationModule.Add',
    EDIT: 'OrganizationModule.Edit',
    DELETE: 'OrganizationModule.Delete',
  },
  DEPARTMENT_MODULE: {
    VIEW: 'DepartmentModule.View',
    ADD: 'DepartmentModule.Add',
    EDIT: 'DepartmentModule.Edit',
    DELETE: 'DepartmentModule.Delete',
  },
  ROLE_PERMISSION: {
    VIEW: 'RolePermission.View',
    ADD: 'RolePermission.Add',
    EDIT: 'RolePermission.Edit',
    DELETE: 'RolePermission.Delete',
  },
  USER_PERMISSION: {
    VIEW: 'UserPermission.View',
    ADD: 'UserPermission.Add',
    EDIT: 'UserPermission.Edit',
    DELETE: 'UserPermission.Delete',
  },
  TYPE_OF_LEAVE: {
    VIEW: 'TypeOfLeave.View',
    ADD: 'TypeOfLeave.Add',
    EDIT: 'TypeOfLeave.Edit',
    DELETE: 'TypeOfLeave.Delete',
  },
  REQUEST_FOR_LEAVE: {
    VIEW: 'RequestForLeave.View',
    ADD: 'RequestForLeave.Add',
    EDIT: 'RequestForLeave.Edit',
    DELETE: 'RequestForLeave.Delete',
    APPROVAL_CREATE: 'RequestForLeave.Approval.Create',
  },
  PAYROLL_COMPUTATION: {
    VIEW: 'PayrollComputation.View',
    ADD: 'PayrollComputation.Add',
    EDIT: 'PayrollComputation.Edit',
    DELETE: 'PayrollComputation.Delete',
  },
} as const;

export type PermissionKey =
  | (typeof PERMISSIONS.ORGANIZATION)[keyof typeof PERMISSIONS.ORGANIZATION]
  | (typeof PERMISSIONS.DEPARTMENT)[keyof typeof PERMISSIONS.DEPARTMENT]
  | (typeof PERMISSIONS.PROFILE)[keyof typeof PERMISSIONS.PROFILE]
  | (typeof PERMISSIONS.ROLE)[keyof typeof PERMISSIONS.ROLE]
  | (typeof PERMISSIONS.USER_ROLE)[keyof typeof PERMISSIONS.USER_ROLE]
  | (typeof PERMISSIONS.ORGANIZATION_MODULE)[keyof typeof PERMISSIONS.ORGANIZATION_MODULE]
  | (typeof PERMISSIONS.DEPARTMENT_MODULE)[keyof typeof PERMISSIONS.DEPARTMENT_MODULE]
  | (typeof PERMISSIONS.ROLE_PERMISSION)[keyof typeof PERMISSIONS.ROLE_PERMISSION]
  | (typeof PERMISSIONS.USER_PERMISSION)[keyof typeof PERMISSIONS.USER_PERMISSION]
  | (typeof PERMISSIONS.TYPE_OF_LEAVE)[keyof typeof PERMISSIONS.TYPE_OF_LEAVE]
  | (typeof PERMISSIONS.REQUEST_FOR_LEAVE)[keyof typeof PERMISSIONS.REQUEST_FOR_LEAVE]
  | (typeof PERMISSIONS.PAYROLL_COMPUTATION)[keyof typeof PERMISSIONS.PAYROLL_COMPUTATION]
  | (typeof PERMISSIONS.TENANT)[keyof typeof PERMISSIONS.TENANT]
  | (typeof PERMISSIONS.TENANT_MODULE)[keyof typeof PERMISSIONS.TENANT_MODULE]
  | (string & {});

export const MUTATING_ACTIONS = [
  'Add',
  'Edit',
  'Delete',
  'Approval.Create',
] as const;

export type MutatingAction = (typeof MUTATING_ACTIONS)[number];
