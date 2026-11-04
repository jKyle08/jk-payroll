// ==============================================================================
// JK-PAYROLL: AUTH FEATURE SERVICE
// File: src/features/auth/auth.service.ts
// ==============================================================================

import { getSupabaseAnonClient, getSupabaseClient } from '../../db/supabase.js';
import { db } from '../../db/repository.js';
import { generateTestToken } from '../../middleware/auth.middleware.js';
import { LoginInput, RegisterInput, UserSessionData } from './types.js';

export class AuthService {
  /**
   * Authenticates a user with email and password via Supabase Auth
   */
  public async login(input: LoginInput): Promise<UserSessionData> {
    const supabaseAnon = getSupabaseAnonClient();
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (authError || !authData.user) {
      // Auto-provision Super Admin if requested
      if (
        (input.email === 'superadmin@jkpayroll.com' && input.password === 'SuperAdmin123!') ||
        (input.email === 'superadmin@paypulse.internal' && input.password === 'SuperAdmin2026!')
      ) {
        await this.ensureSuperAdminData(input.email, input.password);
        const retry = await supabaseAnon.auth.signInWithPassword({
          email: input.email,
          password: input.password,
        });
        if (retry.data?.user && retry.data.session) {
          return this.resolveUserSession(retry.data.user.id, retry.data.session.access_token);
        }
      }

      // Auto-provision Tenant Admin demo if requested
      if (input.email === 'admin@apexcorp.com' && input.password === 'Password123!') {
        await this.ensureDemoData();
        const retry = await supabaseAnon.auth.signInWithPassword({
          email: input.email,
          password: input.password,
        });
        if (retry.data?.user && retry.data.session) {
          return this.resolveUserSession(retry.data.user.id, retry.data.session.access_token);
        }
      }

      throw new Error(authError?.message || 'Invalid email or password');
    }

    return this.resolveUserSession(authData.user.id, authData.session.access_token);
  }

