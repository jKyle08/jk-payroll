// ==============================================================================
// JK-PAYROLL: ORGANIZATION MANAGEMENT & SETTINGS REDESIGN TEST SUITE
// File: tests/organization-redesign-settings.test.ts
// ==============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { db } from '../src/server/db/repository.js';
import { generateTestToken } from '../src/server/middleware/auth.middleware.js';
import { encryptionService } from '../src/server/security/encryption.service.js';

describe('Organization Redesign, International Statutory Catalog & Encryption Suite', () => {
  const app = createApp();

  let superAdminToken: string;
  let tenantA: any;
  let tenantAdminA: any;
  let tenantAdminAToken: string;
  let regularUserA: any;
  let regularUserAToken: string;

  let tenantB: any;
  let tenantAdminB: any;
  let tenantAdminBToken: string;

  beforeEach(() => {
    db.resetTestData();
    db.seedCatalog();

    // 1. Super Admin Profile
    const superAdmin = db.createProfile({
      fullName: 'Global Super Admin',
      isSuperAdmin: true,
      tenantId: '00000000-0000-0000-0000-000000000000',
    });
    db.tenants.set('00000000-0000-0000-0000-000000000000', {
      id: '00000000-0000-0000-0000-000000000000',
      name: 'System Root',
      code: 'ROOT',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    superAdminToken = generateTestToken({ userId: superAdmin.id, isSuperAdmin: true });

    // 2. Tenant A (Philippines)
    tenantA = db.createTenant({
      name: 'Alpha APAC Corp',
      code: 'ALPHA',
      countryCode: 'PH',
      modules: ['Department', 'EmployeeProfile', 'RolePermission', 'PayrollProcessing'],
    });

    tenantAdminA = db.createProfile({
      fullName: 'Alpha Admin',
      tenantId: tenantA.id,
      isTenantAdmin: true,
      role: 'ORG_ADMIN',
    });
    tenantAdminAToken = generateTestToken({
      userId: tenantAdminA.id,
      tenantId: tenantA.id,
      isTenantAdmin: true,
    });

    regularUserA = db.createProfile({
      fullName: 'Alpha Regular Employee',
      tenantId: tenantA.id,
      isTenantAdmin: false,
      role: 'EMPLOYEE',
    });
    regularUserAToken = generateTestToken({
      userId: regularUserA.id,
      tenantId: tenantA.id,
      isTenantAdmin: false,
      isSuperAdmin: false,
    });

    // 3. Tenant B (Singapore)
    tenantB = db.createTenant({
      name: 'Beta Global Pte Ltd',
      code: 'BETA',
      countryCode: 'SG',
      modules: ['Department', 'EmployeeProfile', 'RolePermission', 'PayrollProcessing'],
    });

    tenantAdminB = db.createProfile({
      fullName: 'Beta Admin',
      tenantId: tenantB.id,
      isTenantAdmin: true,
      role: 'ORG_ADMIN',
    });
    tenantAdminBToken = generateTestToken({
      userId: tenantAdminB.id,
      tenantId: tenantB.id,
      isTenantAdmin: true,
    });
  });

  // ============================================================================
  // 1. SECURITY & ENCRYPTION SERVICE
  // ============================================================================
  describe('Encryption Service (AES-256-GCM & Masking)', () => {
    it('encrypts plaintext with AES-256-GCM and decrypts back accurately', () => {
      const plaintext = '123-456-789-000';
      const result = encryptionService.encrypt(plaintext);

      expect(result).toBeDefined();
      expect(result.encryptedValue).toBeDefined();
      expect(result.encryptedValue).not.toBe(plaintext);
      expect(result.encryptedValue).toContain(':'); // IV:AuthTag:Ciphertext format
      expect(result.keyVersion).toBe('v1');
      expect(result.maskedValue).toContain('-000');

      const decrypted = encryptionService.decrypt(result.encryptedValue);
      expect(decrypted).toBe(plaintext);
    });

    it('generates different ciphertexts for identical plaintext across calls due to unique IVs', () => {
      const plaintext = '987-654-321-000';
      const enc1 = encryptionService.encrypt(plaintext);
      const enc2 = encryptionService.encrypt(plaintext);

      expect(enc1.encryptedValue).not.toBe(enc2.encryptedValue);
      expect(encryptionService.decrypt(enc1.encryptedValue)).toBe(plaintext);
      expect(encryptionService.decrypt(enc2.encryptedValue)).toBe(plaintext);
    });

    it('masks sensitive statutory identifiers preserving last 4 characters and punctuation', () => {
      const maskedTIN = encryptionService.mask('123-456-789-000');
      expect(maskedTIN).toBe('•••••••••••-000');

      const maskedEIN = encryptionService.mask('12-3456789');
      expect(maskedEIN).toBe('••••••6789');

      const maskedShort = encryptionService.mask('123');
      expect(maskedShort).toBe('•••');
    });

    it('throws error when attempting to decrypt tampered ciphertexts', () => {
      const { encryptedValue } = encryptionService.encrypt('SECRET-TAX-ID');
      const parts = encryptedValue.split(':');
      // Tamper with the ciphertext component
      parts[2] = 'abcd1234ef567890';
      const tampered = parts.join(':');

      expect(() => encryptionService.decrypt(tampered)).toThrow();
    });
  });

  // ============================================================================
  // 2. COUNTRIES & STATUTORY IDENTIFIER DEFINITIONS API
  // ============================================================================
  describe('International Jurisdiction & Statutory Definitions Catalog API', () => {
    it('returns international jurisdictions via GET /api/countries', async () => {
      const res = await request(app)
        .get('/api/countries')
        .set('Authorization', `Bearer ${tenantAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const countryCodes = res.body.data.map((c: any) => c.code);
      expect(countryCodes).toContain('PH');
      expect(countryCodes).toContain('US');
      expect(countryCodes).toContain('SG');

      const ph = res.body.data.find((c: any) => c.code === 'PH');
      expect(ph.currency).toBe('PHP');
      expect(ph.defaultTimezone).toBe('Asia/Manila');
    });

    it('returns statutory definitions filtered by country code via GET /api/statutory-identifiers/definitions', async () => {
      // Philippines definitions
      const resPH = await request(app)
        .get('/api/statutory-identifiers/definitions?countryCode=PH')
        .set('Authorization', `Bearer ${tenantAdminAToken}`);

      expect(resPH.status).toBe(200);
      expect(resPH.body.success).toBe(true);
      const phKeys = resPH.body.data.map((d: any) => d.identifierKey);
      expect(phKeys).toContain('TIN');
      expect(phKeys).toContain('SSS');
      expect(phKeys).toContain('GSIS');
      expect(phKeys).toContain('PHILHEALTH');
      expect(phKeys).toContain('PAGIBIG');

      // Singapore definitions
      const resSG = await request(app)
        .get('/api/statutory-identifiers/definitions?countryCode=SG')
        .set('Authorization', `Bearer ${tenantAdminAToken}`);

      expect(resSG.status).toBe(200);
      const sgKeys = resSG.body.data.map((d: any) => d.identifierKey);
      expect(sgKeys).toContain('UEN');
      expect(sgKeys).toContain('GST');
      expect(sgKeys).toContain('CPF');
    });
  });

  // ============================================================================
  // 3. LEGAL ENTITIES MANAGEMENT & TENANT ISOLATION
  // ============================================================================
  describe('Legal Entities Sub-resource API & Multi-Tenant Scoping', () => {
    it('auto-provisions a primary legal entity upon tenant creation', async () => {
      const res = await request(app)
        .get(`/api/organizations/${tenantA.id}/legal-entities`)
        .set('Authorization', `Bearer ${tenantAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const primary = res.body.data.find((e: any) => e.isPrimary === true);
      expect(primary).toBeDefined();
      expect(primary.legalName).toBe(tenantA.name);
      expect(primary.countryCode).toBe('PH');
    });

    it('prevents tenant admin from viewing legal entities of another tenant (Cross-Tenant 403)', async () => {
      // Tenant Admin A tries to access Tenant B's legal entities
      const res = await request(app)
        .get(`/api/organizations/${tenantB.id}/legal-entities`)
        .set('Authorization', `Bearer ${tenantAdminAToken}`);

      expect(res.status).toBe(403);
    });

    it('allows SuperAdmin to view and manage legal entities across any tenant', async () => {
      const resA = await request(app)
        .get(`/api/organizations/${tenantA.id}/legal-entities`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(resA.status).toBe(200);

      const resB = await request(app)
        .get(`/api/organizations/${tenantB.id}/legal-entities`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(resB.status).toBe(200);
    });

    it('prevents regular employees from creating or modifying legal entities (RBAC 403)', async () => {
      const res = await request(app)
        .post(`/api/organizations/${tenantA.id}/legal-entities`)
        .set('Authorization', `Bearer ${regularUserAToken}`)
        .send({
          legalName: 'Alpha Subsidiary Corporation',
          countryCode: 'PH',
          isPrimary: false,
        });

      expect(res.status).toBe(403);
    });

    it('allows Tenant Admin to create a new secondary legal entity for their organization', async () => {
      const res = await request(app)
        .post(`/api/organizations/${tenantA.id}/legal-entities`)
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .send({
          legalName: 'Alpha Technology Services Philippines Inc.',
          tradingName: 'Alpha Tech Services',
          registrationNumber: '987-654-321-000',
          countryCode: 'PH',
          isPrimary: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.legalName).toBe('Alpha Technology Services Philippines Inc.');
      expect(res.body.data.organizationId).toBe(tenantA.id);
      expect(res.body.data.isPrimary).toBe(false);
    });

    it('switches primary legal entity correctly when a new entity is marked as primary', async () => {
      // Create new primary entity
      const resCreate = await request(app)
        .post(`/api/organizations/${tenantA.id}/legal-entities`)
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .send({
          legalName: 'Alpha Holdings Corporation',
          countryCode: 'PH',
          isPrimary: true,
        });

      expect(resCreate.status).toBe(201);
      const newPrimaryId = resCreate.body.data.id;

      // Verify that other entities in Tenant A no longer have isPrimary = true
      const resList = await request(app)
        .get(`/api/organizations/${tenantA.id}/legal-entities`)
        .set('Authorization', `Bearer ${tenantAdminAToken}`);

      const primaries = resList.body.data.filter((e: any) => e.isPrimary === true);
      expect(primaries.length).toBe(1);
      expect(primaries[0].id).toBe(newPrimaryId);
    });
  });

  // ============================================================================
  // 4. STATUTORY REGISTRATIONS, MASKING & ENCRYPTION
  // ============================================================================
  describe('Statutory Registrations API & Confidential Data Masking', () => {
    let primaryEntityA: any;
    let phTINDef: any;

    beforeEach(async () => {
      const res = await request(app)
        .get(`/api/organizations/${tenantA.id}/legal-entities`)
        .set('Authorization', `Bearer ${tenantAdminAToken}`);
      primaryEntityA = res.body.data.find((e: any) => e.isPrimary === true);

      const resDefs = await request(app)
        .get('/api/statutory-identifiers/definitions?countryCode=PH')
        .set('Authorization', `Bearer ${tenantAdminAToken}`);
      phTINDef = resDefs.body.data.find((d: any) => d.identifierKey === 'TIN');
    });

    it('saves a statutory registration with masked return representation', async () => {
      const rawTIN = '123-456-789-000';
      const res = await request(app)
        .post(`/api/organizations/${tenantA.id}/legal-entities/${primaryEntityA.id}/statutory-registrations`)
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .send({
          identifierDefinitionId: phTINDef.id,
          value: rawTIN,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.identifierDefinitionId).toBe(phTINDef.id);
      expect(res.body.data.maskedValue).toBe('•••••••••••-000');
      // Plaintext must never be returned in plain value field
      expect(res.body.data.value).toBeUndefined();

      // Check repository directly: encrypted value should be stored at rest
      const stored = db.getStatutoryRegistrations(primaryEntityA.id).find((r) => r.identifierDefinitionId === phTINDef.id);
      expect(stored).toBeDefined();
      expect(stored?.encryptedValue).not.toBe(rawTIN);
      expect(encryptionService.decrypt(stored!.encryptedValue!)).toBe(rawTIN);
    });

    it('rejects statutory registration value if it fails definition format regex', async () => {
      const invalidTIN = 'ABC-XYZ'; // TIN must match ^\d{3}-\d{3}-\d{3}-\d{3,5}$
      const res = await request(app)
        .post(`/api/organizations/${tenantA.id}/legal-entities/${primaryEntityA.id}/statutory-registrations`)
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .send({
          identifierDefinitionId: phTINDef.id,
          value: invalidTIN,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('format');
    });

    it('rejects statutory registration definition code if not belonging to entity country', async () => {
      // Fetch a Singapore CPF definition
      const resDefsSG = await request(app)
        .get('/api/statutory-identifiers/definitions?countryCode=SG')
        .set('Authorization', `Bearer ${tenantAdminAToken}`);
      const sgCPFDef = resDefsSG.body.data.find((d: any) => d.identifierKey === 'CPF');

      // PrimaryEntityA is in PH; try to assign Singapore CPF definition
      const res = await request(app)
        .post(`/api/organizations/${tenantA.id}/legal-entities/${primaryEntityA.id}/statutory-registrations`)
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .send({
          identifierDefinitionId: sgCPFDef.id,
          value: '123456789',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('jurisdiction');
    });
  });

  // ============================================================================
  // 5. ORGANIZATION SETTINGS (PAYROLL, DIVISORS, ATTENDANCE, SECURITY)
  // ============================================================================
  describe('Organization Comprehensive Settings API', () => {
    it('updates working days divisor, currency, attendance, and security configurations', async () => {
      const settingsPayload = {
        settings: {
          payroll: {
            standardWorkingDaysPerYear: 261,
            standardDailyHours: 8,
            prorationMethod: 'WorkingDays',
            statutoryDeductionSplit: 'SplitEqually',
          },
          timeAndAttendance: {
            gracePeriodMinutes: 15,
            overtimeMinimumMinutes: 60,
            allowWebClockIn: true,
            requireGeofence: true,
            geofenceRadiusMeters: 200,
          },
          leaves: {
            allowNegativeBalance: false,
            requireApprovalLevels: 2,
            carryOverLimitDays: 5,
          },
          security: {
            enforce2FA: true,
            protectPayslipWithPassword: true,
            payslipPasswordFormat: 'BIRTHDATE_YYYYMMDD',
          },
        },
      };

      const res = await request(app)
        .patch(`/api/organizations/${tenantA.id}/settings`)
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .send(settingsPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.settings.payroll.standardWorkingDaysPerYear).toBe(261);
      expect(res.body.data.settings.timeAndAttendance.gracePeriodMinutes).toBe(15);
      expect(res.body.data.settings.security.enforce2FA).toBe(true);
      expect(res.body.data.settings.security.protectPayslipWithPassword).toBe(true);
      expect(res.body.data.settings.timeAndAttendance.requireGeofence).toBe(true);
    });

    it('prevents tenant admin from updating another tenant settings (Cross-Tenant 403)', async () => {
      const res = await request(app)
        .patch(`/api/organizations/${tenantB.id}/settings`)
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .send({
          settings: {
            payroll: {
              standardWorkingDaysPerYear: 313,
            },
          },
        });

      expect(res.status).toBe(403);
    });
  });
});
