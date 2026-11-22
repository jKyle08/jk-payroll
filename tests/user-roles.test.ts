// ==============================================================================
// JK-PAYROLL: USER ROLE CRUD & ARCHITECTURE SPECIFICATIONS
// Test Suite: User Role SQL Insert Script, CRUD Architecture, Default Orgs (SuperAdmin, Admin),
// and Organization Administrator Tagging.
// File: tests/user-roles.test.ts
// ==============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../src/server/db/repository.js';
import { userRoleService, roleService } from '../src/features/roles/role.service.js';
import {
  UserRoleMain,
  UserRoleFormPage,
  UserRoleTable,
  UserRoleToolbar,
  UserRoleTableRow,
  RoleMain,
  RoleFormPage,
  useUserRoles,
  useUserRoleMutations,
  fetchUserRoles,
  fetchUserRoleById,
  createUserRole,
  updateUserRole,
  deleteUserRole,
  DEFAULT_USER_ROLE_ORGANIZATIONS,
} from '../src/features/roles/index.js';
import { createOrganizationSchema } from '../src/features/organizations/organization.schema.js';

describe('User Role SQL Insert Script & Migration Specifications', () => {
  it('verifies SQL insert script exists and seeds SuperAdmin and Admin organizations and roles', () => {
    const migrationPath = path.resolve(
      process.cwd(),
      fs.existsSync(path.resolve(process.cwd(), 'supabase/seed.sql'))
        ? 'supabase/seed.sql'
        : 'supabase/migrations/20261104000001_seed_user_roles.sql'
    );
    expect(fs.existsSync(migrationPath)).toBe(true);

    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
    // Verifies SuperAdmin Organization (00000000-0000-0000-0000-000000000000)
    expect(sqlContent).toContain('00000000-0000-0000-0000-000000000000');
    expect(sqlContent).toContain('SuperAdmin Platform');

    // Verifies Admin Organization (00000000-0000-0000-0000-000000000001)
    expect(sqlContent).toContain('00000000-0000-0000-0000-000000000001');
    expect(sqlContent).toContain('Apex Health Systems');

    // Verifies Default Roles
    expect(sqlContent).toContain("'SUPER_ADMIN'");
    expect(sqlContent).toContain("'ADMIN'");
    expect(sqlContent).toContain("'PAYROLL_OFFICER'");
    expect(sqlContent).toContain("'HR_MANAGER'");

    // Verifies user_roles table inserts
    expect(sqlContent).toContain('INSERT INTO public.user_roles');
  });
});

describe('Organization Creation Administrator Designation Removal Specification', () => {
  it('automatically tags administrator designation as "Administrator" without prompting', () => {
    // When an admin payload is provided without title, schema defaults it to "Administrator"
    const parsed = createOrganizationSchema.parse({
      name: 'Pacific Maritime Corp',
      code: 'PAC-MAR',
      domain: 'pacmar.com',
      industry: 'Technology & Software',
      isActive: true,
      startDate: null,
      endDate: null,
      admin: {
        fullName: 'Captain John Vance',
        email: 'jvance@pacmar.com',
        username: 'jvance',
      },
      modules: ['Department', 'EmployeeProfile', 'RolePermission'],
    });

    expect(parsed.admin.title).toBe('Administrator');
  });
});

