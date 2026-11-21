// ==============================================================================
// JK-PAYROLL: ORGANIZATION CONTEXT & MEMBERSHIP VALIDATION SERVICE
// File: src/features/organizations/organization-context.service.ts
// Findings: SEC-FIND-04, SEC-FIND-08
// ==============================================================================

import { Request } from 'express';
import { db } from '../../server/db/repository.js';
import { getSupabaseClient } from '../../server/db/supabase.js';
import { Tenant, OrganizationMember, AuthUserContext } from '../../shared/types/index.js';
import { isSuperAdmin } from '../../server/middleware/rbac.guard.js';

export interface OrganizationEligibilityResult {
  valid: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'NOT_FOUND';
  error?: string;
  code?: 'ORGANIZATION_NOT_FOUND' | 'INACTIVE_ORGANIZATION' | 'INACTIVE_OR_EXPIRED_ORGANIZATION';
}

export interface OrganizationMembershipResult {
  valid: boolean;
  member?: OrganizationMember;
  error?: string;
  code?: 'TENANT_ACCESS_DENIED' | 'ORGANIZATION_ACCESS_DENIED' | 'UNAUTHORIZED';
}

export interface OrganizationContextResolutionResult {
  valid: boolean;
  organization?: Tenant;
  membership?: OrganizationMember;
  error?: string;
  code?: string;
  statusCode?: number;
}

/**
 * Parses end_date into a millisecond timestamp.
 * - Null / undefined: Returns null (unlimited subscription)
 * - ISO Timestamps (e.g. 2026-12-31T18:00:00Z): Returns exact timestamp
 * - Date-only format (YYYY-MM-DD): Evaluated as valid through the end of that calendar day (23:59:59.999Z in UTC)
 */
export function parseExpirationTimestamp(endDate: string | Date | null | undefined): number | null {
  if (!endDate) return null;
  if (endDate instanceof Date) {
    return endDate.getTime();
  }
  const trimmed = String(endDate).trim();
  if (!trimmed) return null;

  // Calendar day format (YYYY-MM-DD): valid throughout that day until 23:59:59.999 UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T23:59:59.999Z`).getTime();
  }

  const parsed = new Date(trimmed).getTime();
  return isNaN(parsed) ? null : parsed;
}

/**
 * Determines whether an organization's subscription has expired relative to a reference time.
 */
export function isOrganizationExpired(
  endDate: string | Date | null | undefined,
  referenceTime = Date.now()
): boolean {
  const expirationTimestamp = parseExpirationTimestamp(endDate);
  if (expirationTimestamp === null) {
    return false; // Unlimited access
  }
  return referenceTime > expirationTimestamp;
}

/**
 * Validates organization status and subscription expiration.
 */
export function validateOrganizationEligibility(
  organization?: Tenant | null,
  referenceTime = Date.now()
): OrganizationEligibilityResult {
  if (!organization) {
    return {
      valid: false,
      status: 'NOT_FOUND',
      error: 'Organization not found',
      code: 'ORGANIZATION_NOT_FOUND',
    };
  }

  // Active status check: must not be suspended or onboarding
  const isStatusActive =
    organization.isActive !== false &&
    (!organization.status || organization.status.toLowerCase() === 'active');

  if (!isStatusActive) {
    return {
      valid: false,
      status: 'INACTIVE',
      error: 'Forbidden: Tenant account is inactive or suspended',
      code: 'INACTIVE_ORGANIZATION',
    };
  }

  // Expiration check
  if (isOrganizationExpired(organization.endDate, referenceTime)) {
    return {
      valid: false,
      status: 'EXPIRED',
      error: 'Organization subscription or access period has expired. Access blocked.',
      code: 'INACTIVE_OR_EXPIRED_ORGANIZATION',
    };
  }

  return {
    valid: true,
    status: 'ACTIVE',
  };
}

/**
 * Timeout wrapper for remote database queries to prevent hangs when offline or during tests.
 */
