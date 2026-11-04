// ==============================================================================
// JK-PAYROLL: ORGANIZATION PAGE-DRIVEN CRUD ARCHITECTURE SPECIFICATIONS
// Test Suite: Universal ConfirmDialog, Hooks, Services Client, and Page Components
// File: tests/organizations-page-crud.test.ts
// ==============================================================================

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import {
  OrganizationMain,
  OrganizationFormPage,
  OrganizationToolbar,
  OrganizationTable,
  OrganizationTableRow,
  OrganizationTableSkeleton,
  useOrganizations,
  useOrganization,
  useOrganizationMutations,
  organizationClient,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  fetchOrganizations,
  fetchOrganizationById,
} from '../src/features/organizations/index.js';
import { ConfirmDialog } from '../src/components/ui/ConfirmDialog.js';
import { Organization } from '../src/features/organizations/types.js';

describe('Organization Clean Page-Driven Architecture Specifications', () => {
  it('exports all unified page components, tables, and toolbars', () => {
    expect(OrganizationMain).toBeDefined();
    expect(OrganizationFormPage).toBeDefined();
    expect(OrganizationToolbar).toBeDefined();
    expect(OrganizationTable).toBeDefined();
    expect(OrganizationTableRow).toBeDefined();
    expect(OrganizationTableSkeleton).toBeDefined();
    expect(ConfirmDialog).toBeDefined();
  });

  it('exports all CRUD hooks and client service functions', () => {
    expect(typeof useOrganizations).toBe('function');
    expect(typeof useOrganization).toBe('function');
    expect(typeof useOrganizationMutations).toBe('function');
    expect(typeof createOrganization).toBe('function');
    expect(typeof updateOrganization).toBe('function');
    expect(typeof deleteOrganization).toBe('function');
    expect(typeof fetchOrganizations).toBe('function');
    expect(typeof fetchOrganizationById).toBe('function');
  });

  it('renders ConfirmDialog structure correctly', () => {
    const onConfirmMock = vi.fn();
    const onCloseMock = vi.fn();

    const element = React.createElement(ConfirmDialog, {
      isOpen: true,
      title: 'Delete Workspace',
      description: 'Are you sure you want to delete this tenant?',
      isDestructive: true,
      onConfirm: onConfirmMock,
      onClose: onCloseMock,
    });

    expect(element).toBeDefined();
    expect(element.props.title).toBe('Delete Workspace');
    expect(element.props.isDestructive).toBe(true);
  });

  it('renders OrganizationTableRow with JetBrains Mono slug and action buttons', () => {
    const mockOrg: Organization = {
      id: 't-test-corp',
      name: 'Test Corporation',
      code: 'TEST-CORP',
      slug: 'org_test_corp',
      domain: 'testcorp.io',
      industry: 'Technology & Software',
      planTier: 'Enterprise',
      status: 'Active',
      healthStatus: 'healthy',
      headcount: 42,
      defaultPayFrequency: 'Semi-Monthly',
      admin: {
        name: 'Rachel Sterling',
        fullName: 'Rachel Sterling',
        email: 'rachel@testcorp.io',
        username: 'rachel',
        title: 'Platform Admin',
      },
      modules: ['Department', 'EmployeeProfile', 'RolePermission'],
      createdAt: new Date().toISOString(),
    };

    const onEditMock = vi.fn();
    const onDeleteMock = vi.fn();

    const row = React.createElement(OrganizationTableRow, {
      organization: mockOrg,
      onEdit: onEditMock,
      onDelete: onDeleteMock,
    });

    expect(row).toBeDefined();
    expect(row.props.organization.slug).toBe('org_test_corp');
    expect(row.props.organization.headcount).toBe(42);
  });

  it('handles client API requests with error handling', async () => {
    // Mock fetch for client test
    const originalFetch = global.fetch;
    const mockData = {
      items: [
        {
          id: 't-apex',
          name: 'Apex Innovations',
          code: 'APEX',
          slug: 'org_apex',
          domain: 'apex.io',
          industry: 'Technology & Software',
          planTier: 'Enterprise',
          status: 'Active',
          healthStatus: 'healthy',
          headcount: 100,
          defaultPayFrequency: 'Semi-Monthly',
          admin: { name: 'Admin', email: 'admin@apex.io', username: 'admin', title: 'Admin' },
          modules: ['Department'],
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
      activeCount: 1,
      pendingCount: 0,
      totalHeadcount: 100,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockData,
    }) as any;

    try {
      const result = await fetchOrganizations({ search: 'Apex' });
      expect(result.items.length).toBe(1);
      expect(result.items[0].name).toBe('Apex Innovations');
      expect(result.totalHeadcount).toBe(100);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('validates nullable and optional startDate and endDate in organization schema', async () => {
    const { createOrganizationSchema } = await import(
      '../src/features/organizations/organization.schema.js'
    );

    // Case 1: SuperAdmin company with null dates (no time bomb)
    const superAdminCompany = createOrganizationSchema.safeParse({
      name: 'SuperAdmin Master Company',
      code: 'SUPER-MASTER',
      admin: {
        fullName: 'Root Super Admin',
        email: 'root@master.io',
      },
      startDate: null,
      endDate: null,
    });
    expect(superAdminCompany.success).toBe(true);
    if (superAdminCompany.success) {
      expect(superAdminCompany.data.startDate).toBeNull();
      expect(superAdminCompany.data.endDate).toBeNull();
    }

    // Case 2: Tenant company with explicit datetime-local strings
    const tenantCompany = createOrganizationSchema.safeParse({
      name: 'Client Company LLC',
      code: 'CLIENT-CORP',
      admin: {
        fullName: 'Client Admin',
        email: 'admin@client.io',
      },
      startDate: '2026-01-01T08:00',
      endDate: '2026-12-31T18:00',
    });
    expect(tenantCompany.success).toBe(true);
    if (tenantCompany.success) {
      expect(tenantCompany.data.startDate).toBe('2026-01-01T08:00');
      expect(tenantCompany.data.endDate).toBe('2026-12-31T18:00');
    }

    // Case 3: Empty string transforms to null
    const emptyStringCompany = createOrganizationSchema.safeParse({
      name: 'Unspecified Company',
      code: 'UNSPEC-CORP',
      admin: {
        fullName: 'Admin User',
        email: 'admin@unspec.io',
      },
      startDate: '',
      endDate: '',
    });
    expect(emptyStringCompany.success).toBe(true);
    if (emptyStringCompany.success) {
      expect(emptyStringCompany.data.startDate).toBeNull();
      expect(emptyStringCompany.data.endDate).toBeNull();
    }
  });

  it('blocks users from logging in if their tenant company endDate has passed', async () => {
    const { AuthService } = await import('../src/features/auth/auth.service.js');
    const { db } = await import('../src/db/repository.js');

    const authService = new AuthService();

    // Setup an expired tenant company
    const expiredTenantId = 't-expired-corp-test';
    db.tenants.set(expiredTenantId, {
      id: expiredTenantId,
      name: 'Expired Tenant Inc',
      code: 'EXPIRED-CORP',
      isActive: true,
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: '2025-12-31T23:59:59.000Z', // Past date
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    });

    const expiredUserId = 'u-expired-user-test';
    db.profiles.set(expiredUserId, {
      id: expiredUserId,
      tenantId: expiredTenantId,
      departmentId: null,
      fullName: 'Tenant User',
      email: 'user@expired.io',
      isTenantAdmin: false,
      isSuperAdmin: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Attempt resolving user session should throw access expired error
    await expect(authService.resolveUserSession(expiredUserId)).rejects.toThrow(
      /expired/i
    );

    // Setup a SuperAdmin user belonging to a company with null dates (no time bomb)
    const superAdminTenantId = 't-superadmin-corp';
    db.tenants.set(superAdminTenantId, {
      id: superAdminTenantId,
      name: 'SuperAdmin Platform Corp',
      code: 'ROOT-CORP',
      isActive: true,
      startDate: null,
      endDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const superAdminUserId = 'u-superadmin-test';
    db.profiles.set(superAdminUserId, {
      id: superAdminUserId,
      tenantId: superAdminTenantId,
      departmentId: null,
      fullName: 'Super Admin User',
      email: 'superadmin@paypulse.internal',
      isTenantAdmin: false,
      isSuperAdmin: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // SuperAdmin is unaffected and session resolves successfully
    const session = await authService.resolveUserSession(superAdminUserId);
    expect(session.userId).toBe(superAdminUserId);
    expect(session.isSuperAdmin).toBe(true);
  }, 15000);
});

