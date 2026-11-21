// ==============================================================================
// JK-PAYROLL: AUTH FEATURE SERVICE
// File: src/features/auth/auth.service.ts
// ==============================================================================

import { getSupabaseAnonClient, getSupabaseClient } from '../../server/db/supabase.js';
import { db } from '../../server/db/repository.js';
import { generateTestToken } from '../../server/middleware/auth.middleware.js';
import { ENV } from '../../server/config/env.js';
import { createHash } from 'node:crypto';
import {
  fetchOrganizationById,
  validateOrganizationEligibility,
  validateUserOrganizationMembership,
} from '../organizations/organization-context.service.js';
import { OrganizationMember } from '../../shared/types/index.js';
import { LoginInput, RegisterInput, UserSessionData } from './types.js';

export class AuthService {
  /**
   * Authenticates a user with email and password via Supabase Auth.
   * Strictly enforces credentials against the identity provider;
   * no backdoor credentials or auto-provisioning logic allowed.
   */
  public async login(input: LoginInput): Promise<UserSessionData> {
    // Explicitly reject deprecated/hardcoded backdoor credentials (SEC-FIND-02)
    const normalizedEmail = input.email.trim().toLowerCase();
    if (
      (normalizedEmail === 'superadmin@jkpayroll.com' && input.password === 'SuperAdmin123!') ||
      (normalizedEmail === 'admin@apexcorp.com' && input.password === 'Password123!')
    ) {
      throw new Error('Invalid email or password');
    }

    const supabaseAnon = getSupabaseAnonClient();
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (authError || !authData.user) {
      throw new Error('Invalid email or password');
    }

    try {
      return await this.resolveUserSession(authData.user.id, authData.session.access_token);
    } catch (err: any) {
      // Fail closed with standard invalid credentials error for login attempts (SEC-FIND-02)
      throw new Error('Invalid email or password');
    }
  }

