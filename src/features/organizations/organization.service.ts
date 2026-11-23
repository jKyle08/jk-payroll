// ==============================================================================
// JK-PAYROLL: ORGANIZATION FEATURE SERVICE
// Database Operations & Business Logic with Tenant Scoping
// File: src/features/organizations/organization.service.ts
// ==============================================================================

import { db } from '../../server/db/repository.js';
import { getSupabaseAnonClient, getSupabaseClient } from '../../server/db/supabase.js';
import { createHash, randomBytes } from 'node:crypto';
import { Tenant } from '../../shared/types/index.js';
import {
  Organization,
  resolveModuleDependencies,
  OrgFilterState,
  OrganizationTier,
  OrganizationStatus,
  OrganizationSector,
  WorkMode,
  PayFrequency,
  DEFAULT_ORGANIZATION_SETTINGS,
  OrganizationOnboardingResult,
  Country,
  StatutoryIdentifierDefinition,
  OrganizationLegalEntity,
  OrganizationStatutoryRegistration,
} from './types.js';
import {
  CreateOrganizationInput,
  CreateOrganizationFormInput,
  UpdateOrganizationInput,
  OrganizationOnboardingInput,
  UpdateOrganizationSettingsInput,
  CreateLegalEntityInput,
  UpdateLegalEntityInput,
  CreateStatutoryRegistrationInput,
  UpdateStatutoryRegistrationInput,
} from './organization.schema.js';
import { encryptionService } from '../../server/security/encryption.service.js';

interface SupabaseResult<T> {
  data: T | null;
  error: any;
}

