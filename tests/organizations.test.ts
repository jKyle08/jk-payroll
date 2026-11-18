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
import { db } from '../src/server/db/repository.js';

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
    expect(result.total).toBeGreaterThanOrEqual(initialCount + 1);

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

  it('supports Public, Private, and NonProfit sectors with multi-modal work and statutory IDs', async () => {
    const govCode = `LGU-${Date.now().toString().slice(-4)}`;
    const govOrg = await organizationService.createOrganization({
      name: 'City Government of Pasig',
      code: govCode,
      sector: 'Public',
      industry: 'Government & Public Administration',
      tier: 'Enterprise',
      status: 'Active',
      supportedWorkModes: ['OnSite', 'Hybrid'],
      statutoryIds: {
        gsis: 'GSIS-0912-3341',
        philhealth: 'PH-1029384756',
        pagibig: 'HDMF-99281726',
        tin: '000-123-456-000',
      },
      settings: {
        payroll: {
          standardDailyHours: 8,
          standardWorkingDaysPerYear: 261,
          prorationMethod: 'WorkingDays',
          statutoryDeductionSplit: 'SplitEqually',
        },
        timeAndAttendance: {
          gracePeriodMinutes: 10,
          overtimeMinimumMinutes: 60,
          allowWebClockIn: false,
          requireGeofence: true,
          geofenceRadiusMeters: 50,
        },
        security: {
          enforce2FA: true,
          protectPayslipWithPassword: true,
          payslipPasswordFormat: 'BIRTHDATE_YYYYMMDD',
        },
      },
      admin: {
        fullName: 'Mayor Vico Sotto',
        email: 'vico.sotto@pasig.gov.ph',
      },
      modules: ['Department', 'EmployeeProfile', 'RolePermission'],
    });

    expect(govOrg.id).toBeDefined();
    expect(govOrg.sector).toBe('Public');
    expect(govOrg.supportedWorkModes).toEqual(['OnSite', 'Hybrid']);
    expect(govOrg.statutoryIds.gsis).toBe('GSIS-0912-3341');
    expect(govOrg.settings.payroll.standardWorkingDaysPerYear).toBe(261);
    expect(govOrg.settings.timeAndAttendance.requireGeofence).toBe(true);
    expect(govOrg.settings.security.enforce2FA).toBe(true);
  });

  it('preserves historical rules via calculation snapshots for payroll immutability', async () => {
    const code = `NPO-${Date.now().toString().slice(-4)}`;
    const org = await organizationService.createOrganization({
      name: 'Philippine Red Cross Chapter',
      code,
      sector: 'NonProfit',
      defaultPayFrequency: 'Semi-Monthly',
      admin: {
        fullName: 'Maria Santos',
        email: 'maria.santos@redcross.org.ph',
      },
    });

    // Generate calculation snapshot from live org configuration
    const snapshot = {
      organizationId: org.id,
      payFrequency: org.defaultPayFrequency,
      currency: org.currency,
      settings: org.settings,
      statutoryIds: org.statutoryIds,
      effectiveDate: '2026-11-15',
      capturedAt: new Date().toISOString(),
    };

    expect(snapshot.organizationId).toBe(org.id);
    expect(snapshot.settings.payroll.prorationMethod).toBe('WorkingDays');
    expect(snapshot.settings.security.payslipPasswordFormat).toBe('BIRTHDATE_YYYYMMDD');

    // Simulate live configuration modification
    await organizationService.updateOrganization(org.id, {
      settings: {
        payroll: {
          standardDailyHours: 8,
          standardWorkingDaysPerYear: 312,
          prorationMethod: 'CalendarDays',
          statutoryDeductionSplit: 'FirstPeriodOnly',
        },
      },
    });

    // The historical snapshot remains immutable and unchanged
    expect(snapshot.settings.payroll.standardWorkingDaysPerYear).toBe(261);
    expect(snapshot.settings.payroll.prorationMethod).toBe('WorkingDays');

    // While live org reflects new updated settings
    const updatedLiveOrg = await organizationService.getOrganizationById(org.id);
    expect(updatedLiveOrg?.settings.payroll.standardWorkingDaysPerYear).toBe(312);
  });

  it('provisions new tenants via createOrganizationOnboarding and returns redirectUrl', async () => {
    const code = `ONB-${Date.now().toString().slice(-4)}`;
    const result = await organizationService.createOrganizationOnboarding({
      name: 'Onboarded Enterprise Tech',
      code,
      sector: 'Private',
      currency: 'PHP',
      timezone: 'Asia/Manila',
      admin: {
        fullName: 'Alexander Hamilton',
        email: 'alex.h@onboarded.ph',
      },
    });

    expect(result.organization).toBeDefined();
    expect(result.organization.name).toBe('Onboarded Enterprise Tech');
    expect(result.organization.code).toBe(code);
    expect(result.redirectUrl).toBe(`/${result.organization.slug}/dashboard`);

    // Verify root admin is always created as a brand-new user profile
    expect(result.organization.primaryContactId).toBe(`usr-t-${code.toLowerCase()}-admin`);
    const adminProfile = db.profiles.get(result.organization.primaryContactId!);
    expect(adminProfile).toBeDefined();
    expect(adminProfile?.fullName).toBe('Alexander Hamilton');
    expect(adminProfile?.email).toBe('alex.h@onboarded.ph');
    expect(adminProfile?.isTenantAdmin).toBe(true);
    expect(adminProfile?.isActive).toBe(true);
  });

  it('updates company profile and settings while strictly protecting immutable identifiers (code, slug)', async () => {
    const code = `SET-${Date.now().toString().slice(-4)}`;
    const org = await organizationService.createOrganization({
      name: 'Initial Settings Corp',
      code,
      admin: {
        fullName: 'Admin User',
        email: 'admin@initial.ph',
      },
    });

    const originalSlug = org.slug;

    // Call updateOrganizationSettings
    const updated = await organizationService.updateOrganizationSettings(org.id, {
      name: 'Updated Settings Corporation',
      legalName: 'Updated Settings Corp Ltd.',
      industry: 'Financial Technology',
      domain: 'updatedsettings.ph',
      statutoryIds: {
        tin: '123-456-789-000',
        sss: '04-1234567-8',
      },
      supportedWorkModes: ['Remote', 'Hybrid'],
      defaultPayFrequency: 'Monthly',
      settings: {
        payroll: {
          standardDailyHours: 8,
          standardWorkingDaysPerYear: 313,
          prorationMethod: 'WorkingDays',
          statutoryDeductionSplit: 'SecondPeriodOnly',
        },
      },
    });

    expect(updated).toBeDefined();
    expect(updated?.name).toBe('Updated Settings Corporation');
    expect(updated?.legalName).toBe('Updated Settings Corp Ltd.');
    expect(updated?.statutoryIds.tin).toBe('123-456-789-000');
    expect(updated?.supportedWorkModes).toEqual(['Remote', 'Hybrid']);
    expect(updated?.defaultPayFrequency).toBe('Monthly');
    expect(updated?.settings.payroll.standardWorkingDaysPerYear).toBe(313);

    // Code and slug MUST remain strictly immutable
    expect(updated?.code).toBe(code);
    expect(updated?.slug).toBe(originalSlug);
  });

  it('exports all clean page-driven components including onboarding and settings forms', async () => {
    const orgs = await import('../src/features/organizations/index.js');
    expect(orgs.OrganizationMain).toBeDefined();
    expect(orgs.OrganizationFormPage).toBeDefined();
    expect(orgs.OrganizationOnboardingWizard).toBeDefined();
    expect(orgs.OrganizationSettingsForm).toBeDefined();
    expect(orgs.OrganizationTable).toBeDefined();
    expect(orgs.OrganizationToolbar).toBeDefined();
  });
});