describe('User Role Page-Driven CRUD & Service Architecture', () => {
  beforeEach(() => {
    db.resetTestData();
  });

  it('exports all User Role page components, hooks, and services', () => {
    expect(UserRoleMain).toBeDefined();
    expect(UserRoleFormPage).toBeDefined();
    expect(UserRoleTable).toBeDefined();
    expect(UserRoleToolbar).toBeDefined();
    expect(UserRoleTableRow).toBeDefined();
    expect(typeof useUserRoles).toBe('function');
    expect(typeof useUserRoleMutations).toBe('function');
    expect(typeof fetchUserRoles).toBe('function');
    expect(typeof fetchUserRoleById).toBe('function');
    expect(typeof createUserRole).toBe('function');
    expect(typeof updateUserRole).toBe('function');
    expect(typeof deleteUserRole).toBe('function');
  });

  it('verifies default organizations for User Roles are SuperAdmin and Admin', () => {
    expect(DEFAULT_USER_ROLE_ORGANIZATIONS).toBeDefined();
    expect(DEFAULT_USER_ROLE_ORGANIZATIONS.length).toBe(2);

    const superAdminOrg = DEFAULT_USER_ROLE_ORGANIZATIONS.find(
      org => org.id === '00000000-0000-0000-0000-000000000000'
    );
    expect(superAdminOrg).toBeDefined();
    expect(superAdminOrg?.name).toContain('SuperAdmin');

    const adminOrg = DEFAULT_USER_ROLE_ORGANIZATIONS.find(
      org => org.id === '00000000-0000-0000-0000-000000000001'
    );
    expect(adminOrg).toBeDefined();
    expect(adminOrg?.name).toContain('Admin');
  });

  it('does not seed platform authority through user-role assignments', async () => {
    const result = await userRoleService.listUserRoles();
    expect(result.items.some(i => i.roleCode === 'SUPER_ADMIN')).toBe(false);
    expect(result.items.some(i => i.roleCode === 'TENANT_ADMIN')).toBe(false);
    expect(db.getProfileById('00000000-0000-0000-0000-000000000001')?.isSuperAdmin).toBe(true);
    expect(db.getUserRoles().some((ur) => ur.userId === '00000000-0000-0000-0000-000000000001')).toBe(false);
  });

  it('executes full CRUD lifecycle on User Role assignments', async () => {
    // 1. Create a new User Role assignment
    const created = await userRoleService.createUserRole({
      tenantId: '00000000-0000-0000-0000-000000000001',
      userId: '00000000-0000-0000-0000-000000000002',
      roleId: 'c0000000-0000-0000-0000-000000000004',
      isActive: true,
    });

    expect(created.id).toBeDefined();
    expect(created.roleId).toBe('c0000000-0000-0000-0000-000000000004');
    expect(created.isActive).toBe(true);

    // 2. Fetch by ID
    const fetched = await userRoleService.getUserRoleById(created.id);
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(created.id);

    // 3. Update assignment
    const updated = await userRoleService.updateUserRole(created.id, {
      isActive: false,
    });
    expect(updated).toBeDefined();
    expect(updated?.isActive).toBe(false);

    // 4. Delete assignment
    const deleted = await userRoleService.deleteUserRole(created.id);
    expect(deleted).toBe(true);

    const fetchAfterDelete = await userRoleService.getUserRoleById(created.id);
    expect(fetchAfterDelete).toBeUndefined();
  });

  it('filters User Roles by organization, role, and search keyword', async () => {
    const member = db.createProfile({
      id: '90000000-0000-0000-0000-000000000001',
      tenantId: '00000000-0000-0000-0000-000000000001',
      fullName: 'Role Filter Member',
      email: 'role-filter@example.invalid',
      isSuperAdmin: false,
      isTenantAdmin: false,
    });
    db.assignUserRole({
      tenantId: '00000000-0000-0000-0000-000000000001',
      userId: member.id,
      roleId: 'c0000000-0000-0000-0000-000000000004',
    });

    // Filter by SuperAdmin tenant
    const superAdminList = await userRoleService.listUserRoles({
      tenantId: '00000000-0000-0000-0000-000000000000',
    });
    expect(superAdminList.items.every(i => i.tenantId === '00000000-0000-0000-0000-000000000000')).toBe(true);

    // Filter by role
    const adminRoles = await userRoleService.listUserRoles({
      roleId: 'c0000000-0000-0000-0000-000000000004',
    });
    expect(adminRoles.items.every(i => i.roleId === 'c0000000-0000-0000-0000-000000000004')).toBe(true);

    // Search by user email or name
    const searchResult = await userRoleService.listUserRoles({
      search: 'role-filter@example.invalid',
    });
    expect(searchResult.items.length).toBeGreaterThanOrEqual(1);
  });

  it('repository writes reject protected roles and cross-organization roles', () => {
    const user = db.createProfile({
      id: '90000000-0000-0000-0000-000000000002',
      tenantId: '00000000-0000-0000-0000-000000000001',
      fullName: 'Role Guard Member',
      email: 'role-guard@example.invalid',
      isSuperAdmin: false,
      isTenantAdmin: false,
    });
    const protectedAlias = roleService.createRole({
      organizationId: '00000000-0000-0000-0000-000000000001',
      code: ' pLaTfOrM-sUpEr-AdMiN ',
      name: 'Protected Alias',
      roleType: 'CUSTOM',
    });
    const foreignOrganization = db.createTenant({ name: 'Other Role Organization', code: 'OTHER-ROLE' });
    const foreignRole = roleService.createRole({
      organizationId: foreignOrganization.id,
      code: 'FOREIGN_STAFF',
      name: 'Foreign Staff',
      roleType: 'CUSTOM',
    });
    expect(() => db.assignUserRole({
      tenantId: '00000000-0000-0000-0000-000000000001', userId: user.id, roleId: protectedAlias.id,
    })).toThrow(/Platform-privileged roles/);
    expect(() => db.assignUserRole({
      tenantId: '00000000-0000-0000-0000-000000000001',
      userId: user.id,
      roleId: foreignRole.id,
    })).toThrow(/belongs to another organization/);
  });
});

