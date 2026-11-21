// ==============================================================================
// JK-PAYROLL: ORGANIZATION FEATURE CONTROLLER
// Express Handlers with Context Scoping and Standardized Responses
// File: src/features/organizations/organization.controller.ts
// ==============================================================================

import { Request, Response } from 'express';
import { db } from '../../server/db/repository.js';
import { isSuperAdmin } from '../../server/middleware/rbac.guard.js';
import { organizationService } from './organization.service.js';
import { auditLogsService, extractTrustedActor } from '../audit-logs/audit-logs.service.js';
import { ENV } from '../../server/config/env.js';
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
      const isSuperAdminUser = isSuperAdmin(user);
      const scopeTenantId = isSuperAdminUser ? undefined : (user?.tenantId || '__NO_ACCESS__');

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
      const isSuperAdminUser = isSuperAdmin(user);
      const scopeTenantId = isSuperAdminUser ? undefined : user?.tenantId;

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
      if (!req.user?.userId || !isSuperAdmin(req.user)) {
        res.status(403).json({ success: false, error: 'Active SuperAdmin authorization is required' });
        return;
      }
      const created = await organizationService.createOrganizationForSuperAdmin(input, req.user.userId);

      const trustedActor = extractTrustedActor(req);
      auditLogsService
        .recordAuditLog({
          organizationId: created.id,
          actor: trustedActor,
          module: 'ORGANIZATION',
          entityType: 'organizations',
          entityId: created.id,
          action: 'CREATE',
          oldValues: null,
          newValues: { id: created.id, name: created.name, code: created.code, status: created.status },
        })
        .catch(() => {});

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
      const input = req.body as OrganizationOnboardingInput & { onboardingToken: string };
      const { onboardingToken, ...organizationInput } = input;
      const result = await organizationService.completeInvitedOrganizationOnboarding(organizationInput, onboardingToken);

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

  /** SuperAdmin issues a one-use link bound to the recipient email for 24 hours. */
  public async createOnboardingInvitation(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId || !isSuperAdmin(req.user)) {
        res.status(403).json({ success: false, error: 'Active SuperAdmin authorization is required' });
        return;
      }
      const { token, expiresAt } = await organizationService.createOnboardingInvitation(
        req.user.userId,
        String(req.body.email),
      );
      const requestOrigin = req.get('origin');
      const base = requestOrigin && ENV.ALLOWED_ORIGINS.includes(requestOrigin)
        ? requestOrigin
        : ENV.ALLOWED_ORIGINS[0];
      if (!base) throw new Error('No approved frontend origin is configured for onboarding links');
      const onboardingUrl = `${base.replace(/\/$/, '')}/onboard?token=${encodeURIComponent(token)}`;
      res.status(201).json({ success: true, onboardingUrl, expiresAt });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to issue onboarding link' });
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
      const isSuperAdminUser = isSuperAdmin(user);
      const scopeTenantId = isSuperAdminUser ? undefined : user?.tenantId;

      const updated = await organizationService.updateOrganizationSettings(id, input, scopeTenantId);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: `Organization with ID '${id}' not found`,
        });
        return;
      }

      const trustedActor = extractTrustedActor(req);
      auditLogsService
        .recordAuditLog({
          organizationId: id,
          actor: trustedActor,
          module: 'ORGANIZATION',
          entityType: 'organizations',
          entityId: id,
          action: 'UPDATE',
          oldValues: null,
          newValues: { id, settings: input.settings, statutoryIds: input.statutoryIds },
        })
        .catch(() => {});

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
      const isSuperAdminUser = isSuperAdmin(user);
      const scopeTenantId = isSuperAdminUser ? undefined : user?.tenantId;

      const updated = await organizationService.updateOrganization(id, input, scopeTenantId);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: `Organization with ID '${id}' not found`,
        });
        return;
      }

      const trustedActor = extractTrustedActor(req);
      auditLogsService
        .recordAuditLog({
          organizationId: id,
          actor: trustedActor,
          module: 'ORGANIZATION',
          entityType: 'organizations',
          entityId: id,
          action: 'UPDATE',
          oldValues: null,
          newValues: { id, name: updated.name, status: updated.status, tier: updated.tier },
        })
        .catch(() => {});

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
      const isSuperAdminUser = isSuperAdmin(user);
      const scopeTenantId = isSuperAdminUser ? undefined : user?.tenantId;

      const activeModules = await organizationService.setOrganizationModules(
        id,
        moduleCodes,
        scopeTenantId
      );

      const trustedActor = extractTrustedActor(req);
      auditLogsService
        .recordAuditLog({
          organizationId: id,
          actor: trustedActor,
          module: 'ORGANIZATION',
          entityType: 'organization_modules',
          entityId: id,
          action: 'UPDATE',
          oldValues: null,
          newValues: { organizationId: id, modules: activeModules },
        })
        .catch(() => {});

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

      const trustedActor = extractTrustedActor(req);
      auditLogsService
        .recordAuditLog({
          organizationId: id,
          actor: trustedActor,
          module: 'ORGANIZATION',
          entityType: 'organizations',
          entityId: id,
          action: 'UPDATE',
          oldValues: { status: 'Active' },
          newValues: { status: 'Suspended' },
        })
        .catch(() => {});

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

      const trustedActor = extractTrustedActor(req);
      auditLogsService
        .recordAuditLog({
          organizationId: id,
          actor: trustedActor,
          module: 'ORGANIZATION',
          entityType: 'organizations',
          entityId: id,
          action: 'DELETE',
          oldValues: { id },
          newValues: null,
        })
        .catch(() => {});

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