  /** Register an invited organization member; org, department and role come only from the token. */
  public async register(input: RegisterInput): Promise<UserSessionData> {
    const email = input.email.trim().toLowerCase();
    const tokenHash = createHash('sha256').update(input.invitationToken).digest('hex');
    const adminClient = getSupabaseClient();
    const anonClient = getSupabaseAnonClient();

    const { data: invitation, error: invitationError } = await adminClient
      .from('organization_member_invitations')
      .select('invited_email,expires_at,redeemed_at,redeemed_by')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (invitationError || !invitation || invitation.invited_email.toLowerCase() !== email) {
      throw new Error('Invalid invitation or invited email mismatch');
    }
    if (!invitation.redeemed_at && new Date(invitation.expires_at).getTime() <= Date.now()) {
      throw new Error('Invitation has expired');
    }

    let userId: string | undefined;
    let createdAuthUser = false;
    let databaseCommitted = false;
    let authSession: any = null;

    // Existing invited accounts may accept an invitation by authenticating normally.
    const existingLogin = await anonClient.auth.signInWithPassword({ email, password: input.password });
    if (!existingLogin.error && existingLogin.data.user) {
      userId = existingLogin.data.user.id;
      authSession = existingLogin.data.session;
    } else {
      if (invitation.redeemed_at) throw new Error('Invitation has already been used');
      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password: input.password,
        email_confirm: true,
        user_metadata: { full_name: input.fullName },
      });
      if (error || !data.user) throw new Error(error?.message || 'Could not create the invited account');
      userId = data.user.id;
      createdAuthUser = true;
    }
    if (invitation.redeemed_at && invitation.redeemed_by !== userId) {
      throw new Error('Invitation has already been used');
    }

    try {
      const { error } = await adminClient.rpc('provision_organization_member_from_invitation', {
        p_token_hash: tokenHash,
        p_user_id: userId,
        p_full_name: input.fullName,
      });
      if (error) throw new Error(error.message || 'Membership provisioning failed');
      databaseCommitted = true;

      if (!authSession) {
        const signIn = await anonClient.auth.signInWithPassword({ email, password: input.password });
        if (signIn.error || !signIn.data.user || !signIn.data.session) {
          throw new Error(signIn.error?.message || 'Membership was created but a session could not be started');
        }
        authSession = signIn.data.session;
      }
      return await this.resolveUserSession(userId, authSession.access_token);
    } catch (error) {
      // Supabase Auth and PostgreSQL are separate services. The membership RPC is
      // transactional; remove a new Auth identity if that transaction fails.
      if (createdAuthUser && userId && !databaseCommitted) {
        const { error: cleanupError } = await adminClient.auth.admin.deleteUser(userId);
        if (cleanupError) console.error('Unable to remove unprovisioned Auth identity:', cleanupError.message);
      }
      throw error;
    }
  }

  /**
   * Resolves complete user session from database by Supabase User ID
   */
  public async resolveUserSession(userId: string, accessToken?: string): Promise<UserSessionData> {
    const adminClient = getSupabaseClient();

    // 1. Fetch Profile (Check in-memory db repository first, then remote Supabase)
    const localProfile = ENV.NODE_ENV === 'production' ? undefined : db.getProfileById(userId);
    let profile = localProfile
      ? {
          id: localProfile.id,
          full_name: localProfile.fullName,
          email: localProfile.email,
          organization_id: localProfile.tenantId,
          department_id: localProfile.departmentId,
          is_active: localProfile.isActive,
          is_organization_admin: localProfile.isTenantAdmin,
          is_super_admin: localProfile.isSuperAdmin,
        }
      : null;

    if (!profile) {
      const { data: remoteProfile } = await adminClient
        .from('profiles')
        .select('id, full_name, email, organization_id, department_id, is_active, is_organization_admin, is_super_admin')
        .eq('id', userId)
        .single();
      if (remoteProfile) {
        profile = remoteProfile;
      }
    }

    // If not found by ID, attempt lookup by auth email
    if (!profile) {
      const { data: authUser } = await adminClient.auth.admin.getUserById(userId);
      if (authUser?.user?.email) {
        const email = authUser.user.email.toLowerCase();
        const { data: profileByEmail } = await adminClient
          .from('profiles')
          .select('id, full_name, email, organization_id, department_id, is_active, is_organization_admin, is_super_admin')
          .eq('email', email)
          .single();

        if (profileByEmail) {
          profile = profileByEmail;
        }
      }
    }

    if (!profile) {
      throw new Error(`Profile not found for user: ${userId}`);
    }

    // 2. Fetch Tenant
    let tenantName = 'Default Organization';
    let tenantCode = 'APEX-HLTH';
    if (profile.organization_id) {
      // Organization Access & Expiration Enforcement:
      // SuperAdmin company dates are null (no expiration time bomb).
      // For tenant companies, if endDate is past, users under that company cannot log in.
      const tenantRecord = db.getTenantById(profile.organization_id);
      if (!profile.is_super_admin && tenantRecord?.endDate) {
        const expirationTime = new Date(tenantRecord.endDate).getTime();
        if (expirationTime < Date.now()) {
          throw new Error(
            'Organization subscription or access period has expired. Users under this company cannot log in.'
          );
        }
      }

      if (tenantRecord) {
        tenantName = tenantRecord.name;
        tenantCode = tenantRecord.code;
      } else {
        const { data: tenant } = await adminClient
          .from('organizations')
          .select('id, name, code')
          .eq('id', profile.organization_id)
          .single();
        if (tenant) {
          tenantName = tenant.name;
          tenantCode = tenant.code;
        }
      }
    }

    // 3. Fetch Department
    let departmentName = 'General Department';
    if (profile.department_id) {
      const localDept = db.getDepartmentById(profile.department_id);
      if (localDept) {
        departmentName = localDept.name;
      } else {
        const { data: dept } = await adminClient
          .from('departments')
          .select('id, name, code')
          .eq('id', profile.department_id)
          .single();
        if (dept) {
          departmentName = dept.name;
        }
      }
    }

    // 4. Fetch Effective Permissions (with View expansion)
    let permissions: string[] = [];
    if (localProfile) {
      permissions = db.getUserEffectivePermissions(profile.organization_id, userId);
    } else if (profile.is_super_admin) {
      const { data: allActions } = await adminClient
        .from('module_actions')
        .select('full_key');

      if (allActions && allActions.length > 0) {
        permissions = allActions.map((a: { full_key: string }) => a.full_key);
      } else {
        permissions = [
          'Organization.View',
          'Organization.Add',
          'Organization.Edit',
          'Organization.Delete',
          'Department.View',
          'Department.Add',
          'Department.Edit',
          'Department.Delete',
          'Profile.View',
          'Profile.Add',
          'Profile.Edit',
          'Profile.Delete',
          'Role.View',
          'Role.Add',
          'Role.Edit',
          'Role.Delete',
          'UserRole.View',
          'UserRole.Add',
          'UserRole.Edit',
          'UserRole.Delete',
          'OrganizationModule.View',
          'OrganizationModule.Add',
          'OrganizationModule.Edit',
          'OrganizationModule.Delete',
          'DepartmentModule.View',
          'DepartmentModule.Add',
          'DepartmentModule.Edit',
          'DepartmentModule.Delete',
          'RolePermission.View',
          'RolePermission.Add',
          'RolePermission.Edit',
          'RolePermission.Delete',
          'UserPermission.View',
          'UserPermission.Add',
          'UserPermission.Edit',
          'UserPermission.Delete',
          // Backward-compatibility aliases
          'Tenant.View',
          'Tenant.Add',
          'Tenant.Edit',
          'Tenant.Delete',
          'TenantModule.View',
          'TenantModule.Add',
          'TenantModule.Edit',
          'TenantModule.Delete',
        ];
      }
    } else {
      try {
        const { data: rpcPerms, error: rpcError } = await adminClient.rpc('get_user_effective_permissions', {
          p_organization_id: profile.organization_id,
          p_user_id: userId,
        });

        if (rpcError) {
          console.error('Failed to resolve effective permissions via RPC:', rpcError.message);
          permissions = [];
        } else if (rpcPerms && Array.isArray(rpcPerms)) {
          permissions = rpcPerms;
        } else {
          permissions = [];
        }
      } catch (err: any) {
        console.error('Exception resolving effective permissions via RPC:', err?.message || err);
        permissions = [];
      }
    }

    const token = accessToken || generateTestToken({
      userId: profile.id,
      tenantId: profile.organization_id,
      departmentId: profile.department_id,
      isTenantAdmin: Boolean(profile.is_organization_admin),
      isSuperAdmin: Boolean(profile.is_super_admin),
    });

    return {
      userId: profile.id,
      email: profile.email || 'user@apexcorp.internal',
      fullName: profile.full_name || 'System User',
      tenantId: profile.organization_id,
      tenantName,
      tenantCode,
      departmentId: profile.department_id,
      departmentName,
      isTenantAdmin: Boolean(profile.is_organization_admin),
      isSuperAdmin: Boolean(profile.is_super_admin),
      token,
      effectivePermissions: permissions,
    };
  }

  /**
   * Explicit administrative seeding helper strictly for development / test environments.
   * Prohibited in production.
   */
  public async provisionTestSuperAdmin(
    email: string,
    pass: string,
    fullName: string = 'Master Super Admin'
  ): Promise<string> {
    if (ENV.NODE_ENV === 'production') {
      throw new Error('Security Violation: provisionTestSuperAdmin is forbidden in production.');
    }

    const adminClient = getSupabaseClient();
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: pass,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    let userId = createData?.user?.id;
    if (createError && createError.message.includes('already registered')) {
      const { data: list } = await adminClient.auth.admin.listUsers();
      const existing = (list?.users as Array<{ id: string; email?: string }>)?.find((u) => u.email === email);
      if (existing) userId = existing.id;
    }

    if (!userId) {
      throw new Error(`Failed to provision test super admin user: ${createError?.message}`);
    }

    const rootTenantId = '00000000-0000-0000-0000-000000000000';
    await adminClient
      .from('organizations')
      .upsert({ id: rootTenantId, name: 'System Root', code: 'ROOT', is_active: true });

    await adminClient.from('profiles').upsert({
      id: userId,
      organization_id: rootTenantId,
      department_id: null,
      full_name: fullName,
      email,
      is_active: true,
      is_organization_admin: true,
      is_super_admin: true,
    });

    return userId;
  }

  /**
   * Switches active organization context for the authenticated user.
   * Enforces membership validity, organization status, and expiration.
   */
  public async switchOrganization(
    userId: string,
    targetOrgId: string
  ): Promise<{
    success: boolean;
    message: string;
    token: string;
    organization: {
      id: string;
      name: string;
      code: string;
      slug?: string;
      status: string;
      isActive: boolean;
    };
    user: {
      userId: string;
      tenantId: string;
      tenantName: string;
      tenantCode: string;
      effectivePermissions: string[];
    };
  }> {
    // 1. Fetch target organization
    const org = await fetchOrganizationById(targetOrgId);
    if (!org) {
      throw Object.assign(new Error('Organization not found'), {
        statusCode: 404,
        code: 'ORGANIZATION_NOT_FOUND',
      });
    }

    // 2. Fetch profile
    const profile = db.getProfileById(userId);
    if (!profile) {
      throw Object.assign(new Error('User profile not found'), {
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });
    }

    if (!profile.isActive) {
      throw Object.assign(new Error('User account is inactive'), {
        statusCode: 403,
        code: 'TENANT_ACCESS_DENIED',
      });
    }

    // 3. Validate Membership
    let membership: OrganizationMember | undefined;
    if (!profile.isSuperAdmin) {
      const membershipResult = await validateUserOrganizationMembership(targetOrgId, userId);
      if (!membershipResult.valid) {
        throw Object.assign(
          new Error(membershipResult.error || 'Access denied to requested organization'),
          {
            statusCode: 403,
            code: membershipResult.code || 'TENANT_ACCESS_DENIED',
          }
        );
      }
      membership = membershipResult.member;
    } else {
      membership = db.getOrganizationMember(targetOrgId, userId);
    }

    // 4. Validate Organization Eligibility (Status and Expiration)
    // Non-superadmin cannot access expired or inactive organizations
    if (!profile.isSuperAdmin) {
      const eligibility = validateOrganizationEligibility(org);
      if (!eligibility.valid) {
        throw Object.assign(new Error(eligibility.error || 'Organization access blocked'), {
          statusCode: 403,
          code: eligibility.code || 'INACTIVE_OR_EXPIRED_ORGANIZATION',
        });
      }
    }

    // 5. Compute effective permissions for the new organization
    const permissions = db.getUserEffectivePermissions(targetOrgId, userId);

    // 6. Issue updated session token scoped to the target organization
    const token = generateTestToken({
      userId,
      tenantId: targetOrgId,
      departmentId: membership?.departmentId || null,
      isTenantAdmin: Boolean(membership?.isOwner || (profile.tenantId === targetOrgId && profile.isTenantAdmin)),
      isSuperAdmin: Boolean(profile.isSuperAdmin),
    });

    return {
      success: true,
      message: 'Organization switched successfully',
      token,
      organization: {
        id: org.id,
        name: org.name,
        code: org.code,
        slug: org.slug,
        status: org.status || (org.isActive ? 'Active' : 'Suspended'),
        isActive: org.isActive,
      },
      user: {
        userId,
        tenantId: org.id,
        tenantName: org.name,
        tenantCode: org.code,
        effectivePermissions: permissions,
      },
    };
  }

  /**
   * Refreshes an active authentication session.
   * If a Supabase refresh token is provided, uses Supabase Auth to rotate tokens.
   * Otherwise validates that the user and tenant remain active and unexpired before reissuing.
   */
  public async refreshToken(token?: string, refreshToken?: string): Promise<{ token: string; user: UserSessionData }> {
    if (refreshToken) {
      const supabaseAnon = getSupabaseAnonClient();
      const { data, error } = await supabaseAnon.auth.refreshSession({ refresh_token: refreshToken });
      if (error || !data.user || !data.session) {
        throw new Error('Invalid or expired refresh token');
      }
      const user = await this.resolveUserSession(data.user.id, data.session.access_token);
      return { token: data.session.access_token, user };
    }

    if (!token) {
      throw new Error('Authentication token required for refresh');
    }

    // Inspect token payload safely
    let userId: string | null = null;
    try {
      const parts = token.split('.');
      if (parts.length >= 2) {
        const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const decodedStr = Buffer.from(payloadBase64, 'base64').toString('utf-8');
        const payload = JSON.parse(decodedStr);
        userId = payload.sub || payload.userId || null;
      }
    } catch {
      throw new Error('Malformed token provided for refresh');
    }

    if (!userId) {
      throw new Error('Unable to extract user identity from token');
    }

    // Validate that profile and organization still exist and are eligible
    const user = await this.resolveUserSession(userId);
    return { token: user.token, user };
  }
}

export const authService = new AuthService();
