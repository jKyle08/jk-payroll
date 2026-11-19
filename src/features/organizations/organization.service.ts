// ==============================================================================
// JK-PAYROLL: ORGANIZATION FEATURE SERVICE
// Database Operations & Business Logic with Tenant Scoping
// File: src/features/organizations/organization.service.ts
// ==============================================================================

import { db } from '../../server/db/repository.js';
import { getSupabaseClient } from '../../server/db/supabase.js';
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
} from './types.js';
import {
  CreateOrganizationInput,
  CreateOrganizationFormInput,
  UpdateOrganizationInput,
  OrganizationOnboardingInput,
  UpdateOrganizationSettingsInput,
} from './organization.schema.js';

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
      currency: data.currency || 'USD',
      timezone: data.timezone || 'UTC',
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
}

export const organizationService = new OrganizationService();
export default organizationService;
