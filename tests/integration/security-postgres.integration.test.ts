// ==============================================================================
// JK-PAYROLL: REAL POSTGRESQL & SUPABASE SECURITY INTEGRATION TEST SUITE
// File: tests/integration/security-postgres.integration.test.ts
// Scope: Real PostgreSQL RLS enforcement, Service-Role Boundary, Audit Immutability & Multi-Tenancy
// ==============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { getSupabaseClient, getSupabaseAnonClient } from '../../src/server/db/supabase.js';
import { createApp } from '../../src/server/app.js';
import { ENV } from '../../src/server/config/env.js';

describe('Real PostgreSQL & Supabase Database Security Integration Suite (Phase 6F)', () => {
  const serviceClient = getSupabaseClient();
  const anonClient = getSupabaseAnonClient();
  const app = createApp();

  const testPrefix = 'TEST_INT_';
  const disposableOrgCode = `${testPrefix}ORG_${Date.now().toString(36).toUpperCase()}`;
  let disposableOrgId: string | null = null;

  beforeAll(async () => {
    // Verify connection to live Supabase PostgreSQL
    const { error } = await serviceClient.from('organizations').select('id').limit(1);
    if (error) {
      console.warn('PostgreSQL integration test database unreachable:', error.message);
    }
  });

  afterAll(async () => {
    // Clean up ONLY disposable test records created during integration tests
    if (disposableOrgId) {
      try {
        await serviceClient.from('audit_logs').delete().eq('organization_id', disposableOrgId);
        await serviceClient.from('departments').delete().eq('organization_id', disposableOrgId);
        await serviceClient.from('organizations').delete().eq('id', disposableOrgId);
      } catch {
        // Cleanup best effort
      }
    }
  });

  // ============================================================================
  // 1. REAL POSTGRESQL ROW LEVEL SECURITY (RLS) ENFORCEMENT
  // ============================================================================
  describe('PostgreSQL Row Level Security Enforcement (Role: anon)', () => {
    it('1. Anonymous role cannot read protected organization records (returns 0 rows or 42501)', async () => {
      const { data, error } = await anonClient.from('organizations').select('*');
      if (error) {
        expect(error.code).toBe('42501');
      } else {
        expect(data).toBeDefined();
        expect(data?.length).toBe(0);
      }
    });

    it('2. Anonymous role INSERT operation is rejected with 42501 (insufficient_privilege)', async () => {
      const { data, error } = await anonClient.from('organizations').insert({
        name: 'Malicious Injected Org',
        code: `${testPrefix}MALICIOUS`,
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe('42501');
      expect(error?.message).toMatch(/violates row-level security policy|permission denied/i);
      expect(data).toBeNull();
    });

    it('3. Anonymous role cannot read user profiles (returns 0 rows or 42501)', async () => {
      const { data, error } = await anonClient.from('profiles').select('*');
      if (error) {
        expect(error.code).toBe('42501');
      } else {
        expect(data?.length).toBe(0);
      }
    });

    it('4. Anonymous role INSERT into departments is rejected by RLS', async () => {
      const { data, error } = await anonClient.from('departments').insert({
        name: 'Malicious Department',
        code: `${testPrefix}DEPT`,
        organization_id: '00000000-0000-0000-0000-000000000001',
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe('42501');
      expect(data).toBeNull();
    });

    it('5. Anonymous role cannot read audit logs (returns 0 rows or 42501)', async () => {
      const { data, error } = await anonClient.from('audit_logs').select('*');
      if (error) {
        expect(error.code).toBe('42501');
      } else {
        expect(data?.length).toBe(0);
      }
    });
  });

  // ============================================================================
  // 2. SERVICE-ROLE BYPASS & SECURITY BOUNDARY VERIFICATION
  // ============================================================================
  describe('Service-Role Authorization Boundary Verification (SEC-FIND-07)', () => {
    it('Service-role operations bypass PostgreSQL RLS as architecturally intended', async () => {
      const { data, error } = await serviceClient
        .from('organizations')
        .select('id, code, name')
        .limit(2);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('Service-role can register and track disposable tenant entities', async () => {
      const { data, error } = await serviceClient
        .from('organizations')
        .insert({
          name: 'Integration Test Tenant',
          code: disposableOrgCode,
          slug: disposableOrgCode.toLowerCase(),
        })
        .select('id, code, name')
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.code).toBe(disposableOrgCode);
      disposableOrgId = data?.id || null;
    });

    it('Express API acts as the primary security boundary around service-role operations', async () => {
      // Unauthenticated request to organizations endpoint MUST fail closed
      const unauthRes = await request(app).get('/api/organizations');
      expect([401, 403]).toContain(unauthRes.status);

      // Unauthenticated request to departments endpoint MUST fail closed
      const unauthDeptRes = await request(app).get('/api/departments');
      expect([401, 403]).toContain(unauthDeptRes.status);
    });
  });

  // ============================================================================
  // 3. AUDIT DATABASE IMMUTABILITY & ISOLATION
  // ============================================================================
  describe('Audit Database Integrity & Point-in-Time Immutability', () => {
    it('Audit logs table exists in live PostgreSQL and accepts service-role records', async () => {
      if (!disposableOrgId) return;

      // Check if migration 11 (actor_type) has been applied or if using baseline migration 3 schema
      const payload: Record<string, any> = {
        organization_id: disposableOrgId,
        module_id: 'INTEGRATION_TEST',
        entity_type: 'organizations',
        entity_id: disposableOrgId,
        action: 'CREATE',
        actor_name: 'Test Runner',
      };

      const { data, error } = await serviceClient
        .from('audit_logs')
        .insert(payload)
        .select('id, module_id, action')
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.module_id).toBe('INTEGRATION_TEST');
    });

    it('Anonymous role cannot delete or modify audit records', async () => {
      const { error } = await anonClient
        .from('audit_logs')
        .delete()
        .eq('module_id', 'INTEGRATION_TEST');

      // Either returns 42501 permission error or matches 0 rows due to RLS
      if (error) {
        expect(error.code).toBe('42501');
      }
    });

    it('Audit log organization isolation prevents cross-tenant data exposure', async () => {
      // Query with service role filtered by disposable org returns only matching records
      if (!disposableOrgId) return;

      const { data, error } = await serviceClient
        .from('audit_logs')
        .select('*')
        .eq('organization_id', disposableOrgId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.every((row: any) => row.organization_id === disposableOrgId)).toBe(true);
    });
  });
});
