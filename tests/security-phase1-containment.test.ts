// ==============================================================================
// JK-PAYROLL: PHASE 1 SECURITY CONTAINMENT REGRESSION SUITE
// File: tests/security-phase1-containment.test.ts
// Scope: Database Security Containment, Boolean Helper Hardening & RLS Lockdown
// Findings: CRITICAL-01, CRITICAL-02, CRITICAL-03, CRITICAL-05, CRITICAL-06,
//           HIGH-03, HIGH-04, HIGH-13, ADD-01
// ==============================================================================

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 1 — Immediate Security Containment & Helper Hardening Suite', () => {
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261121000012_remediate_critical_containment.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  // ============================================================================
  // 1. SCHEMA HARMONIZATION (ADD-01)
  // ============================================================================
  describe('ADD-01: Organizations is_active & Status Synchronization', () => {
    it('adds is_active column if not exists on public.organizations', () => {
      expect(migrationSql).toMatch(/ALTER\s+TABLE\s+public\.organizations\s+ADD\s+COLUMN\s+is_active\s+BOOLEAN/i);
    });

    it('creates synchronization trigger fn_sync_organization_active_status', () => {
      expect(migrationSql).toContain('CREATE OR REPLACE FUNCTION public.fn_sync_organization_active_status()');
      expect(migrationSql).toContain('NEW.is_active := (NEW.status = \'Active\');');
      expect(migrationSql).toMatch(/CREATE\s+TRIGGER\s+trg_sync_organization_active_status/i);
    });
  });

  // ============================================================================
  // 2. HELPER FUNCTIONS & COALESCE DEFECT ELIMINATION (CRITICAL-05, CRITICAL-06)
  // ============================================================================
  describe('CRITICAL-05 & CRITICAL-06: Authorization Helper Hardening', () => {
    it('eliminates role display name matching from is_super_admin()', () => {
      expect(migrationSql).not.toContain('Platform Super Administrator');
      expect(migrationSql).not.toMatch(/app_metadata['"]?\s*->>\s*['"]role_name['"]/i);
    });

    it('is_super_admin() does NOT use COALESCE and evaluates boolean OR', () => {
      const match = migrationSql.match(/FUNCTION\s+public\.is_super_admin\(\)[\s\S]*?\$\$([\s\S]*?)\$\$;/i);
      expect(match).toBeTruthy();
      const fnBody = match![1];
      expect(fnBody).not.toContain('COALESCE');
      expect(fnBody).toContain('is_super_admin = true');
    });

    it('is_organization_admin() does NOT use COALESCE and evaluates boolean OR', () => {
      const match = migrationSql.match(/FUNCTION\s+public\.is_organization_admin\([^)]*\)[\s\S]*?\$\$([\s\S]*?)\$\$;/i);
      expect(match).toBeTruthy();
      const fnBody = match![1];
      expect(fnBody).not.toContain('COALESCE');
      expect(fnBody).toContain('public.is_super_admin()');
      expect(fnBody).toContain('om.is_owner = true');
    });

    it('is_organization_member() checks organization active status and expiration (HIGH-04)', () => {
      const match = migrationSql.match(/FUNCTION\s+public\.is_organization_member\([^)]*\)[\s\S]*?\$\$([\s\S]*?)\$\$;/i);
      expect(match).toBeTruthy();
      const fnBody = match![1];
      expect(fnBody).not.toContain('COALESCE');
      expect(fnBody).toContain("o.status = 'Active'");
      expect(fnBody).toContain('o.end_date >= clock_timestamp()');
    });

    it('simulates helper boolean evaluation: non-superadmin Org Admin evaluates to TRUE', () => {
      // Simulates the SQL boolean evaluation vs the broken COALESCE behavior
      const brokenCoalesce = (isSuperAdmin: boolean, isOrgAdmin: boolean) => {
        // In SQL COALESCE: COALESCE(isSuperAdmin, isOrgAdmin, false)
        // If isSuperAdmin is false (boolean), COALESCE stops on false!
        return isSuperAdmin !== null ? isSuperAdmin : isOrgAdmin;
      };

      const fixedBooleanOr = (isSuperAdmin: boolean, isOrgAdmin: boolean) => {
        return Boolean(isSuperAdmin || isOrgAdmin);
      };

      const userIsSuperAdmin = false;
      const userIsOrgAdmin = true;

      // The broken COALESCE returned false, wrongly denying access to the Org Admin!
      expect(brokenCoalesce(userIsSuperAdmin, userIsOrgAdmin)).toBe(false);
      // The fixed helper correctly returns true!
      expect(fixedBooleanOr(userIsSuperAdmin, userIsOrgAdmin)).toBe(true);
    });

    it('simulates organization lifecycle check: suspended organization returns false', () => {
      const evaluateOrgMembership = (org: { status: string; isExpired: boolean }, hasMemberRecord: boolean) => {
        const isOrgActive = org.status === 'Active' && !org.isExpired;
        return Boolean(isOrgActive && hasMemberRecord);
      };

      expect(evaluateOrgMembership({ status: 'Active', isExpired: false }, true)).toBe(true);
      expect(evaluateOrgMembership({ status: 'Suspended', isExpired: false }, true)).toBe(false);
      expect(evaluateOrgMembership({ status: 'Active', isExpired: true }, true)).toBe(false);
      expect(evaluateOrgMembership({ status: 'Active', isExpired: false }, false)).toBe(false);
    });
  });

  // ============================================================================
  // 3. RLS POLICIES LOCKDOWN (CRITICAL-01, CRITICAL-02, CRITICAL-03)
  // ============================================================================
  describe('CRITICAL-01, CRITICAL-02 & CRITICAL-03: RLS Policy Invariants', () => {
    it('profiles_insert_policy requires is_organization_admin = false on self-insert (CRITICAL-02)', () => {
      expect(migrationSql).toMatch(/profiles_insert_policy[\s\S]*?id\s*=\s*auth\.uid\(\)\s+AND\s+is_super_admin\s*=\s*false\s+AND\s+is_organization_admin\s*=\s*false/i);
    });

    it('profiles_update_policy prevents org admin from escalating is_organization_admin (CRITICAL-01)', () => {
      expect(migrationSql).toMatch(/profiles_update_policy[\s\S]*?is_organization_admin\s*=\s*\(SELECT\s+p\.is_organization_admin\s+FROM\s+public\.profiles\s+p\s+WHERE\s+p\.id\s*=\s*public\.profiles\.id\)/i);
    });

    it('org_members_insert_policy prevents org admin from creating owner memberships (CRITICAL-03)', () => {
      expect(migrationSql).toMatch(/org_members_insert_policy[\s\S]*?is_owner\s*=\s*false/i);
    });

    it('simulates profiles self-insert check: rejects self-assigned is_organization_admin = true', () => {
      const evaluateProfilesInsert = (actorId: string, payload: any, isSuperAdmin = false) => {
        if (isSuperAdmin) return true;
        // User inserting their own profile must NOT set is_super_admin or is_organization_admin
        if (payload.id === actorId) {
          return payload.is_super_admin === false && payload.is_organization_admin === false;
        }
        return false;
      };

      const attackerId = 'u-attacker-123';
      const maliciousPayload = { id: attackerId, is_super_admin: false, is_organization_admin: true };
      const legitimatePayload = { id: attackerId, is_super_admin: false, is_organization_admin: false };

      expect(evaluateProfilesInsert(attackerId, maliciousPayload)).toBe(false);
      expect(evaluateProfilesInsert(attackerId, legitimatePayload)).toBe(true);
      expect(evaluateProfilesInsert(attackerId, maliciousPayload, true)).toBe(true);
    });

    it('simulates profiles update check: org admin cannot promote another user to org admin', () => {
      const evaluateProfilesUpdate = (
        actor: { isSuperAdmin: boolean; isOrgAdmin: boolean; orgId: string },
        targetProfile: { id: string; orgId: string; is_organization_admin: boolean; is_super_admin: boolean },
        updatedFields: { is_organization_admin?: boolean; is_super_admin?: boolean; fullName?: string }
      ) => {
        if (actor.isSuperAdmin) return true;

        if (actor.isOrgAdmin && targetProfile.orgId === actor.orgId) {
          // Cannot promote to super admin
          if (updatedFields.is_super_admin === true) return false;
          // Cannot promote target to org admin if target was not already org admin!
          if (
            updatedFields.is_organization_admin !== undefined &&
            updatedFields.is_organization_admin !== targetProfile.is_organization_admin
          ) {
            return false;
          }
          return true;
        }
        return false;
      };

      const orgAdmin = { isSuperAdmin: false, isOrgAdmin: true, orgId: 'org-1' };
      const staffMember = { id: 'u-staff', orgId: 'org-1', is_organization_admin: false, is_super_admin: false };

      // Org admin attempts to escalate staff member to org admin: DENIED
      expect(evaluateProfilesUpdate(orgAdmin, staffMember, { is_organization_admin: true })).toBe(false);
      // Org admin attempts to escalate staff member to super admin: DENIED
      expect(evaluateProfilesUpdate(orgAdmin, staffMember, { is_super_admin: true })).toBe(false);
      // Org admin updates non-privileged profile data: ALLOWED
      expect(evaluateProfilesUpdate(orgAdmin, staffMember, { fullName: 'Updated Staff Name' })).toBe(true);
    });

    it('simulates org members insert check: org admin cannot insert member as owner', () => {
      const evaluateOrgMembersInsert = (
        actor: { isSuperAdmin: boolean; isOrgAdmin: boolean; orgId: string },
        newMember: { organization_id: string; is_owner: boolean }
      ) => {
        if (actor.isSuperAdmin) return true;
        if (actor.isOrgAdmin && newMember.organization_id === actor.orgId) {
          return newMember.is_owner === false;
        }
        return false;
      };

      const orgAdmin = { isSuperAdmin: false, isOrgAdmin: true, orgId: 'org-1' };
      const maliciousOwnerInsert = { organization_id: 'org-1', is_owner: true };
      const validMemberInsert = { organization_id: 'org-1', is_owner: false };

      expect(evaluateOrgMembersInsert(orgAdmin, maliciousOwnerInsert)).toBe(false);
      expect(evaluateOrgMembersInsert(orgAdmin, validMemberInsert)).toBe(true);
    });
  });

  // ============================================================================
  // 4. FUNCTION EXECUTION RESTRICTIONS (HIGH-13)
  // ============================================================================
  describe('HIGH-13: Function Execution ACL Lockdown', () => {
    it('revokes execution of get_user_effective_permissions from PUBLIC and anon', () => {
      expect(migrationSql).toMatch(/REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.get_user_effective_permissions\s*\(\s*UUID\s*,\s*UUID\s*\)\s+FROM\s+PUBLIC\s*,\s*anon;/i);
    });

    it('grants execution of get_user_effective_permissions to authenticated and service_role', () => {
      expect(migrationSql).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.get_user_effective_permissions\s*\(\s*UUID\s*,\s*UUID\s*\)\s+TO\s+authenticated\s*,\s*service_role;/i);
    });
  });
});
