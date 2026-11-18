// ==============================================================================
// JK-PAYROLL: ORGANIZATION FEATURE CONTROLLER
// Express Handlers with Context Scoping and Standardized Responses
// File: src/features/organizations/organization.controller.ts
// ==============================================================================

import { Request, Response } from 'express';
import { db } from '../../server/db/repository.js';
import { organizationService } from './organization.service.js';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationOnboardingInput,
  UpdateOrganizationSettingsInput,
  UpdateModulesInput,
  OrganizationQueryInput,
} from './organization.schema.js';

export class OrganizationController {
  /**
   * GET /api/organizations
   * Lists organizations matching query filters
   */
  public async listOrganizations(req: Request, res: Response): Promise<void> {
    try {
      const query = (req.query as unknown) as OrganizationQueryInput & { page?: string; limit?: string };
      const user = req.user;
      const isSuperAdmin = Boolean(user?.isSuperAdmin || (user as any)?.role === 'SuperAdmin');
      const scopeTenantId = isSuperAdmin ? undefined : (user?.tenantId || '__NO_ACCESS__');

      const result = await organizationService.listOrganizations(
        {
          search: query.search || '',
          status: query.status,
          tier: query.tier,
        },
        scopeTenantId
      );

      const hasPagination = query.page !== undefined || query.limit !== undefined;
      const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
      const limit = Math.max(1, parseInt(String(query.limit || '10'), 10) || 10);
      const pagedItems = hasPagination
        ? result.items.slice((page - 1) * limit, page * limit)
        : result.items;

      res.status(200).json({
        success: true,
        data: pagedItems,
        items: pagedItems,
        organizations: pagedItems,
        meta: {
          total: result.total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(result.total / limit)),
          activeCount: result.activeCount,
          pendingCount: result.pendingCount,
          totalHeadcount: result.totalHeadcount,
        },
        total: result.total,
        activeCount: result.activeCount,
        pendingCount: result.pendingCount,
        totalHeadcount: result.totalHeadcount,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list organizations',
      });
    }
  }

  /**
   * GET /api/organizations/:id
   * Retrieves single organization with scoping
   */
  public async getOrganization(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const user = req.user;
      const isSuperAdmin = Boolean(user?.isSuperAdmin || (user as any)?.role === 'SuperAdmin');
      const scopeTenantId = isSuperAdmin ? undefined : user?.tenantId;

      const org = await organizationService.getOrganizationById(id, scopeTenantId);
      if (!org) {
        res.status(404).json({
          success: false,
          error: `Organization with ID '${id}' not found or access denied`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: org,
        organization: org,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve organization',
      });
    }
  }

  /**
   * POST /api/organizations
   * Provisions a new organization and root administrator
   */
  public async createOrganization(req: Request, res: Response): Promise<void> {
    try {
      const input: CreateOrganizationInput = req.body;
      const created = await organizationService.createOrganization(input);

      res.status(201).json({
        success: true,
        message: 'Organization provisioned successfully',
        data: created,
        organization: created,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to provision organization',
      });
    }
  }

  /**
   * POST /api/organizations/onboarding
   * Provisions a new tenant via Onboarding Wizard & returns redirect URL
   */
  public async createOrganizationOnboarding(req: Request, res: Response): Promise<void> {
    try {
      const input: OrganizationOnboardingInput = req.body;
      const result = await organizationService.createOrganizationOnboarding(input);

      res.status(201).json({
        success: true,
        message: 'Organization onboarded successfully',
        data: result.organization,
        organization: result.organization,
        redirectUrl: result.redirectUrl,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to onboard organization',
      });
    }
  }

  /**
   * PUT /api/organizations/:id/settings
   * Updates company profile, statutory agency IDs, work modalities, and organizational settings.
   * Prohibits altering immutable identifiers (code, slug, tier, status) or admin credentials.
   */
  public async updateOrganizationSettings(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const input: UpdateOrganizationSettingsInput = req.body;
      const user = req.user;
      const isSuperAdmin = Boolean(user?.isSuperAdmin || (user as any)?.role === 'SuperAdmin');
      const scopeTenantId = isSuperAdmin ? undefined : user?.tenantId;

      const updated = await organizationService.updateOrganizationSettings(id, input, scopeTenantId);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: `Organization with ID '${id}' not found`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Organization settings updated successfully',
        data: updated,
        organization: updated,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update organization settings',
      });
    }
  }

  /**
   * PUT /api/organizations/:id
   * Updates an existing organization's metadata
   */
  public async updateOrganization(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const input: UpdateOrganizationInput = req.body;
      const user = req.user;
      const isSuperAdmin = Boolean(user?.isSuperAdmin || (user as any)?.role === 'SuperAdmin');
      const scopeTenantId = isSuperAdmin ? undefined : user?.tenantId;

      const updated = await organizationService.updateOrganization(id, input, scopeTenantId);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: `Organization with ID '${id}' not found`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Organization updated successfully',
        data: updated,
        organization: updated,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update organization',
      });
    }
  }

  /**
   * PUT /api/organizations/:id/modules
   * Updates allocated module entitlements
   */
  public async updateModules(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const rawItems = (req.body.moduleCodes || req.body.moduleIds || []) as string[];
      const moduleCodes = rawItems.map((item) => {
        const mod = db.modules.get(item);
        return mod ? mod.code : item;
      });
      const user = req.user;
      const isSuperAdmin = Boolean(user?.isSuperAdmin || (user as any)?.role === 'SuperAdmin');
      const scopeTenantId = isSuperAdmin ? undefined : user?.tenantId;

      const activeModules = await organizationService.setOrganizationModules(
        id,
        moduleCodes,
        scopeTenantId
      );

      res.status(200).json({
        success: true,
        message: 'Organization module entitlements updated',
        data: activeModules,
        modules: activeModules,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update module entitlements',
      });
    }
  }

  /**
   * POST /api/organizations/:id/suspend
   * Suspends an organization workspace
   */
  public async suspendOrganization(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const suspended = await organizationService.suspendOrganization(id);

      if (!suspended) {
        res.status(404).json({
          success: false,
          error: `Organization with ID '${id}' not found`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Organization suspended successfully',
        data: suspended,
        organization: suspended,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to suspend organization',
      });
    }
  }

  /**
   * DELETE /api/organizations/:id
   * Deletes an organization workspace
   */
  public async deleteOrganization(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const success = await organizationService.deleteOrganization(id);

      if (!success) {
        res.status(404).json({
          success: false,
          error: `Organization with ID '${id}' not found`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Organization deleted successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete organization',
      });
    }
  }
}

export const organizationController = new OrganizationController();
export default organizationController;
