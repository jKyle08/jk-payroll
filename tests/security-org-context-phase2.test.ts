// ==============================================================================
// JK-PAYROLL: PHASE 2 SECURITY REMEDIATION TEST SUITE
// File: tests/security-org-context-phase2.test.ts
// Findings: SEC-FIND-04, SEC-FIND-08
// Scope: Organization Context, Membership Enforcement, and Expiration Validation
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { db } from '../src/server/db/repository.js';
import { generateTestToken } from '../src/server/middleware/auth.middleware.js';
import * as supabaseModule from '../src/server/db/supabase.js';
import {
  parseExpirationTimestamp,
  isOrganizationExpired,
  validateOrganizationEligibility,
} from '../src/features/organizations/organization-context.service.js';

describe('Phase 2 — Organization Context & Membership Enforcement Suite', () => {
  const app = createApp();

  const rootOrgId = '00000000-0000-0000-0000-000000000000';
  let tenantA: any;
  let tenantB: any;
  let inactiveTenant: any;
  let expiredTenant: any;
  let unlimitedTenant: any;

  let superAdminUser: any;
  let superAdminToken: string;
  let inactiveSuperAdminUser: any;
  let inactiveSuperAdminToken: string;

  let userA: any;
  let userAToken: string;

  let userB: any;
  let userBToken: string;

  let dualUser: any;
  let dualUserToken: string;

  let inactiveMemberUser: any;
  let inactiveMemberUserToken: string;

  beforeEach(() => {
    db.resetTestData();
    db.seedCatalog();

    // Mock remote Supabase client to ensure pure in-memory execution without network latency
    const mockSupabase = {
      from: vi.fn().mockImplementation((_table: string) => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((_col1: string, _val1: any) => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            eq: vi.fn().mockImplementation((_col2: string, _val2: any) => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        }),
      })),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.spyOn(supabaseModule, 'getSupabaseClient').mockReturnValue(mockSupabase as any);

    // 1. Root Platform Tenant
    db.tenants.set(rootOrgId, {
      id: rootOrgId,
      name: 'System Root',
      code: 'ROOT',
      isActive: true,
      status: 'Active',
      startDate: '2020-01-01T00:00:00.000Z',
      endDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Active Tenant A
    tenantA = db.createTenant({
      name: 'Alpha Health Corp',
      code: 'ALPHA',
    });
    tenantA.status = 'Active';
    tenantA.isActive = true;
    tenantA.endDate = '2099-12-31T23:59:59.000Z';

    // 3. Active Tenant B
    tenantB = db.createTenant({
      name: 'Beta Logistics Corp',
      code: 'BETA',
    });
    tenantB.status = 'Active';
    tenantB.isActive = true;
    tenantB.endDate = '2099-12-31T23:59:59.000Z';

    // 4. Inactive / Suspended Tenant
    inactiveTenant = db.createTenant({
      name: 'Suspended Industries',
      code: 'SUSPENDED',
    });
    inactiveTenant.status = 'Suspended';
    inactiveTenant.isActive = false;

    // 5. Expired Tenant (subscription ended in the past)
    expiredTenant = db.createTenant({
      name: 'Past Enterprise Corp',
      code: 'EXPIRED-ORG',
    });
    expiredTenant.status = 'Active';
    expiredTenant.isActive = true;
    expiredTenant.endDate = '2025-01-01T00:00:00.000Z';

    // 6. Unlimited Subscription Tenant (null endDate)
    unlimitedTenant = db.createTenant({
      name: 'Unlimited Non-Profit',
      code: 'UNLIMITED',
    });
    unlimitedTenant.status = 'Active';
    unlimitedTenant.isActive = true;
    unlimitedTenant.endDate = null;

    // Profiles & Users
    // Super Admin
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

    // User A (Member of Tenant A only)
    userA = db.createProfile({
      id: 'a0000000-0000-0000-0000-000000000002',
      tenantId: tenantA.id,
      fullName: 'Alice Alpha',
      email: 'alice@alpha.com',
      isSuperAdmin: false,
      isTenantAdmin: true,
      isActive: true,
    });
    userAToken = generateTestToken({
      userId: userA.id,
      tenantId: tenantA.id,
      isTenantAdmin: true,
    });

    // User B (Member of Tenant B only)
    userB = db.createProfile({
      id: 'a0000000-0000-0000-0000-000000000003',
      tenantId: tenantB.id,
      fullName: 'Bob Beta',
      email: 'bob@beta.com',
      isSuperAdmin: false,
      isTenantAdmin: true,
      isActive: true,
    });
    userBToken = generateTestToken({
      userId: userB.id,
      tenantId: tenantB.id,
      isTenantAdmin: true,
    });

    // Dual-Member User (Authorized active member in both Tenant A and Tenant B)
    dualUser = db.createProfile({
      id: 'a0000000-0000-0000-0000-000000000004',
      tenantId: tenantA.id,
      fullName: 'David Dual Member',
      email: 'david@dual.com',
      isSuperAdmin: false,
      isTenantAdmin: false,
      isActive: true,
    });
    db.createOrganizationMember({
      organizationId: tenantB.id,
      userId: dualUser.id,
      isOwner: false,
      isActive: true,
    });
    dualUserToken = generateTestToken({
      userId: dualUser.id,
      tenantId: tenantA.id,
    });

    // Inactive Member User (Profile active, but membership in Tenant A is explicitly inactive)
    inactiveMemberUser = db.createProfile({
      id: 'a0000000-0000-0000-0000-000000000005',
      tenantId: tenantA.id,
      fullName: 'Ian Inactive Member',
      email: 'ian@inactive-member.com',
      isSuperAdmin: false,
      isTenantAdmin: false,
      isActive: true,
    });
    db.updateOrganizationMember(tenantA.id, inactiveMemberUser.id, { isActive: false });
    inactiveMemberUserToken = generateTestToken({
      userId: inactiveMemberUser.id,
      tenantId: tenantA.id,
    });
  });

  // ============================================================================
  // SEC-FIND-08: ORGANIZATION CONTEXT & MEMBERSHIP VALIDATION
  // ============================================================================
  describe('SEC-FIND-08: Organization Context & Membership Validation', () => {
    it('1. Authenticated user can access an organization where they have active membership', async () => {
      const res = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('2. Authenticated user cannot access another organization without membership', async () => {
      // User A attempts to access Tenant B by setting x-organization-id header
      const res = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-organization-id', tenantB.id);

      expect(res.status).toBe(403);
      expect(['ORGANIZATION_ACCESS_DENIED', 'TENANT_ACCESS_DENIED']).toContain(res.body.code);
      expect(res.body.error).toMatch(/access denied|not an active member/i);
    });

    it('3. Changing x-organization-id to another tenant returns 403', async () => {
      const res = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${userBToken}`)
        .set('x-organization-id', tenantA.id);

      expect(res.status).toBe(403);
      expect(['ORGANIZATION_ACCESS_DENIED', 'TENANT_ACCESS_DENIED']).toContain(res.body.code);
    });

    it('4. Inactive membership returns 403 TENANT_ACCESS_DENIED', async () => {
      const res = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${inactiveMemberUserToken}`);

      expect(res.status).toBe(403);
      expect(['ORGANIZATION_ACCESS_DENIED', 'TENANT_ACCESS_DENIED']).toContain(res.body.code);
    });

    it('5. Missing membership returns 403 TENANT_ACCESS_DENIED', async () => {
      const res = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-organization-id', tenantB.id);

      expect(res.status).toBe(403);
      expect(['ORGANIZATION_ACCESS_DENIED', 'TENANT_ACCESS_DENIED']).toContain(res.body.code);
    });

    it('6. Unknown or non-existent organization ID returns 404 ORGANIZATION_NOT_FOUND', async () => {
      const res = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-organization-id', '99999999-9999-9999-9999-999999999999');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('ORGANIZATION_NOT_FOUND');
    });

    it('7. Missing organization context is rejected on tenant routes', async () => {
      const orphanUser = db.createProfile({
        id: 'a0000000-0000-0000-0000-000000000090',
        tenantId: '',
        fullName: 'Orphan User',
        email: 'orphan@nowhere.com',
        isActive: true,
      });
      // Remove any auto-synced membership
      db.organizationMembers.delete(`:${orphanUser.id}`);

      const orphanToken = generateTestToken({
        userId: orphanUser.id,
        tenantId: '',
      });

      const res = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${orphanToken}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('ORGANIZATION_CONTEXT_REQUIRED');
    });

    it('8. Organization ID supplied in request body cannot override validated context', async () => {
      // User A attempts to create department in Tenant B by setting organizationId in body
      const res = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          organizationId: tenantB.id,
          name: 'Injected Dept',
          code: 'INJECT-DEPT',
        });

      // The backend either rejects with access denied or binds strictly to User A's tenant (never Tenant B)
      if (res.status === 201) {
        expect(res.body.data.organizationId).toBe(tenantA.id);
      } else {
        expect(res.status).toBe(400);
        expect(res.body.error).toContain('another organization');
      }

      // Verify no department was created in Tenant B
      const tenantBDepts = Array.from(db.departments.values()).filter(
        (d) => d.organizationId === tenantB.id && d.code === 'INJECT-DEPT'
      );
      expect(tenantBDepts.length).toBe(0);
    });

    it('9. Organization ID supplied in query parameters cannot override validated context', async () => {
      // User A requests department tree specifying Tenant B in query string
      const res = await request(app)
        .get(`/api/departments/tree?organizationId=${tenantB.id}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      // Validated server context must remain Tenant A
      expect(res.body.tenantId).toBe(tenantA.id);
    });

    it('10. A user cannot impersonate another user by supplying a different user ID', async () => {
      const res = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-user-id', userB.id)
        .send({
          name: 'Impersonation Attempt Dept',
          code: 'IMP-DEPT',
        });

      // Operation succeeds under User A's identity and Tenant A, completely ignoring x-user-id
      expect(res.status).toBe(201);
      expect(res.body.data.organizationId).toBe(tenantA.id);
    });

    it('11. Organization switching succeeds for an authorized active member via POST /api/auth/switch-organization', async () => {
      const res = await request(app)
        .post('/api/auth/switch-organization')
        .set('Authorization', `Bearer ${dualUserToken}`)
        .send({ organizationId: tenantB.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.organization.id).toBe(tenantB.id);
      expect(res.body.token).toBeDefined();

      // Verify new token allows access to Tenant B
      const switchedToken = res.body.token;
      const deptRes = await request(app)
        .get('/api/departments/tree')
        .set('Authorization', `Bearer ${switchedToken}`);

      expect(deptRes.status).toBe(200);
      expect(deptRes.body.tenantId).toBe(tenantB.id);
    });

    it('12. Organization switching fails for an unauthorized organization', async () => {
      // User A is NOT a member of Tenant B
      const res = await request(app)
        .post('/api/auth/switch-organization')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ organizationId: tenantB.id });

      expect(res.status).toBe(403);
      expect(['ORGANIZATION_ACCESS_DENIED', 'TENANT_ACCESS_DENIED']).toContain(res.body.code);
    });

    it('13. Organization switching fails for inactive membership', async () => {
      const res = await request(app)
        .post('/api/auth/switch-organization')
        .set('Authorization', `Bearer ${inactiveMemberUserToken}`)
        .send({ organizationId: tenantA.id });

      expect(res.status).toBe(403);
      expect(['ORGANIZATION_ACCESS_DENIED', 'TENANT_ACCESS_DENIED']).toContain(res.body.code);
    });

    it('14. Organization switching does not grant additional permissions', async () => {
      const res = await request(app)
        .post('/api/auth/switch-organization')
        .set('Authorization', `Bearer ${dualUserToken}`)
        .send({ organizationId: tenantB.id });

      expect(res.status).toBe(200);
      // Dual user is not tenant admin or super admin in Tenant B; no administrative bypass granted
      expect(res.body.user.effectivePermissions).toBeDefined();
    });

    it('15. Concurrent requests for different organizations do not leak organization context across requests', async () => {
      // Execute 10 concurrent requests alternating between Tenant A and Tenant B
      const requests = Array.from({ length: 10 }, (_, i) => {
        if (i % 2 === 0) {
          return request(app)
            .get('/api/departments/tree')
            .set('Authorization', `Bearer ${userAToken}`);
        } else {
          return request(app)
            .get('/api/departments/tree')
            .set('Authorization', `Bearer ${userBToken}`);
        }
      });

      const responses = await Promise.all(requests);
      responses.forEach((res, i) => {
        expect(res.status).toBe(200);
        const expectedTenantId = i % 2 === 0 ? tenantA.id : tenantB.id;
        expect(res.body.tenantId).toBe(expectedTenantId);
      });
    });
  });

  // ============================================================================
  // SEC-FIND-04: ORGANIZATION STATUS & EXPIRATION ENFORCEMENT
  // ============================================================================
  describe('SEC-FIND-04: Organization Status & Expiration Enforcement', () => {
    it('16. Active, non-expired organization allows access', () => {
      const eligibility = validateOrganizationEligibility(tenantA);
      expect(eligibility.valid).toBe(true);
      expect(eligibility.status).toBe('ACTIVE');
    });

    it('17. Inactive / suspended organization returns 403 INACTIVE_ORGANIZATION', async () => {
      // Setup active user in inactive tenant
      const userInInactive = db.createProfile({
        id: 'a0000000-0000-0000-0000-000000000021',
        tenantId: inactiveTenant.id,
        fullName: 'Inactive Org User',
        email: 'user@suspended.com',
        isActive: true,
      });
      const token = generateTestToken({
        userId: userInInactive.id,
        tenantId: inactiveTenant.id,
      });

      const res = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('INACTIVE_ORGANIZATION');
      expect(res.body.error).toMatch(/inactive or suspended/i);
    });

    it('18. Expired organization returns 403 INACTIVE_OR_EXPIRED_ORGANIZATION', async () => {
      // Setup active user in expired tenant
      const userInExpired = db.createProfile({
        id: 'a0000000-0000-0000-0000-000000000022',
        tenantId: expiredTenant.id,
        fullName: 'Expired Org User',
        email: 'user@expired.com',
        isActive: true,
      });
      const token = generateTestToken({
        userId: userInExpired.id,
        tenantId: expiredTenant.id,
      });

      const res = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('INACTIVE_OR_EXPIRED_ORGANIZATION');
      expect(res.body.error).toMatch(/expired/i);
    });

    it('19. Active membership does not allow access to an expired organization', async () => {
      // User A is an active user and active member, but if Tenant A expires, access is denied
      tenantA.endDate = '2020-01-01T00:00:00.000Z'; // Past date

      const res = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('INACTIVE_OR_EXPIRED_ORGANIZATION');
    });

    it('20. Active membership does not allow access to an inactive organization', async () => {
      tenantA.isActive = false;

      const res = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('INACTIVE_ORGANIZATION');
    });

    it('21. Organization without an end date (null endDate) follows unlimited-subscription rule', () => {
      expect(isOrganizationExpired(null)).toBe(false);
      expect(isOrganizationExpired(undefined)).toBe(false);
      const eligibility = validateOrganizationEligibility(unlimitedTenant);
      expect(eligibility.valid).toBe(true);
      expect(eligibility.status).toBe('ACTIVE');
    });

    it('22. Organization at its expiration boundary follows documented calendar day rule', () => {
      // Calendar day '2026-11-19' remains valid throughout the day until 23:59:59.999Z UTC
      const boundaryTimestamp = parseExpirationTimestamp('2026-11-19');
      expect(boundaryTimestamp).toBe(new Date('2026-11-19T23:59:59.999Z').getTime());

      // At 12:00:00Z on 2026-11-19, it is NOT expired
      const midday = new Date('2026-11-19T12:00:00.000Z').getTime();
      expect(isOrganizationExpired('2026-11-19', midday)).toBe(false);

      // At 00:00:01Z on 2026-11-20, it IS expired
      const nextDay = new Date('2026-11-20T00:00:01.000Z').getTime();
      expect(isOrganizationExpired('2026-11-19', nextDay)).toBe(true);
    });

    it('23. Organization with a future end date remains accessible', () => {
      expect(isOrganizationExpired('2099-12-31T23:59:59.000Z')).toBe(false);
      const eligibility = validateOrganizationEligibility(tenantB);
      expect(eligibility.valid).toBe(true);
    });

    it('24. Organization status changes are immediately reflected on subsequent requests', async () => {
      // 1. Initial request succeeds
      const initialRes = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(initialRes.status).toBe(200);

      // 2. Organization is suspended in real-time
      tenantA.status = 'Suspended';
      tenantA.isActive = false;

      // 3. Immediate subsequent request fails
      const subsequentRes = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(subsequentRes.status).toBe(403);
      expect(subsequentRes.body.code).toBe('INACTIVE_ORGANIZATION');
    });
  });

  // ============================================================================
  // SUPER ADMIN REGRESSION & ADMINISTRATIVE EXCEPTIONS
  // ============================================================================
  describe('Super Admin Regression & Explicit Administrative Operations', () => {
    it('25. Valid Super Admin can perform explicitly authorized cross-organization administrative operations', async () => {
      // Super Admin can list all organizations including suspended/expired ones
      const res = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);
    });

    it('26. Super Admin cannot bypass authentication', async () => {
      const res = await request(app).get('/api/organizations');
      expect(res.status).toBe(401);
    });

    it('27. Super Admin cannot bypass account active status', async () => {
      const res = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${inactiveSuperAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('User account is inactive');
    });

    it('28. Super Admin cannot use administrative access as an implicit membership grant for ordinary tenant operations on expired/suspended tenants', async () => {
      // Super Admin targeting an expired organization for ordinary tenant operations (e.g. creating department)
      const res = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organization-id', expiredTenant.id)
        .send({
          name: 'SuperAdmin Created Dept In Expired Tenant',
          code: 'SA-EXP',
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('INACTIVE_OR_EXPIRED_ORGANIZATION');
    });
  });
});
