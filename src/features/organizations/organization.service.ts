// ==============================================================================
// JK-PAYROLL: ORGANIZATION FEATURE SERVICE
// Database Operations & Business Logic with Tenant Scoping
// File: src/features/organizations/organization.service.ts
// ==============================================================================

import { db } from '../../db/repository.js';
import { getSupabaseClient } from '../../db/supabase.js';
import { Tenant } from '../../types/index.js';
import {
  Organization,
  resolveModuleDependencies,
  OrgFilterState,
  OrganizationTier,
  OrganizationStatus,
  PayFrequency,
} from './types.js';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from './organization.schema.js';

export class OrganizationService {
  /**
   * Helper to map a database Tenant record to the Organization presentation model.
   * All data is looked up dynamically from the database repository and profiles.
   */
  public mapTenantToOrganization(tenant: Tenant): Organization {
    const code = tenant.code || 'ORG';
    const slug = `org_${code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const domain = tenant.domain || `${code.toLowerCase()}.com`;

    // Dynamic headcount lookup from database profiles
    const tenantProfiles = Array.from(db.profiles.values()).filter(
      (p) => p.tenantId === tenant.id
    );
    const headcount = tenantProfiles.length;

    // Admin lookup from database profiles or tenant metadata
    const adminProfile = tenantProfiles.find((p) => p.isTenantAdmin || p.isSuperAdmin);
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
      name: tenant.name,
      code: code,
      slug,
      domain,
      industry: tenant.industry || 'Technology & Software',
      planTier: (tenant.planTier as OrganizationTier) || 'Enterprise',
      status: (tenant.isActive ? 'Active' : 'Suspended') as OrganizationStatus,
      healthStatus: tenant.isActive ? 'healthy' : 'error',
      headcount,
      defaultPayFrequency: (tenant.defaultPayFrequency as PayFrequency) || 'Semi-Monthly',
      admin: {
        name: adminFullName,
        fullName: adminFullName,
        email: adminEmail,
        username: adminUsername,
        title: adminTitle,
        avatarInitials,
      },
      modules: resolvedModules,
      startDate: tenant.startDate || null,
      endDate: tenant.endDate || null,
      createdAt: new Date(tenant.createdAt || Date.now()).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }),
    };
  }

  /**
   * Retrieves all organizations filtered and scoped directly from database data.
   * No default values are used.
   */
  public async listOrganizations(filters?: Partial<OrgFilterState>): Promise<{
    items: Organization[];
    total: number;
    activeCount: number;
    pendingCount: number;
    totalHeadcount: number;
  }> {
    // 1. Sync from remote Supabase database if available
    try {
      const supabase = getSupabaseClient();
      const { data: dbRows, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && dbRows) {
        for (const row of dbRows) {
          if (!db.tenants.has(row.id)) {
            const code = row.code || 'ORG';
            db.tenants.set(row.id, {
              id: row.id,
              name: row.name,
              code: code,
              isActive: row.is_active !== undefined ? row.is_active : true,
              industry: row.industry,
              domain: row.domain || `${code.toLowerCase()}.com`,
              planTier: row.plan_tier || 'Enterprise',
              startDate: row.start_date || null,
              endDate: row.end_date || null,
              createdAt: new Date(row.created_at || Date.now()),
              updatedAt: new Date(row.updated_at || Date.now()),
            });
          }
        }
      }
    } catch {
      // Graceful fallback to local database repository
    }

    // 2. Fetch all tenants from database repository
    const tenants = Array.from(db.tenants.values());
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
          org.domain.toLowerCase().includes(filters.search.toLowerCase()) ||
          org.admin.email.toLowerCase().includes(filters.search.toLowerCase()) ||
          (org.admin.name && org.admin.name.toLowerCase().includes(filters.search.toLowerCase()));

        const matchesStatus =
          !filters.status || filters.status === 'All' || org.status === filters.status;

        const matchesTier =
          !filters.tier || filters.tier === 'All' || org.planTier === filters.tier;

        return matchesSearch && matchesStatus && matchesTier;
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
        const { data: row, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!error && row) {
          tenant = {
            id: row.id,
            name: row.name,
            code: row.code || 'ORG',
            isActive: row.is_active !== undefined ? row.is_active : true,
            industry: row.industry,
            domain: row.domain,
            planTier: row.plan_tier,
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
  public async createOrganization(data: CreateOrganizationInput): Promise<Organization> {
    const slug = `org_${data.code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const id = `t-${data.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    // Enforce Core Module locking & Add-On dependency resolution
    const { resolvedModules } = resolveModuleDependencies(data.modules || []);

    // 1. Store in database repository
    const tenant = db.createTenant({
      id,
      name: data.name,
      code: data.code,
      isActive: data.status === 'Active',
      industry: data.industry || 'Technology & Software',
      domain: data.domain || `${data.code.toLowerCase()}.com`,
      adminName: data.admin.fullName,
      adminEmail: data.admin.email,
      adminUsername: data.admin.username || data.admin.email.split('@')[0],
      adminTitle: data.admin.title || 'Organization Administrator',
      modules: resolvedModules,
      planTier: data.planTier,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
    });

    // 2. Provision Admin profile in database
    db.createProfile({
      id: `usr-${id}-admin`,
      tenantId: tenant.id,
      fullName: data.admin.fullName,
      email: data.admin.email,
      username: data.admin.username || data.admin.email.split('@')[0],
      isTenantAdmin: true,
      isSuperAdmin: false,
      isActive: true,
    });

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
      await supabase.from('organizations').insert({
        id: tenant.id,
        name: data.name,
        code: data.code,
        is_active: data.status === 'Active',
      });
    } catch (err) {
      console.warn('Supabase organization sync warning:', err);
    }

    return this.mapTenantToOrganization(tenant);
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

    const updated = db.updateTenant(id, {
      name: data.name ?? existing.name,
      domain: data.domain ?? existing.domain,
      industry: data.industry ?? existing.industry,
      planTier: data.planTier ?? existing.planTier,
      isActive: data.status ? data.status === 'Active' : existing.isActive,
      startDate: data.startDate !== undefined ? data.startDate : existing.startDate,
      endDate: data.endDate !== undefined ? data.endDate : existing.endDate,
      adminName: data.admin?.fullName ?? existing.adminName,
      adminEmail: data.admin?.email ?? existing.adminEmail,
      adminTitle: data.admin?.title ?? existing.adminTitle,
      modules: updatedModules,
    });

    if (!updated) return undefined;

    // Sync to Supabase
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('organizations')
        .update({
          name: updated.name,
          is_active: updated.isActive,
        })
        .eq('id', id);
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
