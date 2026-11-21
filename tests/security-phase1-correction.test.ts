// ==============================================================================
// JK-PAYROLL: PHASE 1.1 SECURITY CORRECTION STATIC REGRESSION SUITE
// File: tests/security-phase1-correction.test.ts
// Scope: Static Invariant Verification for Phase 1.1 Migration SQL
// Objectives: OBJ-1 through OBJ-6
// ==============================================================================

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 1.1 — Security Correction & Hardened Authorization Authority (Static Invariants)', () => {
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261121000013_security_correction_phase1_1.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  // ============================================================================
  // 1. SAFE UUID CASTING & MALFORMED CLAIMS RESILIENCE
  // ============================================================================
  describe('Safe UUID Casting (OBJ-6)', () => {
    it('creates public.safe_cast_uuid to prevent unhandled cast exceptions', () => {
      expect(migrationSql).toContain('CREATE OR REPLACE FUNCTION public.safe_cast_uuid(p_val TEXT)');
      expect(migrationSql).toMatch(/EXCEPTION\s+WHEN\s+OTHERS\s+THEN\s+RETURN\s+NULL;/i);
    });
  });

  // ============================================================================
  // 2. SOLE SUPERADMIN AUTHORITY (OBJ-3)
  // ============================================================================
  describe('OBJ-3: Establish Single SuperAdmin Authority', () => {
    it('is_super_admin() relies solely on profiles.is_super_admin and eliminates JWT claims', () => {
      const match = migrationSql.match(/FUNCTION\s+public\.is_super_admin\(\)[\s\S]*?\$\$([\s\S]*?)\$\$;/i);
      expect(match).toBeTruthy();
      const fnBody = match![1];

      // Must check profiles table
      expect(fnBody).toContain('SELECT 1 FROM public.profiles');
      expect(fnBody).toContain('is_super_admin = true');
      expect(fnBody).toContain('is_active = true');

      // Must NOT check JWT app_metadata claims
      expect(fnBody).not.toContain("auth.jwt()->'app_metadata'");
      expect(fnBody).not.toContain('SUPER_ADMIN');
    });
  });

  // ============================================================================
  // 3. AUTHORITATIVE ORGANIZATION MEMBERSHIP (OBJ-1)
  // ============================================================================
  describe('OBJ-1: Authoritative Organization Membership', () => {
    it('current_user_organization_id() eliminates profile fallback', () => {
      const match = migrationSql.match(/FUNCTION\s+public\.current_user_organization_id\(\)[\s\S]*?\$\$([\s\S]*?)\$\$;/i);
      expect(match).toBeTruthy();
      const fnBody = match![1];

      // Must resolve strictly through organization_members joined with organizations
      expect(fnBody).toContain('public.organization_members om');
      expect(fnBody).toContain('public.organizations o ON o.id = om.organization_id');
      expect(fnBody).toContain("o.status = 'Active'");

      // Must NOT contain fallback to profiles
      expect(fnBody).not.toMatch(/SELECT\s+p\.organization_id\s+FROM\s+public\.profiles\s+p/i);
    });

    it('is_organization_member() eliminates profiles.organization_id as alternative membership source', () => {
      const match = migrationSql.match(/FUNCTION\s+public\.is_organization_member\([^)]*\)[\s\S]*?\$\$([\s\S]*?)\$\$;/i);
      expect(match).toBeTruthy();
      const fnBody = match![1];

      // Must require active membership in organization_members
      expect(fnBody).toContain('FROM public.organization_members om');
      expect(fnBody).toContain('om.is_active = true');

      // Must require active, unexpired organization status
      expect(fnBody).toContain("o.status = 'Active'");
      expect(fnBody).toContain('o.end_date >= clock_timestamp()');

      // Must NOT treat profile organization as alternative membership
      expect(fnBody).not.toMatch(/SELECT\s+1\s+FROM\s+public\.profiles\s+p[\s\S]*?p\.organization_id\s*=\s*p_org_id/i);
    });
  });

  // ============================================================================
  // 4. ORGANIZATION ADMINISTRATOR RESOLUTION (OBJ-5)
  // ============================================================================
  describe('OBJ-5: Harden Organization Administrator Resolution', () => {
    it('is_organization_admin() removes role display name checks and enforces code and scope', () => {
      const match = migrationSql.match(/FUNCTION\s+public\.is_organization_admin\([^)]*\)[\s\S]*?\$\$([\s\S]*?)\$\$;/i);
      expect(match).toBeTruthy();
      const fnBody = match![1];

      // Must check uppercase role codes, NOT names
      expect(fnBody).not.toContain('r.name');
      expect(fnBody).not.toContain('Platform Super Administrator');
      expect(fnBody).not.toContain('Organization Administrator');

      // Must check canonical role codes
      expect(fnBody).toContain('TENANT_ADMIN');
      expect(fnBody).toContain('ADMIN');

      // Must verify active role status and organization scope
      expect(fnBody).toContain('r.is_active = true');
      expect(fnBody).toContain('r.organization_id = p_org_id OR r.organization_id IS NULL');

      // Primary check via user_roles assignment table
      expect(fnBody).toContain('public.user_roles ur');
    });
  });

  // ============================================================================
  // 5. HARDENED PROFILES RLS POLICIES & TRIGGER (OBJ-2)
  // ============================================================================
  describe('OBJ-2: Harden Profile INSERT, UPDATE & Field Immutability', () => {
    it('profiles_insert_policy restricts self-registration to unassigned profile or active membership', () => {
      expect(migrationSql).toMatch(/profiles_insert_policy[\s\S]*?id\s*=\s*auth\.uid\(\)/i);
      expect(migrationSql).toMatch(/organization_id\s+IS\s+NULL\s+OR\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+public\.organization_members/i);
      expect(migrationSql).toContain('department_id IS NULL');
    });

    it('profiles_update_policy prevents deactivated users from updating own profile (anti self-reactivation)', () => {
      expect(migrationSql).toMatch(/profiles_update_policy[\s\S]*?USING\s*\([\s\S]*?\(SELECT\s+p\.is_active\s+FROM\s+public\.profiles\s+p\s+WHERE\s+p\.id\s*=\s*auth\.uid\(\)\)\s*=\s*true/i);
    });

    it('profiles_update_policy forbids self-mutation of security-sensitive fields', () => {
      expect(migrationSql).toMatch(/is_active\s*=\s*\(SELECT\s+p\.is_active\s+FROM\s+public\.profiles\s+p\s+WHERE\s+p\.id\s*=\s*auth\.uid\(\)\)/i);
      expect(migrationSql).toMatch(/organization_id\s+IS\s+NOT\s+DISTINCT\s+FROM\s+\(SELECT\s+p\.organization_id/i);
      expect(migrationSql).toMatch(/department_id\s+IS\s+NOT\s+DISTINCT\s+FROM\s+\(SELECT\s+p\.department_id/i);
    });

    it('creates defense-in-depth trigger fn_enforce_profile_security_fields', () => {
      expect(migrationSql).toContain('CREATE OR REPLACE FUNCTION public.fn_enforce_profile_security_fields()');
      expect(migrationSql).toContain('trg_enforce_profile_security_fields');
      expect(migrationSql).toContain('BEFORE UPDATE ON public.profiles');
    });
  });

  // ============================================================================
  // 6. ORGANIZATION LIFECYCLE SYNCHRONIZATION (OBJ-6)
  // ============================================================================
  describe('OBJ-6: Organization Lifecycle Synchronization & Check Constraint', () => {
    it('trigger synchronizes is_active with status on all INSERT and UPDATE operations', () => {
      expect(migrationSql).toContain('BEFORE INSERT OR UPDATE ON public.organizations');
      expect(migrationSql).toContain("NEW.is_active := (NEW.status = 'Active');");
    });

    it('adds CHECK constraint chk_organizations_status_active_sync', () => {
      expect(migrationSql).toContain('chk_organizations_status_active_sync');
      expect(migrationSql).toMatch(/CHECK\s*\(\s*is_active\s*=\s*\(status\s*=\s*'Active'\)\s*\)/i);
    });
  });

  // ============================================================================
  // 7. GET_USER_EFFECTIVE_PERMISSIONS EXECUTION PRIVILEGES (OBJ-4: MODEL B)
  // ============================================================================
  describe('OBJ-4: Secure get_user_effective_permissions (Model B)', () => {
    it('revokes execution from PUBLIC, anon, and authenticated roles', () => {
      expect(migrationSql).toMatch(/REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.get_user_effective_permissions\s*\(\s*UUID\s*,\s*UUID\s*\)\s+FROM\s+PUBLIC\s*,\s*anon\s*,\s*authenticated;/i);
    });

    it('grants execution strictly to service_role', () => {
      expect(migrationSql).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.get_user_effective_permissions\s*\(\s*UUID\s*,\s*UUID\s*\)\s+TO\s+service_role;/i);
    });

    it('internal function logic requires active membership in target organization', () => {
      expect(migrationSql).toContain('FROM public.organization_members om');
      expect(migrationSql).toContain('om.user_id = p_user_id');
      expect(migrationSql).toContain('om.organization_id = p_organization_id');
      expect(migrationSql).toContain('om.is_active = true');
    });
  });
});
