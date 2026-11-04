// ==============================================================================
// JK-PAYROLL: AUTH FEATURE TYPES
// File: src/features/auth/types.ts
// ==============================================================================

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  tenantName?: string;
  tenantCode?: string;
  departmentName?: string;
  departmentCode?: string;
}

export interface UserSessionData {
  userId: string;
  email: string;
  fullName: string;
  tenantId: string;
  tenantName: string;
  tenantCode: string;
  departmentId: string | null;
  departmentName: string;
  isTenantAdmin: boolean;
  isSuperAdmin: boolean;
  token: string;
  effectivePermissions: string[];
}

export interface AuthResponse {
  token: string;
  user: UserSessionData;
}
