// ==============================================================================
// JK-PAYROLL: TENANTS FEATURE SERVICE
// File: src/features/tenants/tenant.service.ts
// ==============================================================================

import { db } from '../../db/repository.js';
import { Tenant, CreateTenantInput } from './types.js';
import { Module } from '../../types/index.js';
import { getSupabaseClient } from '../../db/supabase.js';

export class TenantService {
  public async createTenant(data: CreateTenantInput): Promise<Tenant> {
    const tenant = db.createTenant(data);

    // If modules were passed as codes, associate them locally
    if (data.modules && data.modules.length > 0) {
      const moduleIds: string[] = [];
      for (const code of data.modules) {
        const mod = Array.from(db.modules.values()).find(m => m.code === code);
        if (mod) moduleIds.push(mod.id);
      }
      if (moduleIds.length > 0) {
        db.setTenantModules(tenant.id, moduleIds);
      }
    }

    try {
      const supabase = getSupabaseClient();
      await supabase.from('organizations').insert({
        id: tenant.id,
        name: tenant.name,
        code: tenant.code,
        is_active: tenant.isActive,
      });
    } catch (err) {
      console.warn('Supabase tenant insert warning:', err);
    }

    return tenant;
  }

  public getTenantById(id: string): Tenant | undefined {
    return db.getTenantById(id);
  }

  public async listTenants(): Promise<Tenant[]> {
    try {
      const supabase = getSupabaseClient();
      const { data: dbTenants, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && dbTenants) {
        // Sync remote database records into repository map
        for (const t of dbTenants) {
          if (!db.tenants.has(t.id)) {
            db.tenants.set(t.id, {
              id: t.id,
              name: t.name,
              code: t.code,
              isActive: t.is_active,
              startDate: t.start_date || null,
              endDate: t.end_date || null,
              createdAt: new Date(t.created_at),
              updatedAt: new Date(t.updated_at),
            });
          }
        }

        return dbTenants.map((t: any) => {
          const local = db.tenants.get(t.id);
          const allocated = db.getTenantModules(t.id).map(m => m.code);
          return {
            id: t.id,
            name: t.name,
            code: t.code,
            isActive: t.is_active,
            createdAt: new Date(t.created_at),
            updatedAt: new Date(t.updated_at),
            modules: allocated.length > 0 ? allocated : (local?.modules || ['TypeOfLeave', 'Department']),
            industry: local?.industry || 'Technology & Software',
            domain: local?.domain || `${t.code.toLowerCase()}.com`,
            adminName: local?.adminName || 'Admin',
            adminEmail: local?.adminEmail || `admin@${t.code.toLowerCase()}.com`,
            adminUsername: local?.adminUsername || `${t.code.toLowerCase()}_admin`,
            adminTitle: local?.adminTitle || 'Tenant Administrator',
          };
        });
      }
    } catch (err) {
      console.warn('Supabase listTenants warning, fallback to in-memory db:', err);
    }

    return Array.from(db.tenants.values()).map(t => ({
      ...t,
      modules: t.modules || db.getTenantModules(t.id).map(m => m.code) || ['TypeOfLeave', 'Department']
    }));
  }

  public setTenantModules(tenantId: string, moduleIds: string[]): Module[] {
    db.setTenantModules(tenantId, moduleIds);
    return db.getTenantModules(tenantId);
  }

  public getTenantModules(tenantId: string): Module[] {
    return db.getTenantModules(tenantId);
  }
}

export const tenantService = new TenantService();

