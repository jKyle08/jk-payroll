/**
 * Canonical role-code rules shared by the API and client.
 * Database equivalents are kept in the Phase 3.1B migration and tests.
 */
export const PROTECTED_ORGANIZATION_ROLE_CODES = [
  'SUPERADMIN',
  'PLATFORMSUPERADMIN',
  'TENANTADMIN',
  'ORGANIZATIONADMIN',
  'ORGADMIN',
  'ADMIN',
] as const;

export function normalizeRoleCode(code: string): string {
  return code.replace(/[\s_-]+/gu, '').toUpperCase();
}

const protectedRoleCodeSet = new Set<string>(PROTECTED_ORGANIZATION_ROLE_CODES);

export function isProtectedOrganizationRoleCode(code: string): boolean {
  return protectedRoleCodeSet.has(normalizeRoleCode(code));
}
