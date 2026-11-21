// ==============================================================================
// JK-PAYROLL: PHASE 1.1.1 SECURITY CORRECTIONS STATIC REGRESSION SUITE
// File: tests/security-phase1-1-1-correction.test.ts
// Scope: Static Invariant Verification for Phase 1.1.1 Migration SQL
// Objectives: P111-01 through P111-08
// ==============================================================================

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 1.1.1 — Final Security Corrections & Deployment Readiness (Static Invariants)', () => {
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261121000014_security_corrections_phase1_1_1.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  // ============================================================================
  // 1. SECURITY INVOKER PROFILE TRIGGER HARDENING (P111-01)
  // ============================================================================
  describe('P111-01: Profile Security Trigger SECURITY INVOKER & Definer Bypass Fix', () => {
    it('declares fn_enforce_profile_security_fields as SECURITY INVOKER', () => {
      const match = migrationSql.match(/FUNCTION\s+public\.fn_enforce_profile_security_fields\(\)[\s\S]*?LANGUAGE\s+plpgsql\s+SECURITY\s+INVOKER/i);
      expect(match).toBeTruthy();
    });

    it('does NOT declare fn_enforce_profile_security_fields as SECURITY DEFINER', () => {
      const fnHeaderMatch = migrationSql.match(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.fn_enforce_profile_security_fields\(\)[\s\S]*?\$\$/i);
      expect(fnHeaderMatch).toBeTruthy();
      expect(fnHeaderMatch![0]).not.toMatch(/SECURITY\s+DEFINER/i);
      expect(fnHeaderMatch![0]).toMatch(/SECURITY\s+INVOKER/i);
    });

    it('checks current_user against trusted database roles (postgres, supabase_admin, service_role)', () => {
      expect(migrationSql).toContain("current_user IN ('postgres', 'supabase_admin', 'service_role')");
    });

    it('explicitly handles auth.uid() IS NULL and raises 42501 for unauthenticated caller', () => {
      expect(migrationSql).toContain('v_uid IS NULL');
      expect(migrationSql).toMatch(/RAISE\s+EXCEPTION\s+'Security violation: profile modification requires an authenticated caller'\s+USING\s+ERRCODE\s*=\s*'42501'/i);
    });

    it('prevents regular users from elevating is_super_admin, is_organization_admin, organization_id, department_id, or is_active', () => {
      expect(migrationSql).toContain('NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin');
      expect(migrationSql).toContain('NEW.is_organization_admin IS DISTINCT FROM OLD.is_organization_admin');
      expect(migrationSql).toContain('NEW.organization_id IS DISTINCT FROM OLD.organization_id');
      expect(migrationSql).toContain('NEW.department_id IS DISTINCT FROM OLD.department_id');
      expect(migrationSql).toContain('NEW.is_active IS DISTINCT FROM OLD.is_active');
    });
  });

  // ============================================================================
  // 2. ADDITIVE PERMISSION EVALUATION (P111-02)
  // ============================================================================
  describe('P111-02: Additive Effective Permission Calculation', () => {
    it('combines role permissions and direct permissions with UNION (additive)', () => {
      const match = migrationSql.match(/FUNCTION\s+public\.get_user_effective_permissions\([^)]*\)[\s\S]*?\$\$([\s\S]*?)\$\$;/i);
      expect(match).toBeTruthy();
      const fnBody = match![1];

      // Must union role and direct actions
      expect(fnBody).toMatch(/SELECT\s+action_id,\s*module_id,\s*action,\s*full_key\s+FROM\s+role_user_actions\s+UNION\s+SELECT\s+action_id,\s*module_id,\s*action,\s*full_key\s+FROM\s+direct_user_actions/i);
      
      // Must NOT exclude role actions when direct actions exist
      expect(fnBody).not.toContain('WHERE NOT EXISTS (SELECT 1 FROM direct_user_actions)');
    });

    it('preserves exact parameter names (p_organization_id, p_user_id) for drop-in compatibility', () => {
      expect(migrationSql).toMatch(/FUNCTION\s+public\.get_user_effective_permissions\(\s*p_organization_id\s+UUID,\s*p_user_id\s+UUID\s*\)/i);
    });

    it('enforces Model B execution privileges (revoked from authenticated/anon, granted to service_role)', () => {
      expect(migrationSql).toMatch(/REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.get_user_effective_permissions\(UUID,\s*UUID\)\s+FROM\s+PUBLIC,\s*anon,\s*authenticated/i);
      expect(migrationSql).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.get_user_effective_permissions\(UUID,\s*UUID\)\s+TO\s+service_role/i);
    });
  });

  // ============================================================================
  // 3. DEPARTMENT RESOLUTION THROUGH ORGANIZATION MEMBERSHIP (P111-03)
  // ============================================================================
  describe('P111-03: Department Resolution via organization_members', () => {
    it('resolves department_id from organization_members matching the requested organization', () => {
      const match = migrationSql.match(/FUNCTION\s+public\.get_user_effective_permissions\([^)]*\)[\s\S]*?\$\$([\s\S]*?)\$\$;/i);
      expect(match).toBeTruthy();
      const fnBody = match![1];

      expect(fnBody).toContain('SELECT om.department_id');
      expect(fnBody).toContain('INNER JOIN public.organization_members om');
      expect(fnBody).toContain('om.organization_id = o.id');
      expect(fnBody).toContain('om.user_id = p_user_id');
      expect(fnBody).toContain('om.is_active = true');
    });

    it('validates that resolved department belongs to the requested organization', () => {
      const match = migrationSql.match(/FUNCTION\s+public\.get_user_effective_permissions\([^)]*\)[\s\S]*?\$\$([\s\S]*?)\$\$;/i);
      expect(match).toBeTruthy();
      const fnBody = match![1];

      expect(fnBody).toContain('FROM public.departments d');
      expect(fnBody).toContain('d.id = v_dept_id');
      expect(fnBody).toContain('d.organization_id = p_organization_id');
    });

    it('does NOT resolve department from profiles.department_id in permission evaluation', () => {
      const match = migrationSql.match(/FUNCTION\s+public\.get_user_effective_permissions\([^)]*\)[\s\S]*?\$\$([\s\S]*?)\$\$;/i);
      expect(match).toBeTruthy();
      const fnBody = match![1];

      expect(fnBody).not.toMatch(/SELECT\s+department_id\s+FROM\s+public\.profiles/i);
    });
  });

  // ============================================================================
  // 4. STRICT SELF-REGISTRATION (P111-04)
  // ============================================================================
  describe('P111-04: Strict Self-Registration Constraints', () => {
    it('enforces unassigned profile creation for self-registering users', () => {
      expect(migrationSql).toContain('organization_id IS NULL');
      expect(migrationSql).toContain('department_id IS NULL');
      expect(migrationSql).toContain('is_super_admin = false');
      expect(migrationSql).toContain('is_organization_admin = false');
    });

    it('requires existing active organization_members record when org admin provisions a user', () => {
      expect(migrationSql).toContain('FROM public.organization_members om');
      expect(migrationSql).toContain('om.user_id = public.profiles.id');
      expect(migrationSql).toContain('om.organization_id = public.profiles.organization_id');
      expect(migrationSql).toContain('om.is_active = true');
    });
  });

  // ============================================================================
  // 5. CONSOLIDATE ADMINISTRATOR AUTHORITY (P111-05)
  // ============================================================================
  describe('P111-05: System Role Scope for Organization Admin Resolution', () => {
    it('verifies role_type is SYSTEM and organization_id is NULL for admin roles', () => {
      const match = migrationSql.match(/FUNCTION\s+public\.is_organization_admin\([^)]*\)[\s\S]*?\$\$([\s\S]*?)\$\$;/i);
      expect(match).toBeTruthy();
      const fnBody = match![1];

      expect(fnBody).toContain("r.role_type = 'SYSTEM'");
      expect(fnBody).toContain('r.organization_id IS NULL');
    });

    it('prevents custom/tenant-scoped roles with admin codes from being treated as system admin', () => {
      const match = migrationSql.match(/FUNCTION\s+public\.is_organization_admin\([^)]*\)[\s\S]*?\$\$([\s\S]*?)\$\$;/i);
      expect(match).toBeTruthy();
      const fnBody = match![1];

      // Custom roles have role_type = 'CUSTOM' or non-null organization_id
      expect(fnBody).not.toMatch(/r\.role_code\s+IN\s+\('ORG_ADMIN',\s*'HR_MANAGER'\)\s+AND\s+r\.is_active\s*=\s*true\s*;/i);
    });
  });

  // ============================================================================
  // 6. FAIL-CLOSED ORGANIZATION SELECTION (P111-06)
  // ============================================================================
  describe('P111-06: Organization Selection & Multi-Org Disambiguation', () => {
    it('current_user_organization_id() fails closed when user has multiple memberships and no valid claim', () => {
      const match = migrationSql.match(/FUNCTION\s+public\.current_user_organization_id\(\)[\s\S]*?\$\$([\s\S]*?)\$\$;/i);
      expect(match).toBeTruthy();
      const fnBody = match![1];

      expect(fnBody).toContain('HAVING COUNT(*) = 1');
    });

    it('custom_access_token_hook omits organization_id when user has multiple active memberships', () => {
      const match = migrationSql.match(/FUNCTION\s+public\.custom_access_token_hook\([^)]*\)[\s\S]*?\$\$([\s\S]*?)\$\$;/i);
      expect(match).toBeTruthy();
      const fnBody = match![1];

      expect(fnBody).toContain('IF v_member_count = 1 THEN');
      expect(fnBody).not.toContain('FROM public.profiles p');
    });
  });

  // ============================================================================
  // 7. PRE-FLIGHT AUDIT & BACKFILL (P111-07)
  // ============================================================================
  describe('P111-07: Migration Safety, Pre-Flight Audit & Data Migration', () => {
    it('includes pre-flight diagnostic warnings for custom admin roles and null dept members', () => {
      expect(migrationSql).toContain('custom (tenant-scoped) role(s) carry an admin-looking code');
      expect(migrationSql).toContain('backfilling department_id on % organization_members row(s)');
    });

    it('backfills department_id from profiles to organization_members before enforcement', () => {
      expect(migrationSql).toContain('UPDATE public.organization_members om');
      expect(migrationSql).toContain('SET department_id = p.department_id');
      expect(migrationSql).toContain('WHERE om.user_id = p.id');
    });
  });
});