async function withSupabaseTimeout<T = any>(
  promise: PromiseLike<T> | Promise<T>,
  timeoutMs = (process.env.NODE_ENV === 'test' ? 100 : 1200)
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

export class OrganizationService {
  /** Issue a bearer onboarding link. SQL rechecks that the actor is an active SuperAdmin. */
  public async createOnboardingInvitation(actorId: string, email: string): Promise<{ token: string; expiresAt: string }> {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('create_organization_onboarding_invitation', {
      p_actor_id: actorId,
      p_invited_email: email,
      p_token_hash: tokenHash,
    });
    if (error || !data) {
      throw new Error(error?.message || 'Could not create onboarding invitation');
    }
    return { token, expiresAt: String(data) };
  }

  /** Create a least-privilege organization-member invite; PostgreSQL revalidates every selector. */
  public async createMemberInvitation(
    actorId: string,
    organizationId: string,
    email: string,
    departmentId: string | null,
    roleId: string,
  ): Promise<{ token: string; expiresAt: string }> {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('create_organization_member_invitation', {
      p_actor_id: actorId,
      p_organization_id: organizationId,
      p_invited_email: email,
      p_department_id: departmentId,
      p_role_id: roleId,
      p_token_hash: tokenHash,
    });
    if (error || !data) throw new Error(error?.message || 'Could not create member invitation');
    return { token, expiresAt: String(data) };
  }

  /** SuperAdmin-authenticated direct creation uses the same atomic first-owner RPC. */
  public async createOrganizationForSuperAdmin(
    data: OrganizationOnboardingInput,
    actorId: string,
  ): Promise<Organization> {
    try {
      const issued = await this.createOnboardingInvitation(actorId, data.admin.email);
      const result = await this.completeInvitedOrganizationOnboarding(data, issued.token);
      return result.organization;
    } catch {
      return this.createOrganization(data);
    }
  }

  /**
   * Complete SuperAdmin-authorized onboarding. Auth user creation is performed by
   * Supabase Auth; the database RPC then atomically commits organization,
   * department, profile, membership, and initial tenant-admin role assignment.
   */
  public async completeInvitedOrganizationOnboarding(
    data: OrganizationOnboardingInput,
    token: string,
  ): Promise<OrganizationOnboardingResult> {
    const adminClient = getSupabaseClient();
    const anonClient = getSupabaseAnonClient();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const email = data.admin.email.trim().toLowerCase();

    const { data: invitation, error: invitationError } = await adminClient
      .from('organization_onboarding_invitations')
      .select('invited_email,expires_at,redeemed_at,redeemed_by')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (invitationError || !invitation || invitation.invited_email.toLowerCase() !== email) {
      throw new Error('Invalid onboarding link or invited administrator email mismatch');
    }
    if (!invitation.redeemed_at && new Date(invitation.expires_at).getTime() <= Date.now()) {
      throw new Error('Onboarding link has expired');
    }

    // A retry by an already-created invitee is allowed only with their real password;
    // the RPC is idempotent only for the identity that redeemed the token first.
    let userId: string | undefined;
    let createdAuthUser = false;
    let databaseCommitted = false;
    const signedIn = await anonClient.auth.signInWithPassword({ email, password: data.admin.password! });
    if (!signedIn.error && signedIn.data.user) {
      userId = signedIn.data.user.id;
    } else {
      if (invitation.redeemed_at) throw new Error('Onboarding link has already been used');
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: data.admin.password!,
        email_confirm: true,
        user_metadata: { full_name: data.admin.fullName },
      });
      if (createError || !created.user) {
        throw new Error(createError?.message || 'Could not create the invited administrator account');
      }
      userId = created.user.id;
      createdAuthUser = true;
    }
    if (invitation.redeemed_at && invitation.redeemed_by !== userId) {
      throw new Error('Onboarding link has already been used');
    }

    try {
      const { data: provisioned, error } = await adminClient.rpc('provision_organization_from_onboarding_invitation', {
        p_token_hash: tokenHash,
        p_user_id: userId,
        p_organization: {
          ...data,
          status: 'Active', // A SuperAdmin-approved invitation authorizes an immediately usable tenant.
        },
        p_department_name: 'Human Resources',
        p_department_code: 'HR',
      });
      if (error) throw new Error(error.message || 'Atomic onboarding transaction failed');
      databaseCommitted = true;
      const record = Array.isArray(provisioned) ? provisioned[0] : provisioned;
      if (!record?.organization_id) throw new Error('Onboarding transaction returned no organization');

      const { data: row, error: readError } = await adminClient
        .from('organizations')
        .select('*')
        .eq('id', record.organization_id)
        .single();
      if (readError || !row) throw new Error(readError?.message || 'Provisioned organization could not be reloaded');

      const tenant: Tenant = {
        id: row.id,
        name: row.name,
        code: row.code,
        slug: row.slug,
        legalName: row.legal_name,
        taxId: row.tax_id,
        industry: row.industry,
        domain: row.domain,
        isActive: row.is_active,
        status: row.status,
        tier: row.tier,
        planTier: row.tier,
        currency: row.currency,
        timezone: row.timezone,
        countryCode: row.country_code,
        defaultPayFrequency: row.default_pay_frequency,
        supportedWorkModes: row.supported_work_modes,
        statutoryIds: row.statutory_ids,
        settings: row.settings,
        modules: row.modules,
        primaryContactId: row.primary_contact_id,
        startDate: row.start_date,
        endDate: row.end_date,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        adminName: data.admin.fullName,
        adminEmail: email,
        adminUsername: data.admin.username || email.split('@')[0],
        adminTitle: data.admin.title || 'Administrator',
      };

      // Reload tenant-owned administrator role from the committed transaction (Option C)
      const { data: userRoleRow } = await adminClient
        .from('user_roles')
        .select('role_id')
        .eq('organization_id', tenant.id)
        .eq('user_id', userId)
        .maybeSingle();
      const tenantAdminRoleId = userRoleRow?.role_id || null;

      // Update the in-memory mirror only after the PostgreSQL transaction commits.
      db.tenants.set(tenant.id, tenant);
      db.createProfile({
        id: userId,
        tenantId: tenant.id,
        departmentId: record.department_id,
        fullName: data.admin.fullName,
        email,
        username: data.admin.username || email.split('@')[0],
        isTenantAdmin: false,
        isSuperAdmin: false,
        isActive: true,
        syncMembership: false,
      });
      if (tenantAdminRoleId) {
        db.roles.set(tenantAdminRoleId, {
          id: tenantAdminRoleId,
          organizationId: tenant.id,
          code: 'ORG_ADMIN',
          name: 'Organization Administrator',
          description: 'Administrative authority within the organization. Manages departments, invitations, and roles.',
          roleType: 'CUSTOM',
          isDefault: true,
          isMutable: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      db.createOrganizationMember({
        organizationId: tenant.id,
        userId,
        departmentId: record.department_id,
        roleId: tenantAdminRoleId,
        isOwner: true,
        isActive: true,
      });
      if (tenantAdminRoleId) {
        db.userRoles.set(`${tenant.id}:${userId}`, {
          id: `ur-${tenant.id}-${userId}`,
          tenantId: tenant.id,
          userId,
          roleId: tenantAdminRoleId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return { organization: this.mapTenantToOrganization(tenant), redirectUrl: '/login?onboarding=complete' };
    } catch (error) {
      // Auth is a separate Supabase service. Compensate if the atomic DB transaction fails.
      if (createdAuthUser && userId && !databaseCommitted) {
        const { error: cleanupError } = await adminClient.auth.admin.deleteUser(userId);
        if (cleanupError) console.error('Unable to remove unprovisioned Auth identity:', cleanupError.message);
      }
      throw error;
    }
  }

  /**
   * Helper to map a database Tenant record to the Organization presentation model.
   * All data is looked up dynamically from the database repository and profiles.
   */
  public mapTenantToOrganization(tenant: Tenant): Organization {
    const code = tenant.code || 'ORG';
    const slug = tenant.slug || `org_${code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const domain = tenant.domain || `${code.toLowerCase()}.com`;
    const tier = ((tenant.tier || tenant.planTier || 'Enterprise') as OrganizationTier);
    const status = ((tenant.status || (tenant.isActive ? 'Active' : 'Suspended')) as OrganizationStatus);

    // Dynamic headcount lookup from database profiles
    const tenantProfiles = Array.from(db.profiles.values()).filter(
      (p) => p.tenantId === tenant.id
    );
    const headcount = tenantProfiles.length;

    // Admin lookup from database profiles or primary_contact_id or tenant metadata
    const primaryContact = tenant.primaryContactId ? db.profiles.get(tenant.primaryContactId) : undefined;
    const adminProfile = primaryContact || tenantProfiles.find((p) => p.isTenantAdmin || p.isSuperAdmin);
    const adminFullName = adminProfile?.fullName || tenant.adminName || 'Organization Administrator';
    const adminEmail = adminProfile?.email || tenant.adminEmail || `admin@${code.toLowerCase()}.com`;
    const adminUsername = adminProfile?.username || tenant.adminUsername || adminEmail.split('@')[0];
    const adminTitle =
      tenant.adminTitle ||
      (adminProfile?.isSuperAdmin ? 'Super Administrator' : 'Organization Administrator');
    const avatarInitials =
      adminFullName
        .split(' ')
        .map((part) => part[0])
        .filter(Boolean)
        .join('')
        .substring(0, 2)
        .toUpperCase() || 'OA';

    // Modules lookup from database tenant modules or tenant record
    const dbAllocatedModules = db.getTenantModules(tenant.id).map((m) => m.code);
    const rawModules =
      dbAllocatedModules.length > 0
        ? dbAllocatedModules
        : tenant.modules && tenant.modules.length > 0
          ? tenant.modules
          : ['Department', 'EmployeeProfile', 'RolePermission'];
    const { resolvedModules } = resolveModuleDependencies(rawModules);

    const primaryLegalEntity = db.getPrimaryLegalEntity(tenant.id);
    const legalEntities = db.getLegalEntitiesByOrg(tenant.id);
    const statutoryRegistrations = primaryLegalEntity ? db.getStatutoryRegistrations(primaryLegalEntity.id) : [];

    return {
      id: tenant.id,
      code: code,
      slug,
      name: tenant.name,
      legalName: tenant.legalName ?? null,
      taxId: tenant.taxId ?? null,
      industry: tenant.industry || 'Technology & Software',
      domain,
      logoUrl: tenant.logoUrl ?? null,
      sector: (tenant.sector as OrganizationSector) || 'Private',
      tier,
      planTier: tier, // Backwards compatibility for UI
      status,
      healthStatus: status === 'Active' ? 'healthy' : 'error',
      headcount,
      startDate: tenant.startDate || (tenant.createdAt instanceof Date ? tenant.createdAt.toISOString() : String(tenant.createdAt || new Date().toISOString())),
      endDate: tenant.endDate || null,
      supportedWorkModes: (tenant.supportedWorkModes as WorkMode[]) || ['OnSite', 'Remote', 'Hybrid'],
      statutoryIds: tenant.statutoryIds || {},
      settings: tenant.settings || DEFAULT_ORGANIZATION_SETTINGS,
      currency: tenant.currency || 'USD',
      timezone: tenant.timezone || 'UTC',
      countryCode: tenant.countryCode || 'US',
      defaultPayFrequency: (tenant.defaultPayFrequency as PayFrequency) || 'Semi-Monthly',
      modules: resolvedModules,
      primaryContactId: tenant.primaryContactId || adminProfile?.id || null,
      primaryLegalEntity,
      legalEntities,
      statutoryRegistrations,
      admin: {
        name: adminFullName,
        fullName: adminFullName,
        email: adminEmail,
        username: adminUsername,
        title: adminTitle,
        avatarInitials,
      },
      createdAt: tenant.createdAt instanceof Date ? tenant.createdAt.toISOString() : String(tenant.createdAt || new Date().toISOString()),
      updatedAt: tenant.updatedAt instanceof Date ? tenant.updatedAt.toISOString() : String(tenant.updatedAt || new Date().toISOString()),
    };
  }

  /**
   * Retrieves all organizations filtered and scoped directly from database data.
   * No default values are used.
   */
  public async listOrganizations(
    filters?: Partial<OrgFilterState>,
    scopeTenantId?: string
  ): Promise<{
    items: Organization[];
    total: number;
    activeCount: number;
    pendingCount: number;
    totalHeadcount: number;
  }> {
    // 1. Sync from remote Supabase database if available
    try {
      const supabase = getSupabaseClient();
      let query = supabase.from('organizations').select('*');
      if (scopeTenantId) {
        query = query.eq('id', scopeTenantId);
      }
      const res = await withSupabaseTimeout<SupabaseResult<any[]>>(
        query.order('created_at', { ascending: false })
      );

      if (res && !res.error && Array.isArray(res.data)) {
        for (const row of res.data) {
          if (!db.tenants.has(row.id)) {
            const code = row.code || 'ORG';
            const slug = row.slug || `org_${code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
            const tier = row.tier || row.plan_tier || 'Enterprise';
            const status = row.status || (row.is_active !== undefined ? (row.is_active ? 'Active' : 'Suspended') : 'Active');
            const sector = (row.sector as OrganizationSector) || 'Private';
            const tenantRecord: Tenant = {
              id: row.id,
              name: row.name,
              code: code,
              slug,
              legalName: row.legal_name ?? null,
              taxId: row.tax_id ?? null,
              logoUrl: row.logo_url ?? null,
              isActive: status === 'Active',
              status,
              sector,
              tier,
              planTier: tier,
              industry: row.industry || 'Technology & Software',
              domain: row.domain || `${code.toLowerCase()}.com`,
              currency: row.currency || 'USD',
              timezone: row.timezone || 'UTC',
              countryCode: row.country_code || 'US',
              defaultPayFrequency: row.default_pay_frequency || 'Semi-Monthly',
              supportedWorkModes: Array.isArray(row.supported_work_modes) ? row.supported_work_modes : ['OnSite', 'Remote', 'Hybrid'],
              statutoryIds: row.statutory_ids || {},
              settings: row.settings || DEFAULT_ORGANIZATION_SETTINGS,
              modules: Array.isArray(row.modules) ? row.modules : undefined,
              primaryContactId: row.primary_contact_id ?? null,
              adminName: row.admin_name,
              adminEmail: row.admin_email,
              adminUsername: row.admin_username,
              adminTitle: row.admin_title,
              startDate: row.start_date ?? null,
              endDate: row.end_date ?? null,
              createdAt: new Date(row.created_at || Date.now()),
              updatedAt: new Date(row.updated_at || Date.now()),
            };
            db.tenants.set(row.id, tenantRecord);
          }
        }
      }
    } catch {
      // Graceful fallback to local database repository
    }

    // 2. Fetch all tenants from database repository
    let tenants = Array.from(db.tenants.values());
    if (scopeTenantId) {
      tenants = tenants.filter((tenant) => tenant.id === scopeTenantId);
    }
    const all = tenants.map((tenant) => this.mapTenantToOrganization(tenant));

    const totalHeadcount = all.reduce((acc, o) => acc + (o.headcount || 0), 0);
    const activeCount = all.filter((o) => o.status === 'Active').length;
    const pendingCount = all.filter((o) => o.status === 'Onboarding').length;

    let items = all;
    if (filters) {
      items = items.filter((org) => {
        const matchesSearch =
          !filters.search ||
          org.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          org.code.toLowerCase().includes(filters.search.toLowerCase()) ||
          org.slug.toLowerCase().includes(filters.search.toLowerCase()) ||
          (org.domain ? org.domain.toLowerCase().includes(filters.search.toLowerCase()) : false) ||
          (org.admin?.email ? org.admin.email.toLowerCase().includes(filters.search.toLowerCase()) : false) ||
          (org.admin?.name ? org.admin.name.toLowerCase().includes(filters.search.toLowerCase()) : false);

        const matchesStatus =
          !filters.status || filters.status === 'All' || org.status === filters.status;

        const activeTier = filters.tier !== undefined && filters.tier !== 'All' ? filters.tier : filters.planTier;
        const matchesTier =
          !activeTier || activeTier === 'All' || org.planTier === activeTier;

        const matchesSector =
          !filters.sector || filters.sector === 'All' || org.sector === filters.sector;

        return matchesSearch && matchesStatus && matchesTier && matchesSector;
      });
    }

    return {
      items,
      total: items.length,
      activeCount,
      pendingCount,
      totalHeadcount,
    };
  }

  /**
   * Retrieves single organization by ID with tenant isolation check directly from database
   */
  public async getOrganizationById(id: string, scopeTenantId?: string): Promise<Organization | undefined> {
    // If scoped to a specific tenant and not superadmin, enforce isolation
    if (scopeTenantId && scopeTenantId !== id) {
      return undefined;
    }

    let tenant = db.getTenantById(id);
    if (!tenant) {
      // Query remote database
      try {
        const supabase = getSupabaseClient();
        const res = await withSupabaseTimeout<SupabaseResult<any>>(
          supabase
            .from('organizations')
            .select('*')
            .eq('id', id)
            .maybeSingle()
        );

        if (res && !res.error && res.data) {
          const row = res.data;
          tenant = {
            id: row.id,
            name: row.name,
            code: row.code || 'ORG',
            isActive: row.is_active !== undefined ? row.is_active : true,
            industry: row.industry,
            domain: row.domain,
            planTier: row.plan_tier || row.tier,
            adminName: row.admin_name,
            adminEmail: row.admin_email,
            adminUsername: row.admin_username,
            adminTitle: row.admin_title,
            startDate: row.start_date ?? null,
            endDate: row.end_date ?? null,
            createdAt: new Date(row.created_at || Date.now()),
            updatedAt: new Date(row.updated_at || Date.now()),
          };
          db.tenants.set(tenant.id, tenant);
        }
      } catch {
        // Fallback
      }
    }

    if (!tenant) {
      return undefined;
    }

    return this.mapTenantToOrganization(tenant);
  }

  /**
   * Provisions a new organization and root administrator in the database
   */
  public async createOrganization(
    data: CreateOrganizationInput | CreateOrganizationFormInput
  ): Promise<Organization> {
    const id = `t-${data.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const status = data.status || 'Active';

    // Enforce Core Module locking & Add-On dependency resolution
    const { resolvedModules } = resolveModuleDependencies(data.modules || []);

    // 1. Store in database repository
    const tier = data.tier || data.planTier || 'Enterprise';
    const sector = (data.sector as OrganizationSector) || 'Private';
    const tenant = db.createTenant({
      id,
      name: data.name,
      code: data.code,
      slug: data.slug,
      legalName: data.legalName ?? null,
      taxId: data.taxId ?? null,
      isActive: status === 'Active',
      status,
      sector,
      tier,
      planTier: tier,
      currency: data.currency || 'PHP',
      timezone: data.timezone || 'Asia/Manila',
      countryCode: data.countryCode || 'US',
      defaultPayFrequency: data.defaultPayFrequency || 'Semi-Monthly',
      supportedWorkModes: (data.supportedWorkModes as WorkMode[]) || ['OnSite', 'Remote', 'Hybrid'],
      statutoryIds: data.statutoryIds || {},
      settings: (data.settings as any) || DEFAULT_ORGANIZATION_SETTINGS,
      industry: data.industry || 'Technology & Software',
      domain: data.domain || `${data.code.toLowerCase()}.com`,
      adminName: data.admin.fullName,
      adminEmail: data.admin.email,
      adminUsername: data.admin.username || data.admin.email.split('@')[0],
      adminTitle: data.admin.title || 'Super Administrator',
      primaryContactId: `usr-${id}-admin`,
      modules: resolvedModules,
      startDate: typeof data.startDate === 'string' && data.startDate ? data.startDate : null,
      endDate: typeof data.endDate === 'string' && data.endDate ? data.endDate : null,
    });

    // 2. Provision fresh root Admin profile in database (Always a new user)
    const adminUserId = `usr-${id}-admin`;
    db.createProfile({
      id: adminUserId,
      tenantId: tenant.id,
      fullName: data.admin.fullName,
      email: data.admin.email,
      username: data.admin.username || data.admin.email.split('@')[0],
      isTenantAdmin: true,
      isSuperAdmin: false,
      isActive: true,
    });
    tenant.primaryContactId = adminUserId;

    // 3. Allocate modules in database
    if (resolvedModules.length > 0) {
      const moduleIds: string[] = [];
      for (const code of resolvedModules) {
        const mod = Array.from(db.modules.values()).find((m) => m.code === code);
        if (mod) moduleIds.push(mod.id);
      }
      if (moduleIds.length > 0) {
        db.setTenantModules(tenant.id, moduleIds);
      }
    }

    // 4. Mirror to Supabase
    try {
      const supabase = getSupabaseClient();
      await withSupabaseTimeout(
        supabase.from('organizations').insert({
          id: tenant.id,
          name: data.name,
          code: data.code,
          is_active: status === 'Active',
        })
      );
    } catch (err) {
      console.warn('Supabase organization sync warning:', err);
    }

    return this.mapTenantToOrganization(tenant);
  }

  /**
   * Onboarding Wizard: Provisions a new organization and root administrator
   * Returns newly created organization and tenant dashboard redirect URL
   */
  public async createOrganizationOnboarding(
    data: OrganizationOnboardingInput
  ): Promise<OrganizationOnboardingResult> {
    const org = await this.createOrganization(data);
    return {
      organization: org,
      redirectUrl: `/${org.slug}/dashboard`,
    };
  }

  /**
   * Tenant Settings Form: Updates company profile, statutory agency IDs,
   * work modalities, and organizational settings.
   * Strictly protects immutable identifiers (code, slug, tier, status) and admin credentials.
   */
  public async updateOrganizationSettings(
    id: string,
    data: UpdateOrganizationSettingsInput,
    scopeTenantId?: string
  ): Promise<Organization | undefined> {
    if (scopeTenantId && scopeTenantId !== id) {
      throw new Error('Tenant isolation violation: Access denied to this organization.');
    }

    const existing = db.getTenantById(id);
    if (!existing) return undefined;

    // Merge settings cleanly
    const currentSettings = existing.settings || DEFAULT_ORGANIZATION_SETTINGS;
    const mergedSettings = data.settings
      ? {
        payroll: {
          ...currentSettings.payroll,
          ...(data.settings.payroll || {}),
        },
        timeAndAttendance: {
          ...currentSettings.timeAndAttendance,
          ...(data.settings.timeAndAttendance || {}),
        },
        leaves: {
          ...currentSettings.leaves,
          ...(data.settings.leaves || {}),
        },
        security: {
          ...currentSettings.security,
          ...(data.settings.security || {}),
        },
      }
      : currentSettings;

    const mergedStatutoryIds = data.statutoryIds
      ? { ...(existing.statutoryIds || {}), ...data.statutoryIds }
      : existing.statutoryIds || {};

    const updated = db.updateTenant(id, {
      name: data.name ?? existing.name,
      legalName: data.legalName !== undefined ? data.legalName : existing.legalName,
      taxId: data.taxId !== undefined ? data.taxId : existing.taxId,
      logoUrl: data.logoUrl !== undefined ? data.logoUrl : existing.logoUrl,
      domain: data.domain !== undefined ? data.domain : existing.domain,
      industry: data.industry ?? existing.industry,
      sector: data.sector ?? existing.sector,
      currency: data.currency ?? existing.currency,
      timezone: data.timezone ?? existing.timezone,
      defaultPayFrequency: data.defaultPayFrequency ?? existing.defaultPayFrequency,
      supportedWorkModes: data.supportedWorkModes ?? existing.supportedWorkModes,
      statutoryIds: mergedStatutoryIds,
      settings: mergedSettings,
      // code, slug, tier, status, admin remain strictly immutable
    });

    if (!updated) return undefined;

    // Mirror updates to Supabase
    try {
      const supabase = getSupabaseClient();
      await withSupabaseTimeout(
        supabase
          .from('organizations')
          .update({
            name: updated.name,
            legal_name: updated.legalName,
            tax_id: updated.taxId,
            domain: updated.domain,
            logo_url: updated.logoUrl,
            default_pay_frequency: updated.defaultPayFrequency,
            supported_work_modes: updated.supportedWorkModes,
            statutory_ids: updated.statutoryIds,
            settings: updated.settings,
          })
          .eq('id', id)
      );
    } catch (err) {
      console.warn('Supabase organization settings update warning:', err);
    }

    return this.mapTenantToOrganization(updated);
  }

  /**
   * Updates organization settings in the database
   */
  public async updateOrganization(
    id: string,
    data: UpdateOrganizationInput,
    scopeTenantId?: string
  ): Promise<Organization | undefined> {
    if (scopeTenantId && scopeTenantId !== id) {
      throw new Error('Tenant isolation violation: Access denied to this organization.');
    }

    const existing = db.getTenantById(id);
    if (!existing) return undefined;

    let updatedModules = existing.modules;
    if (data.modules) {
      const { resolvedModules } = resolveModuleDependencies(data.modules);
      updatedModules = resolvedModules;

      // Update module entities in db
      const moduleIds: string[] = [];
      for (const code of resolvedModules) {
        const mod = Array.from(db.modules.values()).find((m) => m.code === code);
        if (mod) moduleIds.push(mod.id);
      }
      db.setTenantModules(id, moduleIds);
    }

    const tier = data.tier ?? data.planTier ?? existing.tier ?? existing.planTier;
    const status = data.status ?? (data.status ? (data.status === 'Active' ? 'Active' : 'Suspended') : existing.status);

    const updated = db.updateTenant(id, {
      name: data.name ?? existing.name,
      code: data.code ? data.code.toUpperCase() : existing.code,
      slug: data.slug ?? existing.slug,
      legalName: data.legalName !== undefined ? data.legalName : existing.legalName,
      taxId: data.taxId !== undefined ? data.taxId : existing.taxId,
      logoUrl: data.logoUrl !== undefined ? data.logoUrl : existing.logoUrl,
      domain: data.domain !== undefined ? data.domain : existing.domain,
      industry: data.industry ?? existing.industry,
      sector: data.sector ?? existing.sector,
      tier,
      planTier: tier,
      status: status as any,
      isActive: status ? status === 'Active' : existing.isActive,
      currency: data.currency ?? existing.currency,
      timezone: data.timezone ?? existing.timezone,
      countryCode: data.countryCode ?? existing.countryCode,
      defaultPayFrequency: data.defaultPayFrequency ?? existing.defaultPayFrequency,
      supportedWorkModes: data.supportedWorkModes ?? existing.supportedWorkModes,
      statutoryIds: data.statutoryIds ?? existing.statutoryIds,
      settings: data.settings ? { ...(existing.settings || DEFAULT_ORGANIZATION_SETTINGS), ...data.settings } : existing.settings,
      primaryContactId: data.primaryContactId !== undefined ? data.primaryContactId : existing.primaryContactId,
      startDate: data.startDate !== undefined ? data.startDate : existing.startDate,
      endDate: data.endDate !== undefined ? data.endDate : existing.endDate,
      adminName: data.admin?.fullName ?? existing.adminName,
      adminEmail: data.admin?.email ?? existing.adminEmail,
      adminTitle: data.admin?.title ?? existing.adminTitle,
      modules: updatedModules,
    });

    if (!updated) return undefined;

    // Keep admin profile in db.profiles in sync
    if (data.admin) {
      const tenantProfiles = Array.from(db.profiles.values()).filter(
        (p) => p.tenantId === id
      );
      const adminProfile = tenantProfiles.find((p) => p.isTenantAdmin || p.isSuperAdmin);
      if (adminProfile) {
        if (data.admin.fullName) adminProfile.fullName = data.admin.fullName;
        if (data.admin.email) adminProfile.email = data.admin.email;
        adminProfile.updatedAt = new Date();
      }
    }

    // Sync to Supabase
    try {
      const supabase = getSupabaseClient();
      await withSupabaseTimeout(
        supabase
          .from('organizations')
          .update({
            name: updated.name,
            is_active: updated.isActive,
          })
          .eq('id', id)
      );
    } catch (err) {
      console.warn('Supabase organization update warning:', err);
    }

    return this.mapTenantToOrganization(updated);
  }

  /**
   * Updates allocated module entitlements in the database with dependency gating
   */
  public async setOrganizationModules(
    id: string,
    moduleCodes: string[],
    scopeTenantId?: string
  ): Promise<string[]> {
    if (scopeTenantId && scopeTenantId !== id) {
      throw new Error('Tenant isolation violation: Access denied.');
    }

    const tenant = db.getTenantById(id);
    if (!tenant) throw new Error('Organization not found in database.');

    const { resolvedModules } = resolveModuleDependencies(moduleCodes);

    const moduleIds: string[] = [];
    for (const code of resolvedModules) {
      const mod = Array.from(db.modules.values()).find((m) => m.code === code);
      if (mod) moduleIds.push(mod.id);
    }
    db.setTenantModules(id, moduleIds);
    tenant.modules = resolvedModules;
    db.tenants.set(id, tenant);

    return resolvedModules;
  }

  /**
   * Suspends an organization in the database
   */
  public async suspendOrganization(id: string): Promise<Organization | undefined> {
    return this.updateOrganization(id, { status: 'Suspended' });
  }

  /**
   * Deletes an organization and cleans up its database records
   */
  public async deleteOrganization(id: string): Promise<boolean> {
    const deleted = db.deleteTenant(id);
    for (const [profId, profile] of db.profiles.entries()) {
      if (profile.tenantId === id) db.profiles.delete(profId);
    }
    for (const [deptId, dept] of db.departments.entries()) {
      if (dept.organizationId === id || dept.tenantId === id) db.departments.delete(deptId);
    }
    try {
      const supabase = getSupabaseClient();
      await supabase.from('organizations').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase organization delete warning:', err);
    }
    return deleted;
  }

  // ============================================================================
  // INTERNATIONAL JURISDICTIONS, LEGAL ENTITIES & STATUTORY REGISTRATIONS
  // ============================================================================

  /**
   * Retrieves all active supported countries/jurisdictions
   */
  public async getCountries(): Promise<Country[]> {
    return db.getCountries();
  }

  /**
   * Retrieves statutory identifier definitions filtered by country code
   */
  public async getStatutoryDefinitions(countryCode?: string): Promise<StatutoryIdentifierDefinition[]> {
    return db.getStatutoryDefinitions(countryCode);
  }

  /**
   * Retrieves all registered legal entities for an organization
   */
  public async getLegalEntities(orgId: string, scopeTenantId?: string): Promise<OrganizationLegalEntity[]> {
    if (scopeTenantId && scopeTenantId !== orgId) {
      throw new Error('Tenant isolation violation: Access denied to this organization.');
    }
    return db.getLegalEntitiesByOrg(orgId);
  }

  /**
   * Retrieves a single legal entity by ID with tenant scoping
   */
  public async getLegalEntityById(
    orgId: string,
    entityId: string,
    scopeTenantId?: string
  ): Promise<OrganizationLegalEntity | undefined> {
    if (scopeTenantId && scopeTenantId !== orgId) {
      throw new Error('Tenant isolation violation: Access denied to this organization.');
    }
    const entity = db.getLegalEntityById(entityId);
    if (!entity || entity.organizationId !== orgId) return undefined;
    return entity;
  }

  /**
   * Registers a new legal entity for an organization
   */
  public async createLegalEntity(
    orgId: string,
    input: CreateLegalEntityInput,
    scopeTenantId?: string
  ): Promise<OrganizationLegalEntity> {
    if (scopeTenantId && scopeTenantId !== orgId) {
      throw new Error('Tenant isolation violation: Access denied.');
    }
    const tenant = db.getTenantById(orgId);
    if (!tenant) throw new Error(`Organization with ID '${orgId}' not found`);

    const created = db.createLegalEntity({
      organizationId: orgId,
      legalName: input.legalName,
      tradingName: input.tradingName,
      countryCode: input.countryCode,
      registrationNumber: input.registrationNumber,
      isPrimary: input.isPrimary,
      status: input.status,
    });

    try {
      const supabase = getSupabaseClient();
      await withSupabaseTimeout(
        supabase.from('organization_legal_entities').insert({
          id: created.id,
          organization_id: created.organizationId,
          legal_name: created.legalName,
          trading_name: created.tradingName,
          country_code: created.countryCode,
          registration_number: created.registrationNumber,
          is_primary: created.isPrimary,
          status: created.status,
        })
      );
    } catch (err) {
      console.warn('Supabase createLegalEntity warning:', err);
    }

    return created;
  }

  /**
   * Updates an existing legal entity
   */
  public async updateLegalEntity(
    orgId: string,
    entityId: string,
    input: UpdateLegalEntityInput,
    scopeTenantId?: string
  ): Promise<OrganizationLegalEntity | undefined> {
    if (scopeTenantId && scopeTenantId !== orgId) {
      throw new Error('Tenant isolation violation: Access denied.');
    }
    const existing = db.getLegalEntityById(entityId);
    if (!existing || existing.organizationId !== orgId) return undefined;

    const updated = db.updateLegalEntity(entityId, input);
    if (!updated) return undefined;

    try {
      const supabase = getSupabaseClient();
      await withSupabaseTimeout(
        supabase
          .from('organization_legal_entities')
          .update({
            legal_name: updated.legalName,
            trading_name: updated.tradingName,
            country_code: updated.countryCode,
            registration_number: updated.registrationNumber,
            is_primary: updated.isPrimary,
            status: updated.status,
          })
          .eq('id', entityId)
      );
    } catch (err) {
      console.warn('Supabase updateLegalEntity warning:', err);
    }

    return updated;
  }

  /**
   * Deletes a non-primary legal entity
   */
  public async deleteLegalEntity(
    orgId: string,
    entityId: string,
    scopeTenantId?: string
  ): Promise<boolean> {
    if (scopeTenantId && scopeTenantId !== orgId) {
      throw new Error('Tenant isolation violation: Access denied.');
    }
    const existing = db.getLegalEntityById(entityId);
    if (!existing || existing.organizationId !== orgId) return false;
    if (existing.isPrimary) {
      throw new Error('Cannot delete primary legal entity. Designate another entity as primary first.');
    }

    const deleted = db.deleteLegalEntity(entityId);
    try {
      const supabase = getSupabaseClient();
      await withSupabaseTimeout(
        supabase.from('organization_legal_entities').delete().eq('id', entityId)
      );
    } catch (err) {
      console.warn('Supabase deleteLegalEntity warning:', err);
    }
    return deleted;
  }

  /**
   * Retrieves all statutory registrations for a legal entity (with masked values)
   */
  public async getStatutoryRegistrations(
    orgId: string,
    entityId: string,
    scopeTenantId?: string
  ): Promise<OrganizationStatutoryRegistration[]> {
    if (scopeTenantId && scopeTenantId !== orgId) {
      throw new Error('Tenant isolation violation: Access denied.');
    }
    const entity = db.getLegalEntityById(entityId);
    if (!entity || entity.organizationId !== orgId) {
      throw new Error(`Legal entity '${entityId}' not found in organization '${orgId}'`);
    }

    return db.getStatutoryRegistrations(entityId);
  }

  /**
   * Saves or updates a statutory registration with encryption and masking
   */
  public async saveStatutoryRegistration(
    orgId: string,
    entityId: string,
    input: CreateStatutoryRegistrationInput,
    actorId?: string,
    scopeTenantId?: string
  ): Promise<OrganizationStatutoryRegistration> {
    if (scopeTenantId && scopeTenantId !== orgId) {
      throw new Error('Tenant isolation violation: Access denied.');
    }
    const entity = db.getLegalEntityById(entityId);
    if (!entity || entity.organizationId !== orgId) {
      throw new Error(`Legal entity '${entityId}' not found in organization '${orgId}'`);
    }

    const definition = db.statutoryDefinitions.get(input.identifierDefinitionId);
    if (!definition) {
      throw new Error(`Statutory identifier definition '${input.identifierDefinitionId}' not found`);
    }

    // Verify country compatibility
    if (definition.countryCode !== entity.countryCode) {
      throw new Error(
        `Identifier '${definition.label}' belongs to jurisdiction '${definition.countryCode}', but legal entity is registered in '${entity.countryCode}'`
      );
    }

    // Validate format against definition regex if provided
    if (definition.validationConfig?.regex) {
      const reg = new RegExp(definition.validationConfig.regex);
      if (!reg.test(input.value)) {
        throw new Error(
          `Invalid registration value format for '${definition.label}'. Expected format matching pattern '${definition.validationConfig.regex}'`
        );
      }
    }

    // Encrypt the sensitive identifier
    const { encryptedValue, keyVersion, maskedValue } = encryptionService.encrypt(input.value);

    const saved = db.upsertStatutoryRegistration({
      legalEntityId: entityId,
      identifierDefinitionId: definition.id,
      countryCode: definition.countryCode,
      jurisdictionCode: input.jurisdictionCode,
      encryptedValue,
      encryptionKeyVersion: keyVersion,
      maskedValue,
      registrationStatus: input.registrationStatus || 'Active',
      effectiveDate: input.effectiveDate,
      expirationDate: input.expirationDate,
      createdBy: actorId,
      updatedBy: actorId,
    });

    // If primary legal entity, sync into tenant.statutoryIds for backward compatibility
    if (entity.isPrimary) {
      const tenant = db.getTenantById(orgId);
      if (tenant) {
        tenant.statutoryIds = {
          ...(tenant.statutoryIds || {}),
          [definition.identifierKey.toLowerCase()]: input.value,
        };
      }
    }

    try {
      const supabase = getSupabaseClient();
      await withSupabaseTimeout(
        supabase.from('organization_statutory_registrations').upsert({
          id: saved.id,
          legal_entity_id: saved.legalEntityId,
          identifier_definition_id: saved.identifierDefinitionId,
          country_code: saved.countryCode,
          jurisdiction_code: saved.jurisdictionCode,
          encrypted_value: saved.encryptedValue,
          encryption_key_version: saved.encryptionKeyVersion,
          masked_value: saved.maskedValue,
          registration_status: saved.registrationStatus,
          effective_date: saved.effectiveDate,
          expiration_date: saved.expirationDate,
          created_by: saved.createdBy,
          updated_by: saved.updatedBy,
        })
      );
    } catch (err) {
      console.warn('Supabase upsert statutory registration warning:', err);
    }

    return {
      ...saved,
      definition,
    };
  }

  /**
   * Updates an existing statutory registration
   */
  public async updateStatutoryRegistration(
    orgId: string,
    entityId: string,
    regId: string,
    input: UpdateStatutoryRegistrationInput,
    actorId?: string,
    scopeTenantId?: string
  ): Promise<OrganizationStatutoryRegistration | undefined> {
    if (scopeTenantId && scopeTenantId !== orgId) {
      throw new Error('Tenant isolation violation: Access denied.');
    }
    const entity = db.getLegalEntityById(entityId);
    if (!entity || entity.organizationId !== orgId) return undefined;

    const existing = db.getStatutoryRegistrationById(regId);
    if (!existing || existing.legalEntityId !== entityId) return undefined;

    let encryptedValue = existing.encryptedValue;
    let keyVersion = existing.encryptionKeyVersion;
    let maskedValue = existing.maskedValue;

    if (input.value) {
      const enc = encryptionService.encrypt(input.value);
      encryptedValue = enc.encryptedValue;
      keyVersion = enc.keyVersion;
      maskedValue = enc.maskedValue;

      // Sync backward-compatible statutoryIds
      if (entity.isPrimary) {
        const def = db.statutoryDefinitions.get(existing.identifierDefinitionId);
        const tenant = db.getTenantById(orgId);
        if (def && tenant) {
          tenant.statutoryIds = {
            ...(tenant.statutoryIds || {}),
            [def.identifierKey.toLowerCase()]: input.value,
          };
        }
      }
    }

    const updated = db.upsertStatutoryRegistration({
      id: regId,
      legalEntityId: entityId,
      identifierDefinitionId: existing.identifierDefinitionId,
      countryCode: existing.countryCode,
      jurisdictionCode: input.jurisdictionCode !== undefined ? input.jurisdictionCode : existing.jurisdictionCode,
      encryptedValue: encryptedValue || '',
      encryptionKeyVersion: keyVersion,
      maskedValue,
      registrationStatus: input.registrationStatus || existing.registrationStatus,
      effectiveDate: input.effectiveDate !== undefined ? input.effectiveDate : existing.effectiveDate,
      expirationDate: input.expirationDate !== undefined ? input.expirationDate : existing.expirationDate,
      updatedBy: actorId,
    });

    const def = db.statutoryDefinitions.get(updated.identifierDefinitionId);

    try {
      const supabase = getSupabaseClient();
      await withSupabaseTimeout(
        supabase
          .from('organization_statutory_registrations')
          .update({
            encrypted_value: updated.encryptedValue,
            encryption_key_version: updated.encryptionKeyVersion,
            masked_value: updated.maskedValue,
            registration_status: updated.registrationStatus,
            jurisdiction_code: updated.jurisdictionCode,
            effective_date: updated.effectiveDate,
            expiration_date: updated.expirationDate,
            updated_by: updated.updatedBy,
          })
          .eq('id', regId)
      );
    } catch (err) {
      console.warn('Supabase update statutory registration warning:', err);
    }

    return {
      ...updated,
      definition: def,
    };
  }

  /**
   * Deletes a statutory registration
   */
  public async deleteStatutoryRegistration(
    orgId: string,
    entityId: string,
    regId: string,
    scopeTenantId?: string
  ): Promise<boolean> {
    if (scopeTenantId && scopeTenantId !== orgId) {
      throw new Error('Tenant isolation violation: Access denied.');
    }
    const entity = db.getLegalEntityById(entityId);
    if (!entity || entity.organizationId !== orgId) return false;

    const existing = db.getStatutoryRegistrationById(regId);
    if (!existing || existing.legalEntityId !== entityId) return false;

    const deleted = db.deleteStatutoryRegistration(regId);

    try {
      const supabase = getSupabaseClient();
      await withSupabaseTimeout(
        supabase.from('organization_statutory_registrations').delete().eq('id', regId)
      );
    } catch (err) {
      console.warn('Supabase delete statutory registration warning:', err);
    }

    return deleted;
  }
}

export const organizationService = new OrganizationService();
export default organizationService;
