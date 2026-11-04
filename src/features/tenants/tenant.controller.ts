// ==============================================================================
// JK-PAYROLL: TENANTS FEATURE CONTROLLER
// File: src/features/tenants/tenant.controller.ts
// ==============================================================================

import { Request, Response } from 'express';
import { z } from 'zod';
import { tenantService } from './tenant.service.js';

const CreateTenantSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(64),
  isActive: z.boolean().optional(),
  industry: z.string().optional(),
  domain: z.string().optional(),
  adminName: z.string().optional(),
  adminEmail: z.string().optional(),
  adminUsername: z.string().optional(),
  adminTitle: z.string().optional(),
  modules: z.array(z.string()).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

const SetTenantModulesSchema = z.object({
  moduleIds: z.array(z.string().uuid()),
});

export class TenantController {
  public async createTenant(req: Request, res: Response): Promise<void> {
    try {
      const parsed = CreateTenantSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
        return;
      }

      const tenant = await tenantService.createTenant(parsed.data);
      res.status(201).json({ message: 'Tenant created successfully', tenant });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  public async getTenant(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const tenant = tenantService.getTenantById(id);
      if (!tenant) {
        res.status(404).json({ error: `Tenant ${id} not found` });
        return;
      }
      res.status(200).json({ tenant });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  public async listTenants(_req: Request, res: Response): Promise<void> {
    try {
      const tenants = await tenantService.listTenants();
      res.status(200).json({ tenants });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public async setTenantModules(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.params.id as string;
      const parsed = SetTenantModulesSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
        return;
      }

      const modules = tenantService.setTenantModules(tenantId, parsed.data.moduleIds);
      res.status(200).json({
        message: 'Tenant modules updated successfully',
        tenantId,
        modules,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  public async getTenantModules(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.params.id as string;
      const modules = tenantService.getTenantModules(tenantId);
      res.status(200).json({ tenantId, modules });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const tenantController = new TenantController();
