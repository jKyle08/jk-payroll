// ==============================================================================
// JK-PAYROLL: ROLE DIRECTORY VS USER ROLE ASSIGNMENT MODULE DISTINCTION TESTS
// File: tests/role-modules-distinction.test.ts
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { MODULE_KEYS, PERMISSIONS } from '../src/shared/constants/permissions.js';
import { FLATTENED_NAV_SECTIONS, MULTI_LEVEL_NAV_GROUPS } from '../src/client/components/layout/sidebar.js';
import { evaluatePermission } from '../src/features/access-control/hooks/use-permission.js';

describe('Role Directory vs User Role Module Distinction', () => {
  it('defines Role and UserRole as distinct module keys and permission namespaces', () => {
    expect(MODULE_KEYS.ROLE).toBe('Role');
    expect(MODULE_KEYS.USER_ROLE).toBe('UserRole');
    expect(MODULE_KEYS.ROLE).not.toBe(MODULE_KEYS.USER_ROLE);

    expect(PERMISSIONS.ROLE.VIEW).toBe('Role.View');
    expect(PERMISSIONS.ROLE.ADD).toBe('Role.Add');
    expect(PERMISSIONS.USER_ROLE.VIEW).toBe('UserRole.View');
    expect(PERMISSIONS.USER_ROLE.ADD).toBe('UserRole.Add');
  });

  it('displays Role in sidebar navigation and excludes User Role per design specification', () => {
    const allItems = FLATTENED_NAV_SECTIONS.flatMap((s) => s.items);

    const roleDirectoryItem = allItems.find((i) => i.path === '/admin/roles');
    expect(roleDirectoryItem).toBeDefined();
    expect(roleDirectoryItem?.id).toBe('roles-directory');
    expect(roleDirectoryItem?.label).toBe('Role');
    expect(roleDirectoryItem?.requiredPermission).toBe(PERMISSIONS.ROLE.VIEW);

    const userRoleItem = allItems.find((i) => i.path === '/admin/user-roles');
    expect(userRoleItem).toBeUndefined();
  });

  it('verifies nested navigation groups structure Role cleanly without standalone User Role', () => {
    const staffGroup = MULTI_LEVEL_NAV_GROUPS
      .find((g) => g.id === 'administration-cat')
      ?.items.find((i) => i.id === 'staff-profiles-group');

    expect(staffGroup).toBeDefined();
    const roleChild = staffGroup?.children?.find((c) => c.path === '/admin/roles');
    expect(roleChild).toBeDefined();
    expect(roleChild?.label).toBe('Role');

    const userRoleChild = staffGroup?.children?.find((c) => c.path === '/admin/user-roles');
    expect(userRoleChild).toBeUndefined();
  });

  it('evaluates permission checks independently for Role.View and UserRole.View', () => {
    const roleOnlyPerms = ['Role.View'];
    expect(evaluatePermission(roleOnlyPerms, PERMISSIONS.ROLE.VIEW)).toBe(true);
    expect(evaluatePermission(roleOnlyPerms, PERMISSIONS.USER_ROLE.VIEW)).toBe(false);

    const userRoleOnlyPerms = ['UserRole.View'];
    expect(evaluatePermission(userRoleOnlyPerms, PERMISSIONS.ROLE.VIEW)).toBe(false);
    expect(evaluatePermission(userRoleOnlyPerms, PERMISSIONS.USER_ROLE.VIEW)).toBe(true);
  });
});