  /**
   * Registers a new tenant and administrator profile in Supabase Auth and database
   */
  public async register(input: RegisterInput): Promise<UserSessionData> {
    const adminClient = getSupabaseClient();

    // 1. Create Supabase Auth user
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName },
    });

    let userId: string;
    if (createError) {
      if (createError.message.includes('already registered')) {
        throw new Error('User with this email is already registered. Please log in.');
      }
      throw new Error(`Auth registration error: ${createError.message}`);
    } else {
      userId = createData.user.id;
    }

    const tenantName = input.tenantName || 'Apex Health Systems';
    const tenantCode = input.tenantCode || 'APEX-HLTH';
    const deptName = input.departmentName || 'Human Resources';
    const deptCode = input.departmentCode || 'HR';

    // 2. Insert or fetch tenant
    const { data: tenantData, error: tenantError } = await adminClient
      .from('organizations')
      .insert({ name: tenantName, code: tenantCode, is_active: true })
      .select('id, name, code')
      .single();

    let tenantId = tenantData?.id;
    if (tenantError) {
      const { data: existingTenant } = await adminClient
        .from('organizations')
        .select('id, name, code')
        .eq('code', tenantCode)
        .single();
      if (existingTenant) tenantId = existingTenant.id;
    }

    if (!tenantId) {
      throw new Error('Failed to create or associate organization tenant');
    }

    // 3. Insert or fetch department
    const { data: deptData } = await adminClient
      .from('departments')
      .insert({
        organization_id: tenantId,
        name: deptName,
        code: deptCode,
        is_active: true,
      })
      .select('id')
      .single();

    let departmentId = deptData?.id;
    if (!departmentId) {
      const { data: existingDept } = await adminClient
        .from('departments')
        .select('id')
        .eq('organization_id', tenantId)
        .eq('code', deptCode)
        .single();
      if (existingDept) departmentId = existingDept.id;
    }

    // 4. Upsert Profile
    await adminClient.from('profiles').upsert({
      id: userId,
      organization_id: tenantId,
      department_id: departmentId,
      full_name: input.fullName,
      email: input.email,
      is_active: true,
      is_organization_admin: true,
      is_super_admin: false,
    });

    // 5. Generate session token
    const token = generateTestToken({
      userId,
      tenantId,
      departmentId,
      isTenantAdmin: true,
      isSuperAdmin: false,
    });

    return {
      userId,
      email: input.email,
      fullName: input.fullName,
      tenantId,
      tenantName,
      tenantCode,
      departmentId,
      departmentName: deptName,
      isTenantAdmin: true,
      isSuperAdmin: false,
      token,
      effectivePermissions: [
        'TypeOfLeave.View',
        'TypeOfLeave.Add',
        'TypeOfLeave.Edit',
        'TypeOfLeave.Delete',
        'RequestForLeave.View',
        'RequestForLeave.Add',
        'RequestForLeave.Edit',
        'RequestForLeave.Delete',
        'RequestForLeave.Approval.Create',
        'PayrollComputation.View',
      ],
    };
  }

  /**
   * Resolves complete user session from database by Supabase User ID
   */
  public async resolveUserSession(userId: string, accessToken?: string): Promise<UserSessionData> {
    const adminClient = getSupabaseClient();

    // 1. Fetch Profile (Check in-memory db repository first, then remote Supabase)
    const localProfile = db.getProfileById(userId);
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

    // If not found by ID, attempt lookup by auth email or auto-link Super Admin
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
        } else if (email === 'superadmin@jkpayroll.com' || email === 'superadmin@paypulse.internal') {
          const rootTenantId = '00000000-0000-0000-0000-000000000000';
          await adminClient
            .from('organizations')
            .upsert({ id: rootTenantId, name: 'System Root', code: 'ROOT', is_active: true });

          const newProfile = {
            id: userId,
            organization_id: rootTenantId,
            department_id: null,
            full_name: 'Super Administrator',
            email: email,
            is_active: true,
            is_organization_admin: false,
            is_super_admin: true,
          };
          await adminClient.from('profiles').upsert(newProfile);
          profile = newProfile;
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
          'Tenant.View',
          'Tenant.Add',
          'Tenant.Edit',
          'Tenant.Delete',
          'Department.View',
          'Department.Add',
          'Department.Edit',
          'Department.Delete',
          'Profile.View',
          'Profile.Add',
          'Profile.Edit',
          'Profile.Delete',
          'UserRole.View',
          'UserRole.Add',
          'UserRole.Edit',
          'UserRole.Delete',
          'TenantModule.View',
          'TenantModule.Add',
          'TenantModule.Edit',
          'TenantModule.Delete',
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
        ];
      }
    } else {
      const { data: rpcPerms } = await adminClient.rpc('get_user_effective_permissions', {
        p_user_id: userId,
      });

      if (rpcPerms && Array.isArray(rpcPerms) && rpcPerms.length > 0) {
        permissions = rpcPerms;
      } else {
        // Fallback default permissions
        permissions = [
          'TypeOfLeave.View',
          'TypeOfLeave.Add',
          'RequestForLeave.View',
          'RequestForLeave.Approval.Create',
          'PayrollComputation.View',
        ];
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
   * Seeds demo tenant and user
   */
  public async ensureDemoData(): Promise<void> {
    const adminClient = getSupabaseClient();
    const demoEmail = 'admin@apexcorp.com';
    const demoPass = 'Password123!';

    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: demoEmail,
      password: demoPass,
      email_confirm: true,
      user_metadata: { full_name: 'Alexander Wright' },
    });

    let userId = createData?.user?.id;
    if (createError && createError.message.includes('already registered')) {
      const { data: list } = await adminClient.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email === demoEmail);
      if (existing) userId = existing.id;
    }

    if (!userId) return;

    // Tenant
    let tenantId = 'tnt-apex-health-01';
    const { data: tData } = await adminClient
      .from('organizations')
      .upsert({ id: tenantId, name: 'Apex Health Systems', code: 'APEX-HLTH', is_active: true })
      .select('id')
      .single();
    if (tData) tenantId = tData.id;

    // Department
    let deptId = 'dpt-hr-01';
    const { data: dData } = await adminClient
      .from('departments')
      .upsert({
        id: deptId,
        organization_id: tenantId,
        name: 'Human Resources',
        code: 'HR',
        is_active: true,
      })
      .select('id')
      .single();
    if (dData) deptId = dData.id;

    // Profile
    await adminClient.from('profiles').upsert({
      id: userId,
      organization_id: tenantId,
      department_id: deptId,
      full_name: 'Alexander Wright',
      email: demoEmail,
      is_active: true,
      is_organization_admin: true,
      is_super_admin: false,
    });
  }

  /**
   * Seeds SuperAdmin account
   */
  public async ensureSuperAdminData(
    email: string = 'superadmin@jkpayroll.com',
    pass: string = 'SuperAdmin123!'
  ): Promise<void> {
    const adminClient = getSupabaseClient();

    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: pass,
      email_confirm: true,
      user_metadata: { full_name: 'Master Super Admin' },
    });

    let userId = createData?.user?.id;
    if (createError && createError.message.includes('already registered')) {
      const { data: list } = await adminClient.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email === email);
      if (existing) userId = existing.id;
    }

    if (!userId) return;

    // Root tenant
    const rootTenantId = '00000000-0000-0000-0000-000000000000';
    await adminClient
      .from('organizations')
      .upsert({ id: rootTenantId, name: 'System Root', code: 'ROOT', is_active: true });

    // Profile
    await adminClient.from('profiles').upsert({
      id: userId,
      organization_id: rootTenantId,
      department_id: null,
      full_name: 'Master Super Admin',
      email,
      is_active: true,
      is_organization_admin: true,
      is_super_admin: true,
    });
  }
}

export const authService = new AuthService();
