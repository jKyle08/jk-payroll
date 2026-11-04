// ==============================================================================
// JK-PAYROLL: ORGANIZATION FEATURE CONTROLLER
// Express Handlers with Context Scoping and Standardized Responses
// File: src/features/organizations/organization.controller.ts
// ==============================================================================

import { Request, Response } from 'express';
import { organizationService } from './organization.service.js';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
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
      const query = (req.query as unknown) as OrganizationQueryInput;
      const result = await organizationService.listOrganizations({
        search: query.search || '',
        status: query.status,
        tier: query.tier,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          activeCount: result.activeCount,
          pendingCount: result.pendingCount,
          totalHeadcount: result.totalHeadcount,
        },
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
      const user = (req as any).user;
      const scopeTenantId = user?.role === 'SuperAdmin' ? undefined : user?.tenantId;

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
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to provision organization',
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
      const user = (req as any).user;
      const scopeTenantId = user?.role === 'SuperAdmin' ? undefined : user?.tenantId;

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
      const { moduleCodes }: UpdateModulesInput = req.body;
      const user = (req as any).user;
      const scopeTenantId = user?.role === 'SuperAdmin' ? undefined : user?.tenantId;

      const activeModules = await organizationService.setOrganizationModules(
        id,
        moduleCodes,
        scopeTenantId
      );

      res.status(200).json({
        success: true,
        message: 'Organization module entitlements updated',
        data: activeModules,
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