describe('Roles Table Schema & Clean Role Form Specifications', () => {
  beforeEach(() => {
    db.resetTestData();
  });

  it('verifies public.roles table schema adherence (role_type enum, organization_id nullability, is_default, is_mutable)', () => {
    const rolesMigrationPath = path.resolve(
      process.cwd(),
      fs.existsSync(path.resolve(process.cwd(), 'supabase/migrations/20261104000001_core_schema.sql'))
        ? 'supabase/migrations/20261104000001_core_schema.sql'
        : 'supabase/migrations/20261104000002_organizations_rename_and_roles_v2.sql'
    );
    expect(fs.existsSync(rolesMigrationPath)).toBe(true);

    const sqlContent = fs.readFileSync(rolesMigrationPath, 'utf-8');

    // 1. role_type ENUM ('SYSTEM', 'CUSTOM')
    expect(sqlContent).toContain("CREATE TYPE role_type AS ENUM");
    expect(sqlContent).toContain("'SYSTEM'");
    expect(sqlContent).toContain("'CUSTOM'");

    // 2. organization_id nullable for global SYSTEM roles
    expect(sqlContent).toContain("organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE");

    // 3. Columns: role_type, is_default, is_mutable
    expect(sqlContent).toContain("role_type role_type NOT NULL DEFAULT 'CUSTOM'");
    expect(sqlContent).toContain("is_default BOOLEAN NOT NULL DEFAULT false");
    expect(sqlContent).toContain("is_mutable BOOLEAN NOT NULL DEFAULT true");

    // 4. Constraint: UNIQUE NULLS NOT DISTINCT (organization_id, code)
    expect(sqlContent).toContain("uq_organization_role_code UNIQUE NULLS NOT DISTINCT (organization_id, code)");
  });

  it('verifies clean page-driven Role Form and components in React architecture', () => {
    expect(RoleMain).toBeDefined();
    expect(RoleFormPage).toBeDefined();
    expect(UserRoleMain).toBeDefined();
    expect(UserRoleFormPage).toBeDefined();
  });

  it('enforces that System Global roles can only be edited by Super Admin', () => {
    const systemRole = Array.from(db.roles.values()).find((r: any) => r.roleType === 'SYSTEM');
    expect(systemRole).toBeDefined();

    // 1. Non-super admin edit attempt MUST fail
    expect(() => {
      roleService.updateRole(systemRole!.id, { name: 'Attempted Renamed Role' }, false);
    }).toThrow('System Global roles can only be edited by Super Admin');

    // 2. Super admin edit attempt MUST succeed
    const updated = roleService.updateRole(systemRole!.id, { description: 'Updated by Super Admin policy' }, true);
    expect(updated).toBeDefined();
    expect(updated?.description).toBe('Updated by Super Admin policy');
  });
});