async function withSupabaseTimeout<T = any>(
  promise: PromiseLike<T> | Promise<T>,
  timeoutMs = (process.env.NODE_ENV === 'test' ? 150 : 2000)
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs);
  });
  try {
    const res = await Promise.race([Promise.resolve(promise), timeoutPromise]);
    return res as T | null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Retrieves an organization record from in-memory DB or Supabase.
 */
export async function fetchOrganizationById(orgId: string): Promise<Tenant | undefined> {
  // Production authorization reads lifecycle state from PostgreSQL on every request;
  // this process-local mirror is only a development/test convenience.
  const localTenant = process.env.NODE_ENV === 'production' ? undefined : db.getTenantById(orgId);
  if (localTenant) return localTenant;

  try {
    const supabase = getSupabaseClient();
    const res = await withSupabaseTimeout(
      supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .maybeSingle()
    );

    const remoteTenant = res?.data;
    if (remoteTenant) {
      const status = remoteTenant.status || (remoteTenant.is_active ? 'Active' : 'Suspended');
      const tenant: Tenant = {
        id: remoteTenant.id,
        name: remoteTenant.name,
        code: remoteTenant.code,
        slug: remoteTenant.slug,
        isActive: status === 'Active',
        status,
        startDate: remoteTenant.start_date || remoteTenant.created_at,
        endDate: remoteTenant.end_date,
        createdAt: new Date(remoteTenant.created_at),
        updatedAt: new Date(remoteTenant.updated_at),
      };
      db.tenants.set(tenant.id, tenant);
      return tenant;
    }
  } catch (err) {
    // Supabase query error or offline test runner
  }

  return undefined;
}

/**
 * Validates that the authenticated user possesses an active membership in the target organization.
 */
export async function validateUserOrganizationMembership(
  organizationId: string,
  userId: string
): Promise<OrganizationMembershipResult> {
  // 1. Check in-memory repository
  const localMember = process.env.NODE_ENV === 'production'
    ? undefined
    : db.getOrganizationMember(organizationId, userId);
  if (localMember) {
    if (localMember.isActive === false) {
      return {
        valid: false,
        member: localMember,
        error: 'Forbidden: Organization membership is inactive',
        code: 'ORGANIZATION_ACCESS_DENIED',
      };
    }
    return { valid: true, member: localMember };
  }

  // 2. Fallback to Supabase remote PostgreSQL table
  try {
    const supabase = getSupabaseClient();
    const res = await withSupabaseTimeout(
      supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .maybeSingle()
    );

    const remoteMember = res?.data;
    if (remoteMember) {
      const member: OrganizationMember = {
        id: remoteMember.id,
        organizationId: remoteMember.organization_id,
        userId: remoteMember.user_id,
        roleId: remoteMember.role_id,
        departmentId: remoteMember.department_id,
        isOwner: Boolean(remoteMember.is_owner),
        isActive: remoteMember.is_active !== false,
        createdAt: new Date(remoteMember.created_at),
        updatedAt: new Date(remoteMember.updated_at),
      };
      db.organizationMembers.set(`${organizationId}:${userId}`, member);

      if (member.isActive === false) {
        return {
          valid: false,
          member,
          error: 'Forbidden: Organization membership is inactive',
          code: 'ORGANIZATION_ACCESS_DENIED',
        };
      }
      return { valid: true, member };
    }
  } catch (err) {
    // Supabase query error
  }

  // 3. Phase 1.1.1: NO profile-based fallback. profiles.organization_id / token claims are not
  //    membership proof; only an active organization_members record authorizes access.

  return {
    valid: false,
    error: 'Forbidden: User is not an active member of this organization',
    code: 'ORGANIZATION_ACCESS_DENIED',
  };
}

/**
 * Checks if the request targets platform-wide administrative functions where Super Admins
 * are authorized to view or manage inactive/expired organizations.
 */
export function isAdministrativeRoute(req: Request): boolean {
  const originalUrl = req.originalUrl || req.url || '';
  const baseUrl = req.baseUrl || '';
  const path = req.path || '';

  return (
    originalUrl.startsWith('/api/organizations') ||
    originalUrl.startsWith('/api/super-admin') ||
    baseUrl.startsWith('/api/organizations') ||
    baseUrl.startsWith('/api/super-admin') ||
    path.startsWith('/organizations') ||
    path.startsWith('/super-admin')
  );
}

/**
 * Centralized Organization Context Resolution:
 * Resolves, validates, and scopes the active organization context for the incoming request.
 */
export async function resolveOrganizationContext(
  req: Request,
  user: AuthUserContext
): Promise<OrganizationContextResolutionResult> {
  const headerOrgId = (
    req.headers['x-organization-id'] ||
    req.headers['x-tenant-id']
  ) as string | undefined;

  const requestedOrgId = headerOrgId ? String(headerOrgId).trim() : undefined;
  const targetOrgId = requestedOrgId || user.tenantId;

  if (!targetOrgId) {
    return {
      valid: false,
      statusCode: 400,
      code: 'ORGANIZATION_CONTEXT_REQUIRED',
      error: 'Organization context required',
    };
  }

  // 1. Fetch target organization
  const organization = await fetchOrganizationById(targetOrgId);
  if (!organization) {
    return {
      valid: false,
      statusCode: 404,
      code: 'ORGANIZATION_NOT_FOUND',
      error: 'Organization not found',
    };
  }

  const isUserSuperAdmin = isSuperAdmin(user);

  // 2. Validate Membership: Super Admin has platform-wide access; all others require active membership
  let membership: OrganizationMember | undefined;
  if (!isUserSuperAdmin) {
    const membershipResult = await validateUserOrganizationMembership(targetOrgId, user.userId);
    if (!membershipResult.valid) {
      return {
        valid: false,
        statusCode: 403,
        code: membershipResult.code || 'ORGANIZATION_ACCESS_DENIED',
        error: membershipResult.error || 'Forbidden: Access denied to requested organization',
      };
    }
    membership = membershipResult.member;
  } else {
    // For Super Admin, check if local membership exists
    membership = db.getOrganizationMember(targetOrgId, user.userId);
  }

  // 3. Validate Organization Status & Expiration
  // Privileged Super Admin can only bypass organization expiration/status on explicit administrative routes
  const allowAdminBypass = isUserSuperAdmin && isAdministrativeRoute(req);
  if (!allowAdminBypass) {
    const eligibility = validateOrganizationEligibility(organization);
    if (!eligibility.valid) {
      return {
        valid: false,
        statusCode: 403,
        code: eligibility.code || 'INACTIVE_OR_EXPIRED_ORGANIZATION',
        error: eligibility.error || 'Organization access is blocked',
      };
    }
  }

  return {
    valid: true,
    organization,
    membership,
  };
}
