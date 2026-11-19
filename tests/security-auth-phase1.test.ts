// ==============================================================================
// JK-PAYROLL: PHASE 1 SECURITY REMEDIATION TEST SUITE
// File: tests/security-auth-phase1.test.ts
// Findings: SEC-FIND-01, SEC-FIND-02, SEC-FIND-03, SEC-FIND-05
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/server/app.js';
import { db } from '../src/server/db/repository.js';
import { ENV, validateEnv } from '../src/server/config/env.js';
import { generateTestToken } from '../src/server/middleware/auth.middleware.js';
import { authService } from '../src/features/auth/auth.service.js';
import { isSuperAdmin, requireSuperAdmin, requireTenantAdmin, requirePermission } from '../src/server/middleware/rbac.guard.js';
import * as supabaseModule from '../src/server/db/supabase.js';

describe('Phase 1 — Authentication & Privileged Account Security Remediation Suite', () => {
  const app = createApp();

  const rootOrgId = '00000000-0000-0000-0000-000000000000';
  let tenantA: any;
  let tenantB: any;
  let superAdminUser: any;
  let superAdminToken: string;
  let regularUserA: any;
  let regularUserAToken: string;
  let inactiveSuperAdminUser: any;
  let inactiveSuperAdminToken: string;

  beforeEach(() => {
    db.resetTestData();
    db.seedCatalog();

    // Setup Root Tenant
    db.tenants.set(rootOrgId, {
      id: rootOrgId,
      name: 'System Root',
      code: 'ROOT',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Active Super Admin
    superAdminUser = db.createProfile({
      id: 'a0000000-0000-0000-0000-000000000001',
      tenantId: rootOrgId,
      fullName: 'Master Super Admin',
      email: 'superadmin@paypulse.internal',
      isSuperAdmin: true,
      isTenantAdmin: true,
      isActive: true,
    });
    superAdminToken = generateTestToken({
      userId: superAdminUser.id,
      tenantId: rootOrgId,
      isSuperAdmin: true,
    });

    // Inactive Super Admin
    inactiveSuperAdminUser = db.createProfile({
      id: 'a0000000-0000-0000-0000-000000000099',
      tenantId: rootOrgId,
      fullName: 'Inactive Super Admin',
      email: 'inactive-admin@paypulse.internal',
      isSuperAdmin: true,
      isTenantAdmin: true,
      isActive: false,
    });
    inactiveSuperAdminToken = generateTestToken({
      userId: inactiveSuperAdminUser.id,
      tenantId: rootOrgId,
      isSuperAdmin: true,
    });

    // Tenant A & Regular User
    tenantA = db.createTenant({ name: 'Alpha Corporation', code: 'ALPHA' });
    tenantB = db.createTenant({ name: 'Beta Corporation', code: 'BETA' });

    regularUserA = db.createProfile({
      id: 'a0000000-0000-0000-0000-000000000002',
      tenantId: tenantA.id,
      fullName: 'Alice Regular',
      email: 'alice@alpha.com',
      isSuperAdmin: false,
      isTenantAdmin: false,
      isActive: true,
    });
    regularUserAToken = generateTestToken({
      userId: regularUserA.id,
      tenantId: tenantA.id,
      isSuperAdmin: false,
    });
  });

  // ============================================================================
  // SEC-FIND-01: SECURE JWT CONFIGURATION & STARTUP VALIDATION
  // ============================================================================
  describe('SEC-FIND-01: Secure JWT Configuration & Startup Validation', () => {
    it('Production startup fails when Supabase configuration is missing or incomplete', () => {
      expect(() => {
        validateEnv({
          NODE_ENV: 'production',
          SUPABASE_URL: '',
          SUPABASE_ANON_KEY: 'test-anon-key',
          SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        });
      }).toThrow(/Production Configuration Error/i);

      expect(() => {
        validateEnv({
          NODE_ENV: 'production',
          SUPABASE_URL: 'https://placeholder-project.supabase.co',
          SUPABASE_ANON_KEY: 'test-anon-key',
          SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        });
      }).toThrow(/Production Configuration Error/i);
    });

    it('Production startup fails if ALLOW_LOCAL_JWT is enabled', () => {
      expect(() => {
        validateEnv({
          NODE_ENV: 'production',
          ALLOW_LOCAL_JWT: 'true',
          SUPABASE_URL: 'https://actual-proj.supabase.co',
          SUPABASE_ANON_KEY: 'valid-anon-key',
          SUPABASE_SERVICE_ROLE_KEY: 'valid-service-role-key',
        });
      }).toThrow(/Local JWT authentication .* cannot be enabled in production/i);
    });

    it('Development rejects startup when ALLOW_LOCAL_JWT is enabled but JWT_SECRET is missing', () => {
      expect(() => {
        validateEnv({
          NODE_ENV: 'development',
          ALLOW_LOCAL_JWT: 'true',
          JWT_SECRET: '',
        });
      }).toThrow(/JWT_SECRET must be explicitly provided when ALLOW_LOCAL_JWT is enabled/i);
    });

    it('Test mode functions properly with explicit test configuration and no hardcoded secret fallback', () => {
      const config = validateEnv({
        NODE_ENV: 'test',
        JWT_SECRET: 'custom-explicit-test-secret-key-32chars',
      });
      expect(config.ALLOW_LOCAL_JWT).toBe(true);
      expect(config.JWT_SECRET).toBe('custom-explicit-test-secret-key-32chars');
      expect(config.JWT_ISSUER).toBe('jk-payroll');
      expect(config.JWT_AUDIENCE).toBe('jk-payroll-api');
    });

    it('No hardcoded secret fallback exists in configuration', () => {
      const config = validateEnv({
        NODE_ENV: 'development',
        ALLOW_LOCAL_JWT: 'false',
        JWT_SECRET: '',
      });
      expect(config.JWT_SECRET).toBe('');
      expect(config.ALLOW_LOCAL_JWT).toBe(false);
    });

    it('Production rejects local JWT authentication at runtime', async () => {
      // Temporarily set NODE_ENV to production
      const originalNodeEnv = ENV.NODE_ENV;
      (ENV as any).NODE_ENV = 'production';

      try {
        const localToken = generateTestToken({
          userId: superAdminUser.id,
          tenantId: rootOrgId,
        });

        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${localToken}`);

        expect(res.status).toBe(401);
        expect(res.body.error).toContain('Local JWT tokens are not permitted in production');
      } finally {
        (ENV as any).NODE_ENV = originalNodeEnv;
      }
    });
  });

  // ============================================================================
  // SEC-FIND-02: REMOVE BACKDOOR CREDENTIALS & AUTO-PROVISIONING
  // ============================================================================
  describe('SEC-FIND-02: Remove Backdoor Credentials and Automatic Provisioning', () => {
    it('Hardcoded Super Admin credentials cannot authenticate via login endpoint', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'superadmin@jkpayroll.com',
          password: 'SuperAdmin123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid email or password');
    });

    it('Hardcoded demo credentials cannot authenticate via login endpoint', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@apexcorp.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid email or password');
    });

    it('Failed login does not automatically provision any privileged user in database', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'superadmin@paypulse.internal',
          password: 'SuperAdmin2026!',
        });

      // Verify no backdoor user was created in db repository
      const profiles = Array.from(db.profiles.values());
      const backdoorProfile = profiles.find((p) => p.email === 'superadmin@jkpayroll.com');
      expect(backdoorProfile).toBeUndefined();
    });

    it('Email matching superadmin cannot auto-elevate or create root tenant on session resolution', async () => {
      // Mock Supabase admin getUserById returning superadmin email, but profile doesn't exist
      const mockSupabase = {
        auth: {
          admin: {
            getUserById: vi.fn().mockResolvedValue({
              data: { user: { id: 'unregistered-superadmin-uuid', email: 'superadmin@jkpayroll.com' } },
              error: null,
            }),
          },
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
            }),
          }),
        }),
      };

      vi.spyOn(supabaseModule, 'getSupabaseClient').mockReturnValue(mockSupabase as any);

      await expect(
        authService.resolveUserSession('unregistered-superadmin-uuid')
      ).rejects.toThrow(/Profile not found for user/i);

      vi.restoreAllMocks();
    });

    it('Development provisioning helper cannot be executed in production environment', async () => {
      const originalNodeEnv = ENV.NODE_ENV;
      (ENV as any).NODE_ENV = 'production';

      try {
        await expect(
          authService.provisionTestSuperAdmin('admin@prod.test', 'Password123!')
        ).rejects.toThrow(/Security Violation: provisionTestSuperAdmin is forbidden in production/i);
      } finally {
        (ENV as any).NODE_ENV = originalNodeEnv;
      }
    });
  });

  // ============================================================================
  // SEC-FIND-03: ENFORCE JWT CLAIMS AND STRICT VERIFICATION RULES
  // ============================================================================
  describe('SEC-FIND-03: Strict JWT Algorithm, Issuer, Audience, and Claims Validation', () => {
    it('Valid token with correct signature, issuer, audience, and algorithm succeeds', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${regularUserAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.userId).toBe(regularUserA.id);
    });

    it('Token signed with invalid secret signature fails with 401', async () => {
      const tamperedToken = jwt.sign(
        { sub: regularUserA.id },
        'different-secret-key-that-does-not-match-jwt-secret!',
        { algorithm: 'HS256', issuer: ENV.JWT_ISSUER, audience: ENV.JWT_AUDIENCE, expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('Expired token fails with 401', async () => {
      const expiredToken = jwt.sign(
        { sub: regularUserA.id },
        ENV.JWT_SECRET,
        { algorithm: 'HS256', issuer: ENV.JWT_ISSUER, audience: ENV.JWT_AUDIENCE, expiresIn: '-10s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('Token with incorrect issuer fails with 401', async () => {
      const wrongIssuerToken = jwt.sign(
        { sub: regularUserA.id },
        ENV.JWT_SECRET,
        { algorithm: 'HS256', issuer: 'rogue-issuer-identity', audience: ENV.JWT_AUDIENCE, expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${wrongIssuerToken}`);

      expect(res.status).toBe(401);
    });

    it('Token missing issuer fails with 401', async () => {
      const noIssuerToken = jwt.sign(
        { sub: regularUserA.id },
        ENV.JWT_SECRET,
        { algorithm: 'HS256', audience: ENV.JWT_AUDIENCE, expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${noIssuerToken}`);

      expect(res.status).toBe(401);
    });

    it('Token with incorrect audience fails with 401', async () => {
      const wrongAudienceToken = jwt.sign(
        { sub: regularUserA.id },
        ENV.JWT_SECRET,
        { algorithm: 'HS256', issuer: ENV.JWT_ISSUER, audience: 'wrong-api-audience', expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${wrongAudienceToken}`);

      expect(res.status).toBe(401);
    });

    it('Token missing audience fails with 401', async () => {
      const noAudienceToken = jwt.sign(
        { sub: regularUserA.id },
        ENV.JWT_SECRET,
        { algorithm: 'HS256', issuer: ENV.JWT_ISSUER, expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${noAudienceToken}`);

      expect(res.status).toBe(401);
    });

    it('Token signed with unsupported algorithm (e.g. HS512) fails with 401', async () => {
      const hs512Token = jwt.sign(
        { sub: regularUserA.id },
        ENV.JWT_SECRET,
        { algorithm: 'HS512', issuer: ENV.JWT_ISSUER, audience: ENV.JWT_AUDIENCE, expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${hs512Token}`);

      expect(res.status).toBe(401);
    });

    it('Token missing subject claim fails with 401', async () => {
      const noSubToken = jwt.sign(
        { email: 'user@alpha.com' },
        ENV.JWT_SECRET,
        { algorithm: 'HS256', issuer: ENV.JWT_ISSUER, audience: ENV.JWT_AUDIENCE, expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${noSubToken}`);

      expect(res.status).toBe(401);
    });

    it('Malformed token string fails immediately with 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-valid-jwt-token-string');

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Malformed token');
    });
  });

  // ============================================================================
  // SEC-FIND-05: HARDEN SUPER ADMIN AUTHORIZATION
  // ============================================================================
  describe('SEC-FIND-05: Harden Super Admin Authorization & Privilege Checks', () => {
    it('Valid active Super Admin is authoritatively recognized by isSuperAdmin() helper', () => {
      expect(isSuperAdmin(superAdminUser)).toBe(true);
    });

    it('Inactive Super Admin is rejected by isSuperAdmin() helper and middleware', async () => {
      expect(isSuperAdmin(inactiveSuperAdminUser)).toBe(false);

      // Verify HTTP rejection on privileged endpoint
      const res = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${inactiveSuperAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('User account is inactive');
    });

    it('Inactive account cannot bypass requireSuperAdmin guard', () => {
      const mockReq: any = { user: inactiveSuperAdminUser };
      let statusCode: number | null = null;
      let errorBody: any = null;
      const mockRes: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (body: any) => { errorBody = body; },
          };
        },
      };
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      const guard = requireSuperAdmin();
      guard(mockReq, mockRes, next);

      expect(nextCalled).toBe(false);
      expect(statusCode).toBe(403);
      expect(errorBody.error).toContain('User account is inactive');
    });

    it('Inactive account cannot bypass requireTenantAdmin guard', () => {
      const mockReq: any = { user: inactiveSuperAdminUser };
      let statusCode: number | null = null;
      const mockRes: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => body };
        },
      };
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      const guard = requireTenantAdmin();
      guard(mockReq, mockRes, next);

      expect(nextCalled).toBe(false);
      expect(statusCode).toBe(403);
    });

    it('Inactive account cannot bypass requirePermission guard', () => {
      const mockReq: any = { user: inactiveSuperAdminUser };
      let statusCode: number | null = null;
      const mockRes: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => body };
        },
      };
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      const guard = requirePermission('TypeOfLeave.View');
      guard(mockReq, mockRes, next);

      expect(nextCalled).toBe(false);
      expect(statusCode).toBe(403);
    });

    it('Ordinary user cannot impersonate Super Admin through frontend role parameter or property', async () => {
      // Ordinary user attempts listing organizations with untyped role injection
      const res = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${regularUserAToken}`)
        .send({ role: 'SuperAdmin' });

      expect(res.status).toBe(200);
      // Scoped strictly to Tenant A; does NOT list Tenant B or Root
      expect(res.body.data.every((org: any) => org.id === tenantA.id)).toBe(true);
    });

    it('Ordinary user cannot gain privileges through forged JWT isSuperAdmin: true claim', async () => {
      const forgedToken = jwt.sign(
        {
          sub: regularUserA.id,
          email: 'alice@alpha.com',
          tenant_id: tenantA.id,
          isSuperAdmin: true,
          role: 'SuperAdmin',
        },
        ENV.JWT_SECRET,
        { algorithm: 'HS256', issuer: ENV.JWT_ISSUER, audience: ENV.JWT_AUDIENCE, expiresIn: '1h' }
      );

      // Attempt to access Super Admin endpoint (/api/super-admin/tenants)
      const res = await request(app)
        .post('/api/super-admin/tenants')
        .set('Authorization', `Bearer ${forgedToken}`)
        .send({ name: 'Malicious Org', code: 'MAL' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Super Admin privilege required');
    });

    it('Missing role assignment or regular user privileges cannot access privileged endpoints', async () => {
      const res = await request(app)
        .post('/api/super-admin/tenants')
        .set('Authorization', `Bearer ${regularUserAToken}`)
        .send({ name: 'Unauthorized Tenant', code: 'UNAUTH' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Super Admin privilege required');
    });

    it('Existing authorization checks continue to enforce required permissions for regular users', async () => {
      // Regular user without departments:create cannot create department
      const res = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${regularUserAToken}`)
        .send({
          name: 'Unauthorized Dept',
          code: 'UNAUTH-DEPT',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Forbidden|Insufficient permissions/i);
    });
  });
});
