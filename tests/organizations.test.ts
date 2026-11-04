// ==============================================================================
// JK-PAYROLL: ORGANIZATION DIRECTORY MODULE SPECIFICATIONS
// File: tests/organizations.test.ts
// ==============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ORGANIZATION_MODULES,
  resolveModuleDependencies,
  DEFAULT_ORGANIZATIONS,
} from '../src/features/organizations/index.js';
import { organizationService } from '../src/features/organizations/organization.service.js';
import { db } from '../src/db/repository.js';

describe('Organization Module Architecture & Entitlement Specifications', () => {
  it('locks Core Platform modules and prevents their omission', () => {
    const emptySelection: string[] = [];
    const { resolvedModules, autoEnabled } = resolveModuleDependencies(emptySelection);

    // Department, EmployeeProfile, and RolePermission must always be active
    expect(resolvedModules).toContain('Department');
    expect(resolvedModules).toContain('EmployeeProfile');
    expect(resolvedModules).toContain('RolePermission');
    expect(autoEnabled.length).toBeGreaterThanOrEqual(3);
  });

  it('automatically resolves prerequisites when Payroll Engine is enabled', () => {
    // When a tenant selects only Payroll Engine, it must automatically pull in Department and RolePermission
    const userSelection = ['PayrollProcessing'];
    const { resolvedModules } = resolveModuleDependencies(userSelection);

    expect(resolvedModules).toContain('PayrollProcessing');
    expect(resolvedModules).toContain('Department');
    expect(resolvedModules).toContain('RolePermission');
  });

  it('automatically resolves prerequisites when Leave Approvals is enabled', () => {
    // RequestForLeave requires TypeOfLeave & Department
    const userSelection = ['RequestForLeave'];
    const { resolvedModules } = resolveModuleDependencies(userSelection);

    expect(resolvedModules).toContain('RequestForLeave');
    expect(resolvedModules).toContain('TypeOfLeave');
    expect(resolvedModules).toContain('Department');
  });

  it('verifies DEFAULT_ORGANIZATIONS contains no hardcoded default mock values', () => {
    // Default values removed; must be empty
    expect(DEFAULT_ORGANIZATIONS).toEqual([]);
    expect(DEFAULT_ORGANIZATIONS.length).toBe(0);
  });

  it('always looks up organizations from the database data', async () => {
    // 1. Fetch current database data
    const initialResult = await organizationService.listOrganizations();
    const initialCount = initialResult.total;

    // 2. Seed a tenant directly in the database repository
    const code = `DYN-${Date.now().toString().slice(-4)}`;
    const testTenant = db.createTenant({
      name: 'Dynamic Test Systems Inc.',
      code,
      industry: 'Healthcare & Life Sciences',
      domain: 'dyntest.internal',
      isActive: true,
      adminName: 'Alexander Vance',
      adminEmail: 'admin@dyntest.internal',
      adminTitle: 'Head of IT & Operations',
      modules: ['Department', 'EmployeeProfile', 'RolePermission', 'PayrollProcessing'],
    });

    // Seed staff profiles in the database
    db.createProfile({
      tenantId: testTenant.id,
      fullName: 'Alexander Vance',
      isTenantAdmin: true,
    });
    db.createProfile({
      tenantId: testTenant.id,
      fullName: 'Dr. John Doe',
    });

    // 3. Service looks up from database data and reflects the newly added tenant
    const result = await organizationService.listOrganizations();
    expect(result.total).toBe(initialCount + 1);

    const found = result.items.find((org) => org.id === testTenant.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Dynamic Test Systems Inc.');
    expect(found?.code).toBe(code);
    expect(found?.status).toBe('Active');
    expect(found?.healthStatus).toBe('healthy');
    expect(found?.headcount).toBe(2);
    expect(found?.admin.email).toBe('admin@dyntest.internal');

    // 4. getOrganizationById looks up directly from database data
    const fetchedOrg = await organizationService.getOrganizationById(testTenant.id);
    expect(fetchedOrg).toBeDefined();
    expect(fetchedOrg?.name).toBe('Dynamic Test Systems Inc.');
    expect(fetchedOrg?.headcount).toBe(2);
  }, 15000);

  it('supports creating and updating organizations directly in the database repository', async () => {
    const code = `VAN-${Date.now().toString().slice(-4)}`;
    const created = await organizationService.createOrganization({
      name: 'Vanguard Logistics Corp',
      code,
      industry: 'Manufacturing & Logistics',
      planTier: 'Standard',
      status: 'Active',
      admin: {
        fullName: 'Marcus Brody',
        email: 'm.brody@vanguardlog.internal',
      },
      modules: ['Department', 'EmployeeProfile'],
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('Vanguard Logistics Corp');
    expect(created.code).toBe(code);

    // Verify it was stored directly in the database repository
    const dbTenant = db.getTenantById(created.id);
    expect(dbTenant).toBeDefined();
    expect(dbTenant?.name).toBe('Vanguard Logistics Corp');

    // Update organization in database
    const updated = await organizationService.updateOrganization(created.id, {
      name: 'Vanguard Global Logistics',
      status: 'Suspended',
    });

    expect(updated?.name).toBe('Vanguard Global Logistics');
    expect(updated?.status).toBe('Suspended');
    expect(db.getTenantById(created.id)?.name).toBe('Vanguard Global Logistics');
    expect(db.getTenantById(created.id)?.isActive).toBe(false);
  });

  it('enforces tenant isolation when retrieving organization by ID', async () => {
    const codeA = `ISO-A-${Date.now().toString().slice(-4)}`;
    const codeB = `ISO-B-${Date.now().toString().slice(-4)}`;
    const tenantA = db.createTenant({ name: 'Alpha Corp', code: codeA });
    const tenantB = db.createTenant({ name: 'Beta Corp', code: codeB });

    // Scoped to tenantA, cannot access tenantB
    const forbiddenOrg = await organizationService.getOrganizationById(tenantB.id, tenantA.id);
    expect(forbiddenOrg).toBeUndefined();

    // Scoped to tenantA, can access tenantA
    const allowedOrg = await organizationService.getOrganizationById(tenantA.id, tenantA.id);
    expect(allowedOrg).toBeDefined();
    expect(allowedOrg?.id).toBe(tenantA.id);
  });

  it('exports all clean page-driven components', async () => {
    const orgs = await import('../src/features/organizations/index.js');
    expect(orgs.OrganizationMain).toBeDefined();
    expect(orgs.OrganizationFormPage).toBeDefined();
    expect(orgs.OrganizationTable).toBeDefined();
    expect(orgs.OrganizationToolbar).toBeDefined();
  });
});
