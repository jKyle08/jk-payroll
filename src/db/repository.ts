// ==============================================================================
// JK PAYROLL: DATA REPOSITORY & IN-MEMORY POSTGRES/SUPABASE SIMULATION
// ==============================================================================
import { randomUUID } from 'crypto';
import {
  Tenant,
  Department,
  Profile,
  Module,
  ModuleAction,
  TenantModule,
  DepartmentModule,
  UserPermission,
  PermissionDependency,
  TypeOfLeave,
  LeaveRequest,
  DepartmentNode,
  Role,
  RolePermission,
  UserRole,
} from '../types/index.js';

export class DatabaseRepository {
  public tenants = new Map<string, Tenant>();
  public departments = new Map<string, Department>();
  public profiles = new Map<string, Profile>();
  public modules = new Map<string, Module>();
  public moduleActions = new Map<string, ModuleAction>();
  public tenantModules: TenantModule[] = [];
  public departmentModules: DepartmentModule[] = [];
  public userPermissions: UserPermission[] = [];
  public permissionDependencies: PermissionDependency[] = [];
  public typesOfLeave = new Map<string, TypeOfLeave>();
  public leaveRequests = new Map<string, LeaveRequest>();
  public roles = new Map<string, Role>();
  public rolePermissions = new Map<string, RolePermission>();
  public userRoles = new Map<string, UserRole>();

  constructor() {
    this.seedCatalog();
  }

  // Clear data for testing resets (while preserving catalog)
  public resetTestData(): void {
    this.tenants.clear();
    this.departments.clear();
    this.profiles.clear();
    this.tenantModules = [];
    this.departmentModules = [];
    this.userPermissions = [];
    this.typesOfLeave.clear();
    this.leaveRequests.clear();
    this.roles.clear();
    this.rolePermissions.clear();
    this.userRoles.clear();
    this.seedDefaultRolesAndUsers();
  }

