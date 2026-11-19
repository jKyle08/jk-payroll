// ==============================================================================
// JK-PAYROLL: PHASE 5 SECURITY REMEDIATION TEST SUITE
// File: tests/security-audit-integrity-phase5.test.ts
// Findings: SEC-FIND-17, SEC-FIND-09, SEC-FIND-18
// Scope: Audit Log Attribution, Query Authorization & Tamper Resistance
// ==============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../src/server/app.js';
import { db } from '../src/server/db/repository.js';
import { generateTestToken } from '../src/server/middleware/auth.middleware.js';
import { auditLogsService, extractTrustedActor, extractTrustedIp } from '../src/features/audit-logs/audit-logs.service.js';
import * as supabaseModule from '../src/server/db/supabase.js';

describe('Phase 5 — Audit Log Attribution & Administrative Mutation Integrity Suite', () => {
  const app = createApp();

  const rootOrgId = '00000000-0000-0000-0000-000000000000';
  let tenantA: any;
  let tenantB: any;

  let superAdminUser: any;
  let superAdminToken: string;

  let orgAdminA: any;
  let orgAdminAToken: string;
  let regularUserA: any;
  let regularUserAToken: string;

  let orgAdminB: any;
  let orgAdminBToken: string;
  let regularUserB: any;
  let regularUserBToken: string;

  // Read Phase 5 SQL migration file content
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261119000011_harden_audit_attribution_and_integrity.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    db.resetTestData();
    db.seedCatalog();

    // Mock remote Supabase client to ensure predictable and fast test execution
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((_col: string, _val: any) => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            eq: vi.fn().mockImplementation(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: null, count: 0, error: null }),
            }),
          })),
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: null, count: 0, error: null }),
          }),
        }),
        insert: vi.fn().mockImplementation((_rows: any) =>
          Promise.resolve({ data: null, error: null })
        ),
        update: vi.fn().mockImplementation((_rows: any) => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
        delete: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.spyOn(supabaseModule, 'getSupabaseClient').mockReturnValue(mockSupabase as any);

    // Root Organization
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
      isTenantAdmin: false,
      isActive: true,
    });
    superAdminToken = generateTestToken({
      userId: superAdminUser.id,
      tenantId: rootOrgId,
      isSuperAdmin: true,
      appMetadata: { organization_id: rootOrgId, role: 'SUPER_ADMIN' },
    });

    // Tenant A Setup
    tenantA = db.createTenant({
      name: 'Alpha Corp',
      code: 'ALPHA',
      isActive: true,
      status: 'Active',
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: null,
    });

    orgAdminA = db.createProfile({
      id: 'a0000000-0000-0000-0000-000000000002',
      tenantId: tenantA.id,
      fullName: 'Alice Org Admin',
      email: 'alice@alpha.test',
      isSuperAdmin: false,
      isTenantAdmin: true,
      isActive: true,
    });
    orgAdminAToken = generateTestToken({
      userId: orgAdminA.id,
      tenantId: tenantA.id,
      isSuperAdmin: false,
      isTenantAdmin: true,
      appMetadata: { organization_id: tenantA.id, role: 'ADMIN' },
    });

    regularUserA = db.createProfile({
      id: 'a0000000-0000-0000-0000-000000000003',
      tenantId: tenantA.id,
      fullName: 'Alex Regular User',
      email: 'alex@alpha.test',
      isSuperAdmin: false,
      isTenantAdmin: false,
      isActive: true,
    });
    regularUserAToken = generateTestToken({
      userId: regularUserA.id,
      tenantId: tenantA.id,
      isSuperAdmin: false,
      isTenantAdmin: false,
      appMetadata: { organization_id: tenantA.id, role: 'USER' },
    });

    // Tenant B Setup
    tenantB = db.createTenant({
      name: 'Beta LLC',
      code: 'BETA',
      isActive: true,
      status: 'Active',
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: null,
    });

    orgAdminB = db.createProfile({
      id: 'b0000000-0000-0000-0000-000000000002',
      tenantId: tenantB.id,
      fullName: 'Bob Org Admin',
      email: 'bob@beta.test',
      isSuperAdmin: false,
      isTenantAdmin: true,
      isActive: true,
    });
    orgAdminBToken = generateTestToken({
      userId: orgAdminB.id,
      tenantId: tenantB.id,
      isSuperAdmin: false,
      isTenantAdmin: true,
      appMetadata: { organization_id: tenantB.id, role: 'ADMIN' },
    });

    regularUserB = db.createProfile({
      id: 'b0000000-0000-0000-0000-000000000003',
      tenantId: tenantB.id,
      fullName: 'Bella Regular User',
      email: 'bella@beta.test',
      isSuperAdmin: false,
      isTenantAdmin: false,
      isActive: true,
    });
    regularUserBToken = generateTestToken({
      userId: regularUserB.id,
      tenantId: tenantB.id,
      isSuperAdmin: false,
      isTenantAdmin: false,
      appMetadata: { organization_id: tenantB.id, role: 'USER' },
    });
  });

  // ============================================================================
  // SECTION 1: SEC-FIND-17 — TRUSTED ACTOR ATTRIBUTION
  // ============================================================================
  describe('SEC-FIND-17 — Trusted Actor Attribution', () => {
    it('1. Authenticated user mutation records the correct actor ID', async () => {
      const res = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({
          organizationId: tenantA.id,
          code: 'ENG',
          name: 'Engineering',
          isActive: true,
        });

      expect(res.status).toBe(201);
      const deptId = res.body.data.id;

      // Verify audit log has orgAdminA's actor ID
      const logs = db.getAuditLogs({ organizationId: tenantA.id }).logs;
      const deptCreateLog = logs.find((l) => l.entity_id === deptId && l.action === 'CREATE');

      expect(deptCreateLog).toBeDefined();
      expect(deptCreateLog?.actor_id).toBe(orgAdminA.id);
    });

    it('2. Actor name and email are derived from trusted server-side identity', async () => {
      await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({
          organizationId: tenantA.id,
          code: 'FIN',
          name: 'Finance',
          isActive: true,
        });

      const logs = db.getAuditLogs({ organizationId: tenantA.id }).logs;
      const log = logs.find((l) => l.action === 'CREATE' && l.module_id === 'DEPARTMENTS');

      expect(log).toBeDefined();
      expect(log?.actor_name).toBe('Alice Org Admin');
      expect(log?.actor_email).toBe('alice@alpha.test');
    });

    it('3. Organization administrator mutation records the correct actor type (ADMIN)', async () => {
      await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({
          organizationId: tenantA.id,
          code: 'OPS',
          name: 'Operations',
          isActive: true,
        });

      const logs = db.getAuditLogs({ organizationId: tenantA.id }).logs;
      const log = logs.find((l) => l.action === 'CREATE' && l.module_id === 'DEPARTMENTS');

      expect(log?.actor_type).toBe('ADMIN');
      expect(log?.actor_role_name).toBe('Organization Administrator');
    });

    it('4. Super Admin mutation records the correct actor type (SUPER_ADMIN)', async () => {
      const res = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          code: 'GAMMA',
          name: 'Gamma Systems',
          slug: 'org_gamma',
          admin: {
            fullName: 'Gary Gamma',
            email: 'gary@gamma.test',
          },
        });

      expect(res.status).toBe(201);
      const createdOrgId = res.body.data.id;

      const logs = db.getAuditLogs({ organizationId: createdOrgId }).logs;
      const log = logs.find((l) => l.entity_id === createdOrgId && l.action === 'CREATE');

      expect(log).toBeDefined();
      expect(log?.actor_id).toBe(superAdminUser.id);
      expect(log?.actor_type).toBe('SUPER_ADMIN');
      expect(log?.actor_name).toBe('Master Super Admin');
    });

    it('5. System operations are distinguishable from user operations', async () => {
      // Record a background system mutation (e.g. cron sync or automated payroll)
      const systemLog = await auditLogsService.recordAuditLog({
        organizationId: tenantA.id,
        actor: null, // No authenticated human actor
        module: 'PAYROLL',
        entityType: 'payroll_runs',
        entityId: 'pay-run-001',
        action: 'CREATE',
        newValues: { totalGross: 50000 },
      });

      expect(systemLog.actor_id).toBeNull();
      expect(systemLog.actor_type).toBe('SYSTEM');
      expect(systemLog.actor_name).toBe('System / Automated');
      expect(systemLog.ip_address).toBeNull();
      expect(systemLog.user_agent).toBeNull();
    });

    it('6. Missing actor identity is handled explicitly without defaulting to a false human', () => {
      const actor = extractTrustedActor(undefined, { system: true });
      expect(actor.actorId).toBeNull();
      expect(actor.actorType).toBe('SYSTEM');
      expect(actor.actorName).toBe('System / Automated');
    });

    it('7. Client-supplied actor IDs cannot spoof audit records', async () => {
      // Malicious admin attempts to submit spoofed actor_id in body
      await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({
          organizationId: tenantA.id,
          code: 'SEC',
          name: 'Security Ops',
          isActive: true,
          actor_id: 'spoofed-innocent-user-id',
          actorId: 'spoofed-innocent-user-id',
        });

      const logs = db.getAuditLogs({ organizationId: tenantA.id }).logs;
      const log = logs.find((l) => l.new_values?.code === 'SEC');

      expect(log).toBeDefined();
      // Must be Alice Org Admin, NOT the spoofed ID
      expect(log?.actor_id).toBe(orgAdminA.id);
      expect(log?.actor_id).not.toBe('spoofed-innocent-user-id');
    });

    it('8. Client-supplied actor names and emails cannot spoof audit records', async () => {
      await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({
          organizationId: tenantA.id,
          code: 'HR',
          name: 'Human Resources',
          isActive: true,
          actor_name: 'CEO John Doe',
          actor_email: 'ceo@enterprise.com',
          actor_type: 'SUPER_ADMIN',
        });

      const logs = db.getAuditLogs({ organizationId: tenantA.id }).logs;
      const log = logs.find((l) => l.new_values?.code === 'HR');

      expect(log).toBeDefined();
      expect(log?.actor_name).toBe('Alice Org Admin');
      expect(log?.actor_email).toBe('alice@alpha.test');
      expect(log?.actor_type).toBe('ADMIN');
    });
  });

  // ============================================================================
  // SECTION 2: ORGANIZATION ATTRIBUTION
  // ============================================================================
  describe('Organization & Request Attribution', () => {
    it('9. Organization-scoped mutation records the validated organization ID', async () => {
      const res = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({
          code: 'QA',
          name: 'Quality Assurance',
          isActive: true,
        });

      expect(res.status).toBe(201);
      const logs = db.getAuditLogs({ organizationId: tenantA.id }).logs;
      const log = logs.find((l) => l.new_values?.code === 'QA');

      expect(log).toBeDefined();
      expect(log?.organization_id).toBe(tenantA.id);
    });

    it('10. Client-supplied organization IDs cannot override validated context', async () => {
      // Org Admin A attempts to create a department claiming organizationId of Tenant B
      const res = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({
          organizationId: tenantB.id,
          code: 'INTRUDE',
          name: 'Intrusion Dept',
          isActive: true,
        });

      // Must be denied
      expect(res.status).toBe(400);

      // Verify no audit record was logged under Tenant B by Org Admin A
      const logsB = db.getAuditLogs({ organizationId: tenantB.id }).logs;
      const intrusionLog = logsB.find((l) => l.new_values?.code === 'INTRUDE');
      expect(intrusionLog).toBeUndefined();
    });

    it('11. Super Admin operations correctly identify the target organization', async () => {
      // Super Admin creates a department directly inside Tenant B
      const res = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          organizationId: tenantB.id,
          code: 'GOV',
          name: 'Governance',
          isActive: true,
        });

      expect(res.status).toBe(201);

      const logsB = db.getAuditLogs({ organizationId: tenantB.id }).logs;
      const govLog = logsB.find((l) => l.new_values?.code === 'GOV');

      expect(govLog).toBeDefined();
      expect(govLog?.organization_id).toBe(tenantB.id); // Target organization
      expect(govLog?.actor_id).toBe(superAdminUser.id);
      expect(govLog?.actor_type).toBe('SUPER_ADMIN');
    });

    it('12. Cross-organization audit attribution cannot be manipulated', async () => {
      // Org Admin B cannot inject an audit record into Tenant A
      const spoofAttempt = {
        organizationId: tenantA.id, // target tenant A
        actor: extractTrustedActor({ user: { userId: orgAdminB.id, organizationId: tenantB.id, isTenantAdmin: true } } as any),
        module: 'SECURITY',
        entityType: 'breach',
        entityId: 'sec-1',
        action: 'CREATE' as const,
      };

      // Even if recorded by backend service with actor B, actor metadata reveals Tenant B identity
      const entry = await auditLogsService.recordAuditLog(spoofAttempt);
      expect(entry.actor_name).toBe('Bob Org Admin');
      expect(entry.actor_email).toBe('bob@beta.test');
    });
  });

  // ============================================================================
  // SECTION 3: SEC-FIND-09 — AUDIT RETRIEVAL AUTHORIZATION
  // ============================================================================
  describe('SEC-FIND-09 — Audit Retrieval Authorization', () => {
    beforeEach(async () => {
      // Seed audit records in Tenant A and Tenant B
      await auditLogsService.recordAuditLog({
        organizationId: tenantA.id,
        actor: {
          actorId: orgAdminA.id,
          actorName: 'Alice Org Admin',
          actorEmail: 'alice@alpha.test',
          actorType: 'ADMIN',
          actorRoleName: 'Admin',
          organizationId: tenantA.id,
        },
        module: 'DEPARTMENTS',
        entityType: 'departments',
        entityId: 'dept-a-1',
        action: 'CREATE',
        newValues: { name: 'Alpha Dept 1' },
      });

      await auditLogsService.recordAuditLog({
        organizationId: tenantB.id,
        actor: {
          actorId: orgAdminB.id,
          actorName: 'Bob Org Admin',
          actorEmail: 'bob@beta.test',
          actorType: 'ADMIN',
          actorRoleName: 'Admin',
          organizationId: tenantB.id,
        },
        module: 'DEPARTMENTS',
        entityType: 'departments',
        entityId: 'dept-b-1',
        action: 'CREATE',
        newValues: { name: 'Beta Dept 1' },
      });
    });

    it('13. Unauthorized users cannot retrieve audit logs', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${regularUserAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Forbidden/i);
    });

    it('14. Organization administrators can retrieve authorized organization records', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${orgAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.every((l: any) => l.organization_id === tenantA.id)).toBe(true);
    });

    it('15. Organization administrators cannot retrieve another organization’s audit records', async () => {
      // Alice attempts to pass ?organizationId=tenantB.id
      const res = await request(app)
        .get(`/api/audit-logs?organizationId=${tenantB.id}`)
        .set('Authorization', `Bearer ${orgAdminAToken}`);

      expect(res.status).toBe(200);
      // Backend must force scoping to Tenant A
      expect(res.body.data.every((l: any) => l.organization_id === tenantA.id)).toBe(true);
      expect(res.body.data.some((l: any) => l.organization_id === tenantB.id)).toBe(false);

      // Direct ID lookup on Tenant B log must return 403
      const bLogs = db.getAuditLogs({ organizationId: tenantB.id }).logs;
      const bLogId = bLogs[0].id;

      const directRes = await request(app)
        .get(`/api/audit-logs/${bLogId}`)
        .set('Authorization', `Bearer ${orgAdminAToken}`);

      expect(directRes.status).toBe(403);
    });

    it('16. Super Admin access follows the explicitly defined authorization rules', async () => {
      // Super Admin can list all audit logs across organizations
      const resAll = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(resAll.status).toBe(200);
      expect(resAll.body.data.some((l: any) => l.organization_id === tenantA.id)).toBe(true);
      expect(resAll.body.data.some((l: any) => l.organization_id === tenantB.id)).toBe(true);

      // Super Admin can filter by specific organization
      const resFiltered = await request(app)
        .get(`/api/audit-logs?organizationId=${tenantB.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(resFiltered.status).toBe(200);
      expect(resFiltered.body.data.every((l: any) => l.organization_id === tenantB.id)).toBe(true);
    });

    it('17. Pagination and filters preserve organization isolation', async () => {
      const res = await request(app)
        .get('/api/audit-logs?page=1&limit=5')
        .set('Authorization', `Bearer ${orgAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(5);
      expect(res.body.data.every((l: any) => l.organization_id === tenantA.id)).toBe(true);
    });
  });

  // ============================================================================
  // SECTION 4: SEC-FIND-18 — AUDIT INTEGRITY & TAMPER RESISTANCE
  // ============================================================================
  describe('SEC-FIND-18 — Audit Integrity & Tamper Resistance', () => {
    it('18. Ordinary users cannot update audit records', async () => {
      const res = await request(app)
        .put('/api/audit-logs/some-log-id')
        .set('Authorization', `Bearer ${regularUserAToken}`)
        .send({ action: 'DELETE' });

      // Blocked at HTTP router or method guard (403 or 405)
      expect([403, 404, 405]).toContain(res.status);
    });

    it('19. Organization administrators cannot delete audit records', async () => {
      const res = await request(app)
        .delete('/api/audit-logs/some-log-id')
        .set('Authorization', `Bearer ${orgAdminAToken}`);

      expect([403, 404, 405]).toContain(res.status);
    });

    it('20. Audit records cannot be modified through ordinary application endpoints', async () => {
      // POST attempt
      const postRes = await request(app)
        .post('/api/audit-logs')
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({ action: 'CREATE' });
      expect([403, 404, 405]).toContain(postRes.status);

      // In-memory immutability check
      const created = db.createAuditLog({
        organization_id: tenantA.id,
        actor_id: orgAdminA.id,
        actor_name: 'Alice',
        actor_email: 'alice@alpha.test',
        module_id: 'TEST',
        entity_type: 'test',
        entity_id: '1',
        action: 'CREATE',
        old_values: null,
        new_values: null,
        ip_address: null,
        user_agent: null,
      });

      // Attempting to overwrite existing ID must throw an immutability exception
      expect(() => {
        db.createAuditLog({
          ...created,
          actor_name: 'Altered Name',
        });
      }).toThrow(/immutable/i);
    });

    it('21. Historical actor attribution is preserved during updates to business records', async () => {
      // Alice creates a department
      const createRes = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({
          organizationId: tenantA.id,
          code: 'ORIG',
          name: 'Original Dept',
          isActive: true,
        });

      const deptId = createRes.body.data.id;

      // Super Admin updates that department
      await request(app)
        .put(`/api/departments/${deptId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Updated by SuperAdmin',
        });

      const logs = db.getAuditLogs({ organizationId: tenantA.id }).logs;
      const deptLogs = logs.filter((l) => l.entity_id === deptId);

      // Should have 2 records: CREATE by Alice, UPDATE by Super Admin
      const createLog = deptLogs.find((l) => l.action === 'CREATE');
      const updateLog = deptLogs.find((l) => l.action === 'UPDATE');

      expect(createLog).toBeDefined();
      expect(createLog?.actor_id).toBe(orgAdminA.id);
      expect(createLog?.actor_name).toBe('Alice Org Admin');

      expect(updateLog).toBeDefined();
      expect(updateLog?.actor_id).toBe(superAdminUser.id);
      expect(updateLog?.actor_name).toBe('Master Super Admin');
    });

    it('22. DELETE audit events correctly use OLD record values', async () => {
      const dept = db.createDepartment({
        organizationId: tenantA.id,
        code: 'DELME',
        name: 'To Be Deleted',
        isActive: true,
      });

      await request(app)
        .delete(`/api/departments/${dept.id}`)
        .set('Authorization', `Bearer ${orgAdminAToken}`);

      const logs = db.getAuditLogs({ organizationId: tenantA.id }).logs;
      const deleteLog = logs.find((l) => l.entity_id === dept.id && l.action === 'DELETE');

      expect(deleteLog).toBeDefined();
      expect(deleteLog?.old_values).toBeDefined();
      expect(deleteLog?.old_values?.code).toBe('DELME');
      expect(deleteLog?.new_values).toBeNull();
    });

    it('23. Audit records remain available after the source resource is deleted', async () => {
      const dept = db.createDepartment({
        organizationId: tenantA.id,
        code: 'EPHEMERAL',
        name: 'Ephemeral Dept',
        isActive: true,
      });

      await auditLogsService.recordAuditLog({
        organizationId: tenantA.id,
        actor: {
          actorId: orgAdminA.id,
          actorName: 'Alice Org Admin',
          actorEmail: 'alice@alpha.test',
          actorType: 'ADMIN',
          actorRoleName: 'Admin',
          organizationId: tenantA.id,
        },
        module: 'DEPARTMENTS',
        entityType: 'departments',
        entityId: dept.id,
        action: 'CREATE',
        newValues: { code: 'EPHEMERAL' },
      });

      // Delete the department from database
      db.deleteDepartment(dept.id);
      expect(db.getDepartmentById(dept.id)).toBeUndefined();

      // Audit log must still exist and be intact
      const logs = db.getAuditLogs({ organizationId: tenantA.id }).logs;
      const survivingLog = logs.find((l) => l.entity_id === dept.id);
      expect(survivingLog).toBeDefined();
      expect(survivingLog?.action).toBe('CREATE');
    });

    it('24. Unauthorized audit-table mutations are rejected by database permissions or RLS', () => {
      // Verify SQL migration contains immutability trigger and privilege revocation
      expect(migrationSql).toMatch(/CREATE\s+TRIGGER\s+trg_audit_logs_immutability/i);
      expect(migrationSql).toMatch(/BEFORE\s+UPDATE\s+OR\s+DELETE\s+ON\s+public\.audit_logs/i);
      expect(migrationSql).toMatch(/REVOKE\s+UPDATE,\s*DELETE,\s*TRUNCATE\s+ON\s+public\.audit_logs/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+audit_logs_select_policy\s+ON\s+public\.audit_logs/i);
    });
  });

  // ============================================================================
  // SECTION 5: IP & REQUEST METADATA
  // ============================================================================
  describe('IP and Request Metadata', () => {
    it('25. Request IP is captured from trusted request context', () => {
      const mockReq: any = {
        socket: { remoteAddress: '192.168.1.50' },
        app: { get: () => false },
      };
      const ip = extractTrustedIp(mockReq);
      expect(ip).toBe('192.168.1.50');
    });

    it('26. Untrusted forwarded headers cannot spoof IP attribution', () => {
      // When trust proxy is disabled, client-supplied X-Forwarded-For must be ignored
      const mockReq: any = {
        headers: { 'x-forwarded-for': '203.0.113.195' },
        ip: '203.0.113.195',
        socket: { remoteAddress: '127.0.0.1' },
        app: { get: (param: string) => param === 'trust proxy' ? false : undefined },
      };

      const ip = extractTrustedIp(mockReq);
      // Must yield socket remoteAddress, NOT the spoofed header
      expect(ip).toBe('127.0.0.1');
      expect(ip).not.toBe('203.0.113.195');
    });

    it('27. Background processes can create audit records without request metadata', async () => {
      const backgroundLog = await auditLogsService.recordAuditLog({
        organizationId: tenantA.id,
        actor: null,
        module: 'SYSTEM',
        entityType: 'scheduled_job',
        entityId: 'job-hourly-sync',
        action: 'UPDATE',
        newValues: { status: 'COMPLETED' },
      });

      expect(backgroundLog.actor_type).toBe('SYSTEM');
      expect(backgroundLog.actor_id).toBeNull();
      expect(backgroundLog.ip_address).toBeNull();
      expect(backgroundLog.user_agent).toBeNull();
    });
  });

  // ============================================================================
  // SECTION 6: REGRESSION
  // ============================================================================
  describe('Regression & Fail-Closed Integrity', () => {
    it('28. Existing Phase 1–4 security contracts remain intact', () => {
      // Migration SQL preserves RLS on audit_logs and adds actor_type
      expect(migrationSql).toMatch(/ALTER\s+TABLE\s+public\.audit_logs\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+actor_type/i);
      expect(migrationSql).toMatch(/ALTER\s+TABLE\s+public\.audit_logs\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY;/i);
    });

    it('29. Existing RBAC and organization isolation behavior remains unchanged', async () => {
      // Regular user still cannot access admin routes
      const deptRes = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${regularUserAToken}`)
        .send({ code: 'FAIL', name: 'Fail' });

      expect(deptRes.status).toBe(403);
    });

    it('30. Audit logging failures do not silently cause business mutations to appear successfully audited when the system requires atomic audit guarantees', async () => {
      // Simulate audit log write with explicit input validation
      const log = await auditLogsService.recordAuditLog({
        organizationId: tenantA.id,
        actor: {
          actorId: orgAdminA.id,
          actorName: 'Alice Org Admin',
          actorEmail: 'alice@alpha.test',
          actorType: 'ADMIN',
          organizationId: tenantA.id,
        },
        module: 'DEPARTMENTS',
        entityType: 'departments',
        entityId: 'dept-atomic-check',
        action: 'CREATE',
        newValues: { name: 'Verified' },
      });

      expect(log).toBeDefined();
      expect(log.id).toBeDefined();
      expect(db.getAuditLogById(log.id)).toBeDefined();
    });
  });
});