  // ----------------------------------------------------------------------------
  // SEED CATALOG (Modules, Actions, Dependencies)
  // ----------------------------------------------------------------------------
  public seedCatalog(): void {
    // 1. Modules
    const catalogModules: Module[] = [
      // Administrative Modules
      {
        id: 'a0000000-0000-0000-0000-000000000011',
        code: 'Tenant',
        name: 'Tenants & Organizations',
        category: 'Administration',
        description: 'Multi-tenant organization management and isolation settings',
        createdAt: new Date(),
      },
      {
        id: 'a0000000-0000-0000-0000-000000000012',
        code: 'Department',
        name: 'Department Hierarchy',
        category: 'Administration',
        description: 'Organizational chart and hierarchical department structure',
        createdAt: new Date(),
      },
      {
        id: 'a0000000-0000-0000-0000-000000000013',
        code: 'Profile',
        name: 'Staff & User Profiles',
        category: 'Administration',
        description: 'Employee profile master records and organizational assignments',
        createdAt: new Date(),
      },
      {
        id: 'a0000000-0000-0000-0000-000000000014',
        code: 'UserRole',
        name: 'User Role Assignment',
        category: 'Administration',
        description: 'Assignment of security roles and access scopes to users',
        createdAt: new Date(),
      },
      {
        id: 'a0000000-0000-0000-0000-000000000015',
        code: 'TenantModule',
        name: 'Tenant Module Allocation',
        category: 'Administration',
        description: 'Tenant subscription and feature entitlement allocations',
        createdAt: new Date(),
      },
      {
        id: 'a0000000-0000-0000-0000-000000000016',
        code: 'DepartmentModule',
        name: 'Department Module Allocation',
        category: 'Administration',
        description: 'Departmental feature enablement cascading from tenant allocations',
        createdAt: new Date(),
      },
      {
        id: 'a0000000-0000-0000-0000-000000000017',
        code: 'RolePermission',
        name: 'Role Permission Template',
        category: 'Administration',
        description: 'Role-based default permission templates and matrices',
        createdAt: new Date(),
      },
      {
        id: 'a0000000-0000-0000-0000-000000000018',
        code: 'UserPermission',
        name: 'User Direct Permission Overrides',
        category: 'Administration',
        description: 'Per-user explicit grant and revoke overrides',
        createdAt: new Date(),
      },

      // Business & Transaction Modules
      {
        id: '10000000-0000-0000-0000-000000000001',
        code: 'TypeOfLeave',
        name: 'Type Of Leave',
        category: 'Settings',
        description: 'Leave type policies and entitlement configurations',
        createdAt: new Date(),
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        code: 'RequestForLeave',
        name: 'Request For Leave',
        category: 'Transactions',
        description: 'Employee leave applications and approvals',
        createdAt: new Date(),
      },
      {
        id: '10000000-0000-0000-0000-000000000003',
        code: 'PayrollProcessing',
        name: 'Payroll Processing',
        category: 'Payroll',
        description: 'Monthly payroll runs, computations, and payouts',
        createdAt: new Date(),
      },
      {
        id: '10000000-0000-0000-0000-000000000004',
        code: 'EmployeeProfile',
        name: 'Employee Profile',
        category: 'Administration',
        description: 'Employee master data and organizational assignments',
        createdAt: new Date(),
      },
      {
        id: '10000000-0000-0000-0000-000000000005',
        code: 'TaxSettings',
        name: 'Tax & Statutory Settings',
        category: 'Settings',
        description: 'Withholding tax tables and statutory contributions',
        createdAt: new Date(),
      },
    ];

    catalogModules.forEach((m) => this.modules.set(m.id, m));

    // 2. Module Actions
    const catalogActions: ModuleAction[] = [
      // Tenant
      { id: 'b0000000-0000-0000-0000-000000000111', moduleId: 'a0000000-0000-0000-0000-000000000011', action: 'View', fullKey: 'Tenant.View', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000112', moduleId: 'a0000000-0000-0000-0000-000000000011', action: 'Add', fullKey: 'Tenant.Add', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000113', moduleId: 'a0000000-0000-0000-0000-000000000011', action: 'Edit', fullKey: 'Tenant.Edit', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000114', moduleId: 'a0000000-0000-0000-0000-000000000011', action: 'Delete', fullKey: 'Tenant.Delete', createdAt: new Date() },

      // Department
      { id: 'b0000000-0000-0000-0000-000000000121', moduleId: 'a0000000-0000-0000-0000-000000000012', action: 'View', fullKey: 'Department.View', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000122', moduleId: 'a0000000-0000-0000-0000-000000000012', action: 'Add', fullKey: 'Department.Add', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000123', moduleId: 'a0000000-0000-0000-0000-000000000012', action: 'Edit', fullKey: 'Department.Edit', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000124', moduleId: 'a0000000-0000-0000-0000-000000000012', action: 'Delete', fullKey: 'Department.Delete', createdAt: new Date() },

      // Profile
      { id: 'b0000000-0000-0000-0000-000000000131', moduleId: 'a0000000-0000-0000-0000-000000000013', action: 'View', fullKey: 'Profile.View', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000132', moduleId: 'a0000000-0000-0000-0000-000000000013', action: 'Add', fullKey: 'Profile.Add', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000133', moduleId: 'a0000000-0000-0000-0000-000000000013', action: 'Edit', fullKey: 'Profile.Edit', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000134', moduleId: 'a0000000-0000-0000-0000-000000000013', action: 'Delete', fullKey: 'Profile.Delete', createdAt: new Date() },

      // UserRole
      { id: 'b0000000-0000-0000-0000-000000000141', moduleId: 'a0000000-0000-0000-0000-000000000014', action: 'View', fullKey: 'UserRole.View', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000142', moduleId: 'a0000000-0000-0000-0000-000000000014', action: 'Add', fullKey: 'UserRole.Add', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000143', moduleId: 'a0000000-0000-0000-0000-000000000014', action: 'Edit', fullKey: 'UserRole.Edit', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000144', moduleId: 'a0000000-0000-0000-0000-000000000014', action: 'Delete', fullKey: 'UserRole.Delete', createdAt: new Date() },

      // TenantModule
      { id: 'b0000000-0000-0000-0000-000000000151', moduleId: 'a0000000-0000-0000-0000-000000000015', action: 'View', fullKey: 'TenantModule.View', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000152', moduleId: 'a0000000-0000-0000-0000-000000000015', action: 'Add', fullKey: 'TenantModule.Add', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000153', moduleId: 'a0000000-0000-0000-0000-000000000015', action: 'Edit', fullKey: 'TenantModule.Edit', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000154', moduleId: 'a0000000-0000-0000-0000-000000000015', action: 'Delete', fullKey: 'TenantModule.Delete', createdAt: new Date() },

      // DepartmentModule
      { id: 'b0000000-0000-0000-0000-000000000161', moduleId: 'a0000000-0000-0000-0000-000000000016', action: 'View', fullKey: 'DepartmentModule.View', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000162', moduleId: 'a0000000-0000-0000-0000-000000000016', action: 'Add', fullKey: 'DepartmentModule.Add', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000163', moduleId: 'a0000000-0000-0000-0000-000000000016', action: 'Edit', fullKey: 'DepartmentModule.Edit', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000164', moduleId: 'a0000000-0000-0000-0000-000000000016', action: 'Delete', fullKey: 'DepartmentModule.Delete', createdAt: new Date() },

      // RolePermission
      { id: 'b0000000-0000-0000-0000-000000000171', moduleId: 'a0000000-0000-0000-0000-000000000017', action: 'View', fullKey: 'RolePermission.View', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000172', moduleId: 'a0000000-0000-0000-0000-000000000017', action: 'Add', fullKey: 'RolePermission.Add', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000173', moduleId: 'a0000000-0000-0000-0000-000000000017', action: 'Edit', fullKey: 'RolePermission.Edit', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000174', moduleId: 'a0000000-0000-0000-0000-000000000017', action: 'Delete', fullKey: 'RolePermission.Delete', createdAt: new Date() },

      // UserPermission
      { id: 'b0000000-0000-0000-0000-000000000181', moduleId: 'a0000000-0000-0000-0000-000000000018', action: 'View', fullKey: 'UserPermission.View', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000182', moduleId: 'a0000000-0000-0000-0000-000000000018', action: 'Add', fullKey: 'UserPermission.Add', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000183', moduleId: 'a0000000-0000-0000-0000-000000000018', action: 'Edit', fullKey: 'UserPermission.Edit', createdAt: new Date() },
      { id: 'b0000000-0000-0000-0000-000000000184', moduleId: 'a0000000-0000-0000-0000-000000000018', action: 'Delete', fullKey: 'UserPermission.Delete', createdAt: new Date() },

      // TypeOfLeave
      { id: '20000000-0000-0000-0000-000000000001', moduleId: '10000000-0000-0000-0000-000000000001', action: 'View', fullKey: 'TypeOfLeave.View', createdAt: new Date() },
      { id: '20000000-0000-0000-0000-000000000002', moduleId: '10000000-0000-0000-0000-000000000001', action: 'Add', fullKey: 'TypeOfLeave.Add', createdAt: new Date() },
      { id: '20000000-0000-0000-0000-000000000003', moduleId: '10000000-0000-0000-0000-000000000001', action: 'Edit', fullKey: 'TypeOfLeave.Edit', createdAt: new Date() },
      { id: '20000000-0000-0000-0000-000000000004', moduleId: '10000000-0000-0000-0000-000000000001', action: 'Delete', fullKey: 'TypeOfLeave.Delete', createdAt: new Date() },

      // RequestForLeave
      { id: '20000000-0000-0000-0000-000000000011', moduleId: '10000000-0000-0000-0000-000000000002', action: 'View', fullKey: 'RequestForLeave.View', createdAt: new Date() },
      { id: '20000000-0000-0000-0000-000000000012', moduleId: '10000000-0000-0000-0000-000000000002', action: 'Add', fullKey: 'RequestForLeave.Add', createdAt: new Date() },
      { id: '20000000-0000-0000-0000-000000000013', moduleId: '10000000-0000-0000-0000-000000000002', action: 'Edit', fullKey: 'RequestForLeave.Edit', createdAt: new Date() },
      { id: '20000000-0000-0000-0000-000000000014', moduleId: '10000000-0000-0000-0000-000000000002', action: 'Delete', fullKey: 'RequestForLeave.Delete', createdAt: new Date() },
      { id: '20000000-0000-0000-0000-000000000015', moduleId: '10000000-0000-0000-0000-000000000002', action: 'Approval.Create', fullKey: 'RequestForLeave.Approval.Create', createdAt: new Date() },

      // PayrollProcessing
      { id: '20000000-0000-0000-0000-000000000021', moduleId: '10000000-0000-0000-0000-000000000003', action: 'View', fullKey: 'PayrollProcessing.View', createdAt: new Date() },
      { id: '20000000-0000-0000-0000-000000000022', moduleId: '10000000-0000-0000-0000-000000000003', action: 'Add', fullKey: 'PayrollProcessing.Add', createdAt: new Date() },
      { id: '20000000-0000-0000-0000-000000000023', moduleId: '10000000-0000-0000-0000-000000000003', action: 'Edit', fullKey: 'PayrollProcessing.Edit', createdAt: new Date() },
      { id: '20000000-0000-0000-0000-000000000024', moduleId: '10000000-0000-0000-0000-000000000003', action: 'Delete', fullKey: 'PayrollProcessing.Delete', createdAt: new Date() },

      // EmployeeProfile
      { id: '20000000-0000-0000-0000-000000000031', moduleId: '10000000-0000-0000-0000-000000000004', action: 'View', fullKey: 'EmployeeProfile.View', createdAt: new Date() },
      { id: '20000000-0000-0000-0000-000000000032', moduleId: '10000000-0000-0000-0000-000000000004', action: 'Add', fullKey: 'EmployeeProfile.Add', createdAt: new Date() },
      { id: '20000000-0000-0000-0000-000000000033', moduleId: '10000000-0000-0000-0000-000000000004', action: 'Edit', fullKey: 'EmployeeProfile.Edit', createdAt: new Date() },
      { id: '20000000-0000-0000-0000-000000000034', moduleId: '10000000-0000-0000-0000-000000000004', action: 'Delete', fullKey: 'EmployeeProfile.Delete', createdAt: new Date() },
    ];

    catalogActions.forEach((a) => this.moduleActions.set(a.id, a));

    // 3. Permission Dependencies (Mutating Action -> View Access)
    this.permissionDependencies = [
      // Tenant (Add/Edit/Delete -> View)
      { parentActionId: 'b0000000-0000-0000-0000-000000000112', impliedActionId: 'b0000000-0000-0000-0000-000000000111', createdAt: new Date() },
      { parentActionId: 'b0000000-0000-0000-0000-000000000113', impliedActionId: 'b0000000-0000-0000-0000-000000000111', createdAt: new Date() },
      { parentActionId: 'b0000000-0000-0000-0000-000000000114', impliedActionId: 'b0000000-0000-0000-0000-000000000111', createdAt: new Date() },

      // Department (Add/Edit/Delete -> View)
      { parentActionId: 'b0000000-0000-0000-0000-000000000122', impliedActionId: 'b0000000-0000-0000-0000-000000000121', createdAt: new Date() },
      { parentActionId: 'b0000000-0000-0000-0000-000000000123', impliedActionId: 'b0000000-0000-0000-0000-000000000121', createdAt: new Date() },
      { parentActionId: 'b0000000-0000-0000-0000-000000000124', impliedActionId: 'b0000000-0000-0000-0000-000000000121', createdAt: new Date() },

      // Profile (Add/Edit/Delete -> View)
      { parentActionId: 'b0000000-0000-0000-0000-000000000132', impliedActionId: 'b0000000-0000-0000-0000-000000000131', createdAt: new Date() },
      { parentActionId: 'b0000000-0000-0000-0000-000000000133', impliedActionId: 'b0000000-0000-0000-0000-000000000131', createdAt: new Date() },
      { parentActionId: 'b0000000-0000-0000-0000-000000000134', impliedActionId: 'b0000000-0000-0000-0000-000000000131', createdAt: new Date() },

      // UserRole (Add/Edit/Delete -> View)
      { parentActionId: 'b0000000-0000-0000-0000-000000000142', impliedActionId: 'b0000000-0000-0000-0000-000000000141', createdAt: new Date() },
      { parentActionId: 'b0000000-0000-0000-0000-000000000143', impliedActionId: 'b0000000-0000-0000-0000-000000000141', createdAt: new Date() },
      { parentActionId: 'b0000000-0000-0000-0000-000000000144', impliedActionId: 'b0000000-0000-0000-0000-000000000141', createdAt: new Date() },

      // TenantModule (Add/Edit/Delete -> View)
      { parentActionId: 'b0000000-0000-0000-0000-000000000152', impliedActionId: 'b0000000-0000-0000-0000-000000000151', createdAt: new Date() },
      { parentActionId: 'b0000000-0000-0000-0000-000000000153', impliedActionId: 'b0000000-0000-0000-0000-000000000151', createdAt: new Date() },
      { parentActionId: 'b0000000-0000-0000-0000-000000000154', impliedActionId: 'b0000000-0000-0000-0000-000000000151', createdAt: new Date() },

      // DepartmentModule (Add/Edit/Delete -> View)
      { parentActionId: 'b0000000-0000-0000-0000-000000000162', impliedActionId: 'b0000000-0000-0000-0000-000000000161', createdAt: new Date() },
      { parentActionId: 'b0000000-0000-0000-0000-000000000163', impliedActionId: 'b0000000-0000-0000-0000-000000000161', createdAt: new Date() },
      { parentActionId: 'b0000000-0000-0000-0000-000000000164', impliedActionId: 'b0000000-0000-0000-0000-000000000161', createdAt: new Date() },

      // RolePermission (Add/Edit/Delete -> View)
      { parentActionId: 'b0000000-0000-0000-0000-000000000172', impliedActionId: 'b0000000-0000-0000-0000-000000000171', createdAt: new Date() },
      { parentActionId: 'b0000000-0000-0000-0000-000000000173', impliedActionId: 'b0000000-0000-0000-0000-000000000171', createdAt: new Date() },
      { parentActionId: 'b0000000-0000-0000-0000-000000000174', impliedActionId: 'b0000000-0000-0000-0000-000000000171', createdAt: new Date() },

      // UserPermission (Add/Edit/Delete -> View)
      { parentActionId: 'b0000000-0000-0000-0000-000000000182', impliedActionId: 'b0000000-0000-0000-0000-000000000181', createdAt: new Date() },
      { parentActionId: 'b0000000-0000-0000-0000-000000000183', impliedActionId: 'b0000000-0000-0000-0000-000000000181', createdAt: new Date() },
      { parentActionId: 'b0000000-0000-0000-0000-000000000184', impliedActionId: 'b0000000-0000-0000-0000-000000000181', createdAt: new Date() },

      // TypeOfLeave
      { parentActionId: '20000000-0000-0000-0000-000000000002', impliedActionId: '20000000-0000-0000-0000-000000000001', createdAt: new Date() }, // Add -> View
      { parentActionId: '20000000-0000-0000-0000-000000000003', impliedActionId: '20000000-0000-0000-0000-000000000001', createdAt: new Date() }, // Edit -> View
      { parentActionId: '20000000-0000-0000-0000-000000000004', impliedActionId: '20000000-0000-0000-0000-000000000001', createdAt: new Date() }, // Delete -> View

      // RequestForLeave
      { parentActionId: '20000000-0000-0000-0000-000000000012', impliedActionId: '20000000-0000-0000-0000-000000000011', createdAt: new Date() }, // Add -> View
      { parentActionId: '20000000-0000-0000-0000-000000000013', impliedActionId: '20000000-0000-0000-0000-000000000011', createdAt: new Date() }, // Edit -> View
      { parentActionId: '20000000-0000-0000-0000-000000000014', impliedActionId: '20000000-0000-0000-0000-000000000011', createdAt: new Date() }, // Delete -> View
      { parentActionId: '20000000-0000-0000-0000-000000000015', impliedActionId: '20000000-0000-0000-0000-000000000011', createdAt: new Date() }, // Approval -> View

      // PayrollProcessing
      { parentActionId: '20000000-0000-0000-0000-000000000022', impliedActionId: '20000000-0000-0000-0000-000000000021', createdAt: new Date() },
      { parentActionId: '20000000-0000-0000-0000-000000000023', impliedActionId: '20000000-0000-0000-0000-000000000021', createdAt: new Date() },
      { parentActionId: '20000000-0000-0000-0000-000000000024', impliedActionId: '20000000-0000-0000-0000-000000000021', createdAt: new Date() },

      // EmployeeProfile
      { parentActionId: '20000000-0000-0000-0000-000000000032', impliedActionId: '20000000-0000-0000-0000-000000000031', createdAt: new Date() },
      { parentActionId: '20000000-0000-0000-0000-000000000033', impliedActionId: '20000000-0000-0000-0000-000000000031', createdAt: new Date() },
      { parentActionId: '20000000-0000-0000-0000-000000000034', impliedActionId: '20000000-0000-0000-0000-000000000031', createdAt: new Date() },
    ];

    // 4. Default Organizations, Roles, and UserRoles
    this.seedDefaultRolesAndUsers();
  }

  public seedDefaultRolesAndUsers(): void {
    const rootTenantId = '00000000-0000-0000-0000-000000000000';
    const apexTenantId = '00000000-0000-0000-0000-000000000001';

    // 1. Organizations
    if (!this.tenants.has(rootTenantId)) {
      this.tenants.set(rootTenantId, {
        id: rootTenantId,
        name: 'SuperAdmin Platform',
        code: 'ROOT',
        isActive: true,
        industry: 'Cloud Platform & Infrastructure',
        domain: 'paypulse.internal',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    if (!this.tenants.has(apexTenantId)) {
      this.tenants.set(apexTenantId, {
        id: apexTenantId,
        name: 'Apex Health Systems',
        code: 'APEX-HLTH',
        isActive: true,
        industry: 'Healthcare & Life Sciences',
        domain: 'apexcorp.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // 2. Default Roles
    const superAdminRoleId = 'c0000000-0000-0000-0000-000000000001';
    const adminRoleId = 'c0000000-0000-0000-0000-000000000002';
    const payrollOfficerRoleId = 'c0000000-0000-0000-0000-000000000003';
    const hrManagerRoleId = 'c0000000-0000-0000-0000-000000000004';

    const now = () => new Date();
    const seedRole = (r: Role) => {
      if (!this.roles.has(r.id)) this.roles.set(r.id, r);
    };

    // Global SYSTEM roles (organizationId = null): read-only for organizations
    seedRole({
      id: superAdminRoleId,
      organizationId: null,
      code: 'SUPER_ADMIN',
      name: 'Super Administrator',
      description: 'Full unrestricted platform-wide administrative control across all organizations and modules',
      roleType: 'SYSTEM',
      isDefault: false,
      isMutable: false,
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    });

    seedRole({
      id: adminRoleId,
      organizationId: null,
      code: 'ADMIN',
      name: 'Administrator',
      description: 'Organization-level administrator with full departmental and policy configuration control',
      roleType: 'SYSTEM',
      isDefault: false,
      isMutable: false,
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    });

    // CUSTOM roles private to the Admin organization
    seedRole({
      id: payrollOfficerRoleId,
      organizationId: apexTenantId,
      code: 'PAYROLL_OFFICER',
      name: 'Payroll Officer',
      description: 'Manages monthly payroll batches, statutory computations, and payslip runs',
      roleType: 'CUSTOM',
      isDefault: false,
      isMutable: true,
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    });

    seedRole({
      id: hrManagerRoleId,
      organizationId: apexTenantId,
      code: 'HR_MANAGER',
      name: 'HR Manager',
      description: 'Personnel management, leave policy approvals, and staff directory assignments',
      roleType: 'CUSTOM',
      isDefault: false,
      isMutable: true,
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    });

    // 3. Default Profiles
    const superAdminUserId = '00000000-0000-0000-0000-000000000001';
    const adminUserId = '00000000-0000-0000-0000-000000000002';

    if (!this.profiles.has(superAdminUserId)) {
      this.profiles.set(superAdminUserId, {
        id: superAdminUserId,
        tenantId: rootTenantId,
        departmentId: null,
        fullName: 'Super Administrator',
        email: 'superadmin@paypulse.internal',
        username: 'superadmin',
        isTenantAdmin: false,
        isSuperAdmin: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    if (!this.profiles.has(adminUserId)) {
      this.profiles.set(adminUserId, {
        id: adminUserId,
        tenantId: apexTenantId,
        departmentId: null,
        fullName: 'Alexander Wright',
        email: 'admin@apexcorp.com',
        username: 'awright',
        isTenantAdmin: true,
        isSuperAdmin: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // 4. Default User Roles
    const superAdminUserRoleId = 'ur-root-superadmin-01';
    const adminUserRoleId = 'ur-apex-admin-01';

    if (!this.userRoles.has(superAdminUserRoleId)) {
      this.userRoles.set(superAdminUserRoleId, {
        id: superAdminUserRoleId,
        tenantId: rootTenantId,
        userId: superAdminUserId,
        roleId: superAdminRoleId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    if (!this.userRoles.has(adminUserRoleId)) {
      this.userRoles.set(adminUserRoleId, {
        id: adminUserRoleId,
        tenantId: apexTenantId,
        userId: adminUserId,
        roleId: adminRoleId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // 5. Seed Hierarchical Departments (OPG, OPG-ITD, OPG-PIO, HR, HR-PAYROLL, FIN)
    const deptOpgId = 'd0000000-0000-0000-0000-000000000001';
    const deptItdId = 'd0000000-0000-0000-0000-000000000002';
    const deptPioId = 'd0000000-0000-0000-0000-000000000003';
    const deptHrId = 'd0000000-0000-0000-0000-000000000004';
    const deptPayrollId = 'd0000000-0000-0000-0000-000000000005';
    const deptFinId = 'd0000000-0000-0000-0000-000000000006';

    const defaultDepts: Department[] = [
      {
        id: deptOpgId,
        organizationId: apexTenantId,
        tenantId: apexTenantId,
        parentDepartmentId: null,
        code: 'OPG',
        name: 'Office of the Provincial Governor',
        description: 'Executive leadership and strategic administrative office',
        headUserId: adminUserId,
        depth: 0,
        treePath: 'opg',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: deptItdId,
        organizationId: apexTenantId,
        tenantId: apexTenantId,
        parentDepartmentId: deptOpgId,
        code: 'OPG-ITD',
        name: 'IT Division',
        description: 'Systems administration, digital payroll infrastructure, and security',
        headUserId: adminUserId,
        depth: 1,
        treePath: 'opg/opg-itd',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: deptPioId,
        organizationId: apexTenantId,
        tenantId: apexTenantId,
        parentDepartmentId: deptOpgId,
        code: 'OPG-PIO',
        name: 'Public Information Office',
        description: 'Civic communication, media affairs, and transparency reporting',
        headUserId: null,
        depth: 1,
        treePath: 'opg/opg-pio',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: deptHrId,
        organizationId: apexTenantId,
        tenantId: apexTenantId,
        parentDepartmentId: null,
        code: 'HR',
        name: 'Human Resources Management',
        description: 'Personnel management, employee benefits, and organizational compliance',
        headUserId: null,
        depth: 0,
        treePath: 'hr',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: deptPayrollId,
        organizationId: apexTenantId,
        tenantId: apexTenantId,
        parentDepartmentId: deptHrId,
        code: 'HR-PAYROLL',
        name: 'Payroll Operations Unit',
        description: 'Compensation disbursement, statutory contributions, and payroll computation',
        headUserId: null,
        depth: 1,
        treePath: 'hr/hr-payroll',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: deptFinId,
        organizationId: apexTenantId,
        tenantId: apexTenantId,
        parentDepartmentId: null,
        code: 'FIN',
        name: 'Finance & Accounts',
        description: 'Financial auditing, treasury management, and expenditure controls',
        headUserId: null,
        depth: 0,
        treePath: 'fin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const d of defaultDepts) {
      if (!this.departments.has(d.id)) {
        this.departments.set(d.id, d);
      }
    }
  }

  // ----------------------------------------------------------------------------
  // TENANT OPERATIONS
  // ----------------------------------------------------------------------------
  public createTenant(data: {
    id?: string;
    name: string;
    code: string;
    isActive?: boolean;
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
  }): Tenant {
    const existing = Array.from(this.tenants.values()).find((t) => t.code.toUpperCase() === data.code.toUpperCase());
    if (existing) {
      throw new Error(`Tenant code '${data.code}' already exists`);
    }

    const tenant: Tenant = {
      id: data.id || randomUUID(),
      name: data.name,
      code: data.code.toUpperCase(),
      isActive: data.isActive !== undefined ? data.isActive : true,
      industry: data.industry,
      domain: data.domain,
      adminName: data.adminName,
      adminEmail: data.adminEmail,
      adminUsername: data.adminUsername,
      adminTitle: data.adminTitle,
      modules: data.modules,
      planTier: data.planTier,
      defaultPayFrequency: data.defaultPayFrequency,
      startDate: data.startDate !== undefined ? data.startDate : null,
      endDate: data.endDate !== undefined ? data.endDate : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tenants.set(tenant.id, tenant);
    return tenant;
  }

  public updateTenant(id: string, data: Partial<Tenant>): Tenant | undefined {
    const tenant = this.tenants.get(id);
    if (!tenant) return undefined;

    const updated: Tenant = {
      ...tenant,
      ...data,
      updatedAt: new Date(),
    };
    this.tenants.set(id, updated);
    return updated;
  }

  public getTenantById(id: string): Tenant | undefined {
    return this.tenants.get(id);
  }

  public getTenantByCode(code: string): Tenant | undefined {
    return Array.from(this.tenants.values()).find((t) => t.code.toUpperCase() === code.toUpperCase());
  }

  public getAllTenants(): Tenant[] {
    return Array.from(this.tenants.values());
  }

  public deleteTenant(id: string): boolean {
    return this.tenants.delete(id);
  }

  // ----------------------------------------------------------------------------
  // DEPARTMENT OPERATIONS (Recursive Hierarchy)
  // ----------------------------------------------------------------------------
  public createDepartment(data: {
    organizationId?: string;
    tenantId?: string;
    parentDepartmentId?: string | null;
    code: string;
    name: string;
    description?: string;
    headUserId?: string | null;
    isActive?: boolean;
  }): Department {
    const orgId = data.organizationId || data.tenantId;
    if (!orgId) {
      throw new Error('Organization ID is required to create a department');
    }

    // Validate organization/tenant exists
    const org = this.getTenantById(orgId);
    if (!org) {
      throw new Error(`Organization with ID ${orgId} not found`);
    }

    const code = data.code.trim().toUpperCase();
    let depth = 0;
    let treePath = code.toLowerCase();

    // Validate parent department belongs to the same organization
    if (data.parentDepartmentId) {
      const parent = this.departments.get(data.parentDepartmentId);
      const parentOrgId = parent?.organizationId || parent?.tenantId;
      if (!parent || parentOrgId !== orgId) {
        throw new Error(`Parent department ${data.parentDepartmentId} does not belong to organization ${orgId}`);
      }
      depth = (parent.depth ?? 0) + 1;
      const parentPath = parent.treePath || parent.code.toLowerCase();
      treePath = `${parentPath}/${code.toLowerCase()}`;
    }

    // Validate unique (organizationId, code)
    const existing = Array.from(this.departments.values()).find(
      (d) => (d.organizationId === orgId || d.tenantId === orgId) && d.code.toUpperCase() === code
    );
    if (existing) {
      throw new Error(`Department code '${code}' already exists in organization`);
    }

    const dept: Department = {
      id: randomUUID(),
      organizationId: orgId,
      tenantId: orgId,
      parentDepartmentId: data.parentDepartmentId || null,
      code,
      name: data.name.trim(),
      description: data.description?.trim(),
      headUserId: data.headUserId || null,
      depth,
      treePath,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.departments.set(dept.id, dept);
    return dept;
  }

  public updateDepartment(
    id: string,
    data: {
      organizationId?: string;
      parentDepartmentId?: string | null;
      code?: string;
      name?: string;
      description?: string;
      headUserId?: string | null;
      isActive?: boolean;
    }
  ): Department {
    const dept = this.departments.get(id);
    if (!dept) {
      throw new Error(`Department with ID '${id}' not found`);
    }

    const orgId = data.organizationId || dept.organizationId || dept.tenantId || '';
    const newCode = data.code !== undefined ? data.code.trim().toUpperCase() : dept.code;

    // Check code uniqueness if changing code
    if (data.code && newCode !== dept.code) {
      const conflict = Array.from(this.departments.values()).find(
        (d) => d.id !== id && (d.organizationId === orgId || d.tenantId === orgId) && d.code.toUpperCase() === newCode
      );
      if (conflict) {
        throw new Error(`Department code '${newCode}' already exists in organization`);
      }
    }

    // Parent department update and cycle prevention
    let newParentId = dept.parentDepartmentId;
    let depth = dept.depth ?? 0;
    let treePath = dept.treePath ?? dept.code.toLowerCase();
    const parentChanged = data.parentDepartmentId !== undefined && data.parentDepartmentId !== dept.parentDepartmentId;
    const codeChanged = data.code !== undefined && newCode !== dept.code;

    if (data.parentDepartmentId !== undefined) {
      if (data.parentDepartmentId === id) {
        throw new Error('A department cannot be its own parent');
      }

      if (data.parentDepartmentId) {
        // Prevent assigning a descendant as the parent (cycle detection)
        const descendants = this.getDepartmentSubTree(orgId, id);
        if (descendants.some((desc) => desc.id === data.parentDepartmentId)) {
          throw new Error('Cannot set a descendant department as the parent (hierarchical cycle detected)');
        }

        const parent = this.departments.get(data.parentDepartmentId);
        const parentOrgId = parent?.organizationId || parent?.tenantId;
        if (!parent || parentOrgId !== orgId) {
          throw new Error(`Parent department ${data.parentDepartmentId} does not belong to organization ${orgId}`);
        }
        newParentId = data.parentDepartmentId;
        depth = (parent.depth ?? 0) + 1;
        const parentPath = parent.treePath || parent.code.toLowerCase();
        treePath = `${parentPath}/${newCode.toLowerCase()}`;
      } else {
        newParentId = null;
        depth = 0;
        treePath = newCode.toLowerCase();
      }
    } else if (codeChanged) {
      if (newParentId) {
        const parent = this.departments.get(newParentId);
        const parentPath = parent?.treePath || parent?.code.toLowerCase() || '';
        treePath = `${parentPath}/${newCode.toLowerCase()}`;
      } else {
        treePath = newCode.toLowerCase();
      }
    }

    const updated: Department = {
      ...dept,
      organizationId: orgId,
      tenantId: orgId,
      parentDepartmentId: newParentId,
      code: newCode,
      name: data.name !== undefined ? data.name.trim() : dept.name,
      description: data.description !== undefined ? data.description.trim() : dept.description,
      headUserId: data.headUserId !== undefined ? data.headUserId : dept.headUserId,
      depth,
      treePath,
      isActive: data.isActive !== undefined ? data.isActive : dept.isActive,
      updatedAt: new Date(),
    };

    this.departments.set(id, updated);

    // If depth, treePath, or parent changed, cascade to all descendants recursively
    if (parentChanged || codeChanged) {
      this.cascadeDepartmentHierarchyUpdates(id, orgId);
    }

    return updated;
  }

  /**
   * Recursively cascades depth and treePath recalculation to all descendants of a department
   */
  private cascadeDepartmentHierarchyUpdates(parentId: string, orgId: string): void {
    const parent = this.departments.get(parentId);
    if (!parent) return;

    const children = Array.from(this.departments.values()).filter(
      (d) => (d.organizationId === orgId || d.tenantId === orgId) && d.parentDepartmentId === parentId
    );

    for (const child of children) {
      const childDepth = (parent.depth ?? 0) + 1;
      const childPath = `${parent.treePath || parent.code.toLowerCase()}/${child.code.toLowerCase()}`;
      const updatedChild: Department = {
        ...child,
        depth: childDepth,
        treePath: childPath,
        updatedAt: new Date(),
      };
      this.departments.set(child.id, updatedChild);
      this.cascadeDepartmentHierarchyUpdates(child.id, orgId);
    }
  }

  /**
   * ON DELETE RESTRICT: Prevents deleting a department if it has child sub-departments
   */
  public deleteDepartment(id: string): boolean {
    const dept = this.departments.get(id);
    if (!dept) return false;

    // Check if any child department references this department
    const hasChildren = Array.from(this.departments.values()).some((d) => d.parentDepartmentId === id);
    if (hasChildren) {
      throw new Error(
        `Cannot delete department '${dept.name}' (${dept.code}) because it has active sub-departments. Please reassign or delete its sub-departments first.`
      );
    }

    // Unassign profiles linked to this department
    for (const [profId, profile] of this.profiles.entries()) {
      if (profile.departmentId === id) {
        this.profiles.set(profId, { ...profile, departmentId: null, updatedAt: new Date() });
      }
    }

    return this.departments.delete(id);
  }

  public getDepartmentById(id: string): Department | undefined {
    return this.departments.get(id);
  }

  public getDepartmentsByOrganization(organizationId: string): Department[] {
    return Array.from(this.departments.values()).filter(
      (d) => (d.organizationId === organizationId || d.tenantId === organizationId) && d.isActive
    );
  }

  public getDepartmentsByTenant(tenantId: string): Department[] {
    return this.getDepartmentsByOrganization(tenantId);
  }

  /**
   * Recursive CTE Equivalent: get_department_sub_tree
   * Returns all descendant departments including the root.
   */
  public getDepartmentSubTree(tenantId: string, deptId: string): Department[] {
    const root = this.departments.get(deptId);
    if (!root) {
      return [];
    }

    const orgId = root.organizationId || root.tenantId;
    const result: Department[] = [root];
    const queue: string[] = [deptId];
    const visited = new Set<string>([deptId]);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = Array.from(this.departments.values()).filter(
        (d) =>
          (d.organizationId === orgId || d.tenantId === orgId || d.organizationId === tenantId || d.tenantId === tenantId) &&
          d.parentDepartmentId === currentId
      );

      for (const child of children) {
        if (!visited.has(child.id)) {
          visited.add(child.id);
          result.push(child);
          queue.push(child.id);
        }
      }
    }

    return result;
  }

  /**
   * Recursive CTE Equivalent: get_department_ancestors
   * Returns the department's ancestor chain up to the root.
   */
  public getDepartmentAncestors(tenantId: string, deptId: string): Department[] {
    const ancestors: Department[] = [];
    let current = this.departments.get(deptId);

    const visited = new Set<string>();
    while (current) {
      if (visited.has(current.id)) break; // cycle protection
      visited.add(current.id);
      ancestors.push(current);
      if (!current.parentDepartmentId) break;
      current = this.departments.get(current.parentDepartmentId);
    }

    return ancestors;
  }

  /**
   * Full hierarchical tree for Tenant Admin UI/API
   */
  public getDepartmentTree(tenantId: string): DepartmentNode[] {
    const allDepts = Array.from(this.departments.values()).filter(
      (d) => (d.organizationId === tenantId || d.tenantId === tenantId) && d.isActive
    );
    const map = new Map<string, DepartmentNode>();

    allDepts.forEach((d) => {
      map.set(d.id, { ...d, children: [] });
    });

    const roots: DepartmentNode[] = [];

    allDepts.forEach((d) => {
      const node = map.get(d.id)!;
      if (d.parentDepartmentId && map.has(d.parentDepartmentId)) {
        map.get(d.parentDepartmentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  // ----------------------------------------------------------------------------
  // PROFILES / USERS
  // ----------------------------------------------------------------------------
  public createProfile(data: {
    id?: string;
    tenantId: string;
    departmentId?: string | null;
    fullName: string;
    email?: string;
    username?: string;
    isTenantAdmin?: boolean;
    isSuperAdmin?: boolean;
    isActive?: boolean;
  }): Profile {
    const profile: Profile = {
      id: data.id || randomUUID(),
      tenantId: data.tenantId,
      departmentId: data.departmentId || null,
      fullName: data.fullName,
      email: data.email,
      username: data.username,
      isTenantAdmin: !!data.isTenantAdmin,
      isSuperAdmin: !!data.isSuperAdmin,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.profiles.set(profile.id, profile);
    return profile;
  }

  public getProfileById(id: string): Profile | undefined {
    return this.profiles.get(id);
  }

  // ----------------------------------------------------------------------------
  // TIER 1: TENANT MODULE ENTITLEMENT (Super Admin -> Tenant)
  // ----------------------------------------------------------------------------
  public setTenantModules(tenantId: string, moduleIds: string[]): TenantModule[] {
    const tenant = this.getTenantById(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    // Verify all moduleIds exist in catalog
    for (const mId of moduleIds) {
      if (!this.modules.has(mId)) {
        throw new Error(`Module ID ${mId} does not exist in module catalog`);
      }
    }

    // Replace tenant modules
    this.tenantModules = this.tenantModules.filter((tm) => tm.tenantId !== tenantId);

    const now = new Date();
    const newAssignments: TenantModule[] = moduleIds.map((mId) => ({
      tenantId,
      moduleId: mId,
      isActive: true,
      enabledAt: now,
    }));

    this.tenantModules.push(...newAssignments);
    return newAssignments;
  }

  public getTenantModules(tenantId: string): Module[] {
    const activeModuleIds = new Set(
      this.tenantModules.filter((tm) => tm.tenantId === tenantId && tm.isActive).map((tm) => tm.moduleId)
    );
    return Array.from(this.modules.values()).filter((m) => activeModuleIds.has(m.id));
  }

  public isModuleActiveForTenant(tenantId: string, moduleId: string): boolean {
    return this.tenantModules.some((tm) => tm.tenantId === tenantId && tm.moduleId === moduleId && tm.isActive);
  }

  // ----------------------------------------------------------------------------
  // TIER 2: DEPARTMENT MODULE ALLOCATION (Tenant Admin -> Department)
  // With recursive downward inheritance to child sub-departments!
  // ----------------------------------------------------------------------------
  public allocateDepartmentModules(tenantId: string, departmentId: string, moduleIds: string[]): DepartmentModule[] {
    const dept = this.getDepartmentById(departmentId);
    if (!dept || dept.tenantId !== tenantId) {
      throw new Error(`Department ${departmentId} does not belong to tenant ${tenantId}`);
    }

    // SECURITY CONSTRAINT: Cannot allocate module unless tenant has it active in Tier 1!
    for (const mId of moduleIds) {
      if (!this.isModuleActiveForTenant(tenantId, mId)) {
        const mod = this.modules.get(mId);
        const name = mod ? mod.name : mId;
        throw new Error(
          `Cannot allocate module '${name}' to department: module is not enabled for tenant ${tenantId}`
        );
      }
    }

    // Replace allocations for this department
    this.departmentModules = this.departmentModules.filter(
      (dm) => !(dm.tenantId === tenantId && dm.departmentId === departmentId)
    );

    const now = new Date();
    const newAssignments: DepartmentModule[] = moduleIds.map((mId) => ({
      tenantId,
      departmentId,
      moduleId: mId,
      assignedAt: now,
    }));

    this.departmentModules.push(...newAssignments);
    return newAssignments;
  }

  /**
   * Returns effective modules for a department:
   * Direct modules + Inherited from all ancestor departments!
   */
  public getDepartmentEffectiveModules(tenantId: string, departmentId: string): Module[] {
    const ancestors = this.getDepartmentAncestors(tenantId, departmentId);
    const ancestorIds = new Set(ancestors.map((a) => a.id));

    // Find modules allocated to this department OR any of its ancestors
    const eligibleModuleIds = new Set<string>();
    for (const dm of this.departmentModules) {
      if (dm.tenantId === tenantId && ancestorIds.has(dm.departmentId)) {
        // Must also still be active for the tenant in Tier 1
        if (this.isModuleActiveForTenant(tenantId, dm.moduleId)) {
          eligibleModuleIds.add(dm.moduleId);
        }
      }
    }

    return Array.from(this.modules.values()).filter((m) => eligibleModuleIds.has(m.id));
  }

  // ----------------------------------------------------------------------------
  // TIER 3: USER PERMISSIONS (Tenant Admin -> Specific Users)
  // ----------------------------------------------------------------------------
  public assignUserPermissions(tenantId: string, userId: string, actionIds: string[]): UserPermission[] {
    const profile = this.getProfileById(userId);
    if (!profile || profile.tenantId !== tenantId) {
      throw new Error(`User ${userId} does not belong to tenant ${tenantId}`);
    }

    if (!profile.departmentId) {
      throw new Error(`Cannot assign permissions to user ${userId}: user has no assigned department`);
    }

    // Eligible modules for the user's department (including inherited from ancestors)
    const effectiveModules = this.getDepartmentEffectiveModules(tenantId, profile.departmentId);
    const allowedModuleIds = new Set(effectiveModules.map((m) => m.id));

    // SECURITY CONSTRAINT: Cannot grant action to user unless its module is available to their department!
    for (const aId of actionIds) {
      const action = this.moduleActions.get(aId);
      if (!action) {
        throw new Error(`Module action ID ${aId} does not exist`);
      }
      if (!allowedModuleIds.has(action.moduleId)) {
        const mod = this.modules.get(action.moduleId);
        throw new Error(
          `Cannot grant action '${action.fullKey}' to user: module '${mod?.name}' is not allocated to department or its ancestors`
        );
      }
    }

    // Replace user permissions
    this.userPermissions = this.userPermissions.filter(
      (up) => !(up.tenantId === tenantId && up.userId === userId)
    );

    const now = new Date();
    const newAssignments: UserPermission[] = actionIds.map((aId) => ({
      tenantId,
      userId,
      moduleActionId: aId,
      grantedAt: now,
    }));

    this.userPermissions.push(...newAssignments);
    return newAssignments;
  }

  /**
   * Complete 3-Tier Effective Permission Evaluation + Implicit Fallback
   * Implements get_user_effective_permissions()
   */
  public getUserEffectivePermissions(tenantId: string, userId: string): string[] {
    const tenant = this.getTenantById(tenantId);
    if (!tenant || !tenant.isActive) {
      return [];
    }

    const profile = this.getProfileById(userId);
    if (!profile || profile.tenantId !== tenantId || !profile.isActive) {
      return [];
    }

    // Super Admin & Tenant Admin have full access to all tenant-enabled modules
    if (profile.isSuperAdmin || profile.isTenantAdmin) {
      const activeTenantModules = this.getTenantModules(tenantId);
      const activeModuleIds = new Set(activeTenantModules.map((m) => m.id));
      return Array.from(this.moduleActions.values())
        .filter((ma) => activeModuleIds.has(ma.moduleId))
        .map((ma) => ma.fullKey);
    }

    if (!profile.departmentId) {
      return [];
    }

    // 1. Get modules effective for user's department (with ancestor inheritance)
    const effectiveModules = this.getDepartmentEffectiveModules(tenantId, profile.departmentId);
    const effectiveModuleIds = new Set(effectiveModules.map((m) => m.id));

    // 2. Direct user permissions that belong to allowed modules
    const directActionIds = new Set<string>();
    for (const up of this.userPermissions) {
      if (up.tenantId === tenantId && up.userId === userId) {
        const action = this.moduleActions.get(up.moduleActionId);
        if (action && effectiveModuleIds.has(action.moduleId)) {
          directActionIds.add(action.id);
        }
      }
    }

    // 3. Expand implicit dependencies (e.g. Add -> View, Edit -> View, Delete -> View)
    const expandedActionIds = new Set<string>(directActionIds);
    for (const actionId of directActionIds) {
      for (const dep of this.permissionDependencies) {
        if (dep.parentActionId === actionId) {
          expandedActionIds.add(dep.impliedActionId);
        }
      }
    }

    // 4. Return distinct list of full_key strings
    const effectiveKeys: string[] = [];
    for (const aId of expandedActionIds) {
      const action = this.moduleActions.get(aId);
      if (action) {
        effectiveKeys.push(action.fullKey);
      }
    }

    return Array.from(new Set(effectiveKeys));
  }

  // ----------------------------------------------------------------------------
  // TRANSACTIONAL & SETTINGS DATA
  // ----------------------------------------------------------------------------
  public createTypeOfLeave(tenantId: string, data: { code: string; name: string; daysAllowed: number }): TypeOfLeave {
    const existing = Array.from(this.typesOfLeave.values()).find(
      (t) => t.tenantId === tenantId && t.code.toUpperCase() === data.code.toUpperCase()
    );
    if (existing) {
      throw new Error(`Leave type with code '${data.code}' already exists`);
    }

    const item: TypeOfLeave = {
      id: randomUUID(),
      tenantId,
      code: data.code.toUpperCase(),
      name: data.name,
      daysAllowed: data.daysAllowed,
      isPaid: true,
      isActive: true,
      createdAt: new Date(),
    };
    this.typesOfLeave.set(item.id, item);
    return item;
  }

  public getTypeOfLeaveByTenant(tenantId: string): TypeOfLeave[] {
    return Array.from(this.typesOfLeave.values()).filter((t) => t.tenantId === tenantId && t.isActive);
  }

  public createLeaveRequest(
    tenantId: string,
    data: {
      departmentId: string;
      userId: string;
      typeOfLeaveId: string;
      startDate: string;
      endDate: string;
      daysCount: number;
      reason?: string;
    }
  ): LeaveRequest {
    const item: LeaveRequest = {
      id: randomUUID(),
      tenantId,
      departmentId: data.departmentId,
      userId: data.userId,
      typeOfLeaveId: data.typeOfLeaveId,
      startDate: data.startDate,
      endDate: data.endDate,
      daysCount: data.daysCount,
      reason: data.reason,
      status: 'Pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.leaveRequests.set(item.id, item);
    return item;
  }

  public getLeaveRequestsByTenant(tenantId: string): LeaveRequest[] {
    return Array.from(this.leaveRequests.values()).filter((r) => r.tenantId === tenantId);
  }

  // ----------------------------------------------------------------------------
  // USER ROLE OPERATIONS (Page-Driven CRUD)
  // ----------------------------------------------------------------------------
  public assignUserRole(data: {
    id?: string;
    tenantId: string;
    userId: string;
    roleId: string;
    isActive?: boolean;
  }): UserRole {
    const userRole: UserRole = {
      id: data.id || randomUUID(),
      tenantId: data.tenantId,
      userId: data.userId,
      roleId: data.roleId,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.userRoles.set(userRole.id, userRole);
    return userRole;
  }

  public getUserRoles(tenantId?: string): UserRole[] {
    const all = Array.from(this.userRoles.values());
    if (tenantId) {
      return all.filter((ur) => ur.tenantId === tenantId);
    }
    return all;
  }

  public getRoleById(id: string): Role | undefined {
    return this.roles.get(id);
  }

  public getUserRoleById(id: string): UserRole | undefined {
    return this.userRoles.get(id);
  }

  public updateUserRole(id: string, data: Partial<UserRole>): UserRole | undefined {
    const existing = this.userRoles.get(id);
    if (!existing) return undefined;
    const updated: UserRole = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.userRoles.set(id, updated);
    return updated;
  }

  public deleteUserRole(id: string): boolean {
    return this.userRoles.delete(id);
  }
}

// Global Singleton Repository instance
export const db = new DatabaseRepository();

