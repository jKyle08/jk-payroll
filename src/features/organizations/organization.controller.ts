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
      const isIsolation = error.message?.includes('Tenant isolation');
      res.status(isIsolation ? 403 : 400).json({
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

  // ============================================================================
  // INTERNATIONAL JURISDICTIONS, LEGAL ENTITIES & STATUTORY REGISTRATIONS
  // ============================================================================

  /**
   * GET /api/countries
   * Returns supported jurisdictions
   */
  public async getCountries(_req: Request, res: Response): Promise<void> {
    try {
      const countries = await organizationService.getCountries();
      res.status(200).json({
        success: true,
        data: countries,
        items: countries,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve countries',
      });
    }
  }

  /**
   * GET /api/statutory-identifiers/definitions
   * Returns statutory identifier definitions filtered by countryCode
   */
  public async getStatutoryDefinitions(req: Request, res: Response): Promise<void> {
    try {
      const countryCode = req.query.countryCode ? String(req.query.countryCode) : undefined;
      const definitions = await organizationService.getStatutoryDefinitions(countryCode);
      res.status(200).json({
        success: true,
        data: definitions,
        items: definitions,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve statutory identifier definitions',
      });
    }
  }

  /**
   * GET /api/organizations/:id/legal-entities
   */
  public async listLegalEntities(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const isSuperAdminUser = isSuperAdmin(req.user);
      const scopeTenantId = isSuperAdminUser ? undefined : req.user?.tenantId;

      const entities = await organizationService.getLegalEntities(id, scopeTenantId);
      res.status(200).json({
        success: true,
        data: entities,
        items: entities,
      });
    } catch (error: any) {
      res.status(error.message?.includes('Tenant isolation') ? 403 : 500).json({
        success: false,
        error: error.message || 'Failed to retrieve legal entities',
      });
    }
  }

  /**
   * GET /api/organizations/:id/legal-entities/:entityId
   */
  public async getLegalEntity(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const entityId = String(req.params.entityId);
      const isSuperAdminUser = isSuperAdmin(req.user);
      const scopeTenantId = isSuperAdminUser ? undefined : req.user?.tenantId;

      const entity = await organizationService.getLegalEntityById(id, entityId, scopeTenantId);
      if (!entity) {
        res.status(404).json({ success: false, error: `Legal entity '${entityId}' not found` });
        return;
      }

      res.status(200).json({
        success: true,
        data: entity,
      });
    } catch (error: any) {
      res.status(error.message?.includes('Tenant isolation') ? 403 : 500).json({
        success: false,
        error: error.message || 'Failed to retrieve legal entity',
      });
    }
  }

  /**
   * POST /api/organizations/:id/legal-entities
   */
  public async createLegalEntity(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const isSuperAdminUser = isSuperAdmin(req.user);
      const scopeTenantId = isSuperAdminUser ? undefined : req.user?.tenantId;

      const created = await organizationService.createLegalEntity(id, req.body, scopeTenantId);

      const trustedActor = extractTrustedActor(req);
      auditLogsService
        .recordAuditLog({
          organizationId: id,
          actor: trustedActor,
          module: 'ORGANIZATION',
          entityType: 'organization_legal_entities',
          entityId: created.id,
          action: 'CREATE',
          oldValues: null,
          newValues: {
            id: created.id,
            legalName: created.legalName,
            countryCode: created.countryCode,
            isPrimary: created.isPrimary,
          },
        })
        .catch(() => {});

      res.status(201).json({
        success: true,
        message: 'Legal entity registered successfully',
        data: created,
      });
    } catch (error: any) {
      res.status(error.message?.includes('Tenant isolation') ? 403 : 400).json({
        success: false,
        error: error.message || 'Failed to create legal entity',
      });
    }
  }

  /**
   * PUT /api/organizations/:id/legal-entities/:entityId
   */
  public async updateLegalEntity(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const entityId = String(req.params.entityId);
      const isSuperAdminUser = isSuperAdmin(req.user);
      const scopeTenantId = isSuperAdminUser ? undefined : req.user?.tenantId;

      const updated = await organizationService.updateLegalEntity(id, entityId, req.body, scopeTenantId);
      if (!updated) {
        res.status(404).json({ success: false, error: `Legal entity '${entityId}' not found` });
        return;
      }

      const trustedActor = extractTrustedActor(req);
      auditLogsService
        .recordAuditLog({
          organizationId: id,
          actor: trustedActor,
          module: 'ORGANIZATION',
          entityType: 'organization_legal_entities',
          entityId: updated.id,
          action: 'UPDATE',
          oldValues: null,
          newValues: {
            id: updated.id,
            legalName: updated.legalName,
            countryCode: updated.countryCode,
            isPrimary: updated.isPrimary,
          },
        })
        .catch(() => {});

      res.status(200).json({
        success: true,
        message: 'Legal entity updated successfully',
        data: updated,
      });
    } catch (error: any) {
      res.status(error.message?.includes('Tenant isolation') ? 403 : 400).json({
        success: false,
        error: error.message || 'Failed to update legal entity',
      });
    }
  }

  /**
   * DELETE /api/organizations/:id/legal-entities/:entityId
   */
  public async deleteLegalEntity(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const entityId = String(req.params.entityId);
      const isSuperAdminUser = isSuperAdmin(req.user);
      const scopeTenantId = isSuperAdminUser ? undefined : req.user?.tenantId;

      const success = await organizationService.deleteLegalEntity(id, entityId, scopeTenantId);
      if (!success) {
        res.status(404).json({ success: false, error: `Legal entity '${entityId}' not found` });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Legal entity deleted successfully',
      });
    } catch (error: any) {
      res.status(error.message?.includes('Tenant isolation') ? 403 : 400).json({
        success: false,
        error: error.message || 'Failed to delete legal entity',
      });
    }
  }

  /**
   * GET /api/organizations/:id/legal-entities/:entityId/statutory-registrations
   */
  public async listStatutoryRegistrations(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const entityId = String(req.params.entityId);
      const isSuperAdminUser = isSuperAdmin(req.user);
      const scopeTenantId = isSuperAdminUser ? undefined : req.user?.tenantId;

      const registrations = await organizationService.getStatutoryRegistrations(id, entityId, scopeTenantId);
      res.status(200).json({
        success: true,
        data: registrations,
        items: registrations,
      });
    } catch (error: any) {
      res.status(error.message?.includes('Tenant isolation') ? 403 : 500).json({
        success: false,
        error: error.message || 'Failed to retrieve statutory registrations',
      });
    }
  }

  /**
   * POST /api/organizations/:id/legal-entities/:entityId/statutory-registrations
   */
  public async saveStatutoryRegistration(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const entityId = String(req.params.entityId);
      const isSuperAdminUser = isSuperAdmin(req.user);
      const scopeTenantId = isSuperAdminUser ? undefined : req.user?.tenantId;
      const actorId = req.user?.userId;

      const saved = await organizationService.saveStatutoryRegistration(id, entityId, req.body, actorId, scopeTenantId);

      const trustedActor = extractTrustedActor(req);
      auditLogsService
        .recordAuditLog({
          organizationId: id,
          actor: trustedActor,
          module: 'ORGANIZATION',
          entityType: 'organization_statutory_registrations',
          entityId: saved.id,
          action: 'UPDATE',
          oldValues: null,
          // Explicitly omit sensitive unencrypted identifier from audit log
          newValues: {
            id: saved.id,
            legalEntityId: saved.legalEntityId,
            identifierDefinitionId: saved.identifierDefinitionId,
            countryCode: saved.countryCode,
            maskedValue: saved.maskedValue,
            registrationStatus: saved.registrationStatus,
          },
        })
        .catch(() => {});

      res.status(200).json({
        success: true,
        message: 'Statutory registration saved successfully',
        data: saved,
      });
    } catch (error: any) {
      res.status(error.message?.includes('Tenant isolation') ? 403 : 400).json({
        success: false,
        error: error.message || 'Failed to save statutory registration',
      });
    }
  }

  /**
   * PUT /api/organizations/:id/legal-entities/:entityId/statutory-registrations/:registrationId
   */
  public async updateStatutoryRegistration(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const entityId = String(req.params.entityId);
      const registrationId = String(req.params.registrationId);
      const isSuperAdminUser = isSuperAdmin(req.user);
      const scopeTenantId = isSuperAdminUser ? undefined : req.user?.tenantId;
      const actorId = req.user?.userId;

      const updated = await organizationService.updateStatutoryRegistration(
        id,
        entityId,
        registrationId,
        req.body,
        actorId,
        scopeTenantId
      );
      if (!updated) {
        res.status(404).json({ success: false, error: `Statutory registration '${registrationId}' not found` });
        return;
      }

      const trustedActor = extractTrustedActor(req);
      auditLogsService
        .recordAuditLog({
          organizationId: id,
          actor: trustedActor,
          module: 'ORGANIZATION',
          entityType: 'organization_statutory_registrations',
          entityId: updated.id,
          action: 'UPDATE',
          oldValues: null,
          newValues: {
            id: updated.id,
            legalEntityId: updated.legalEntityId,
            maskedValue: updated.maskedValue,
            registrationStatus: updated.registrationStatus,
          },
        })
        .catch(() => {});

      res.status(200).json({
        success: true,
        message: 'Statutory registration updated successfully',
        data: updated,
      });
    } catch (error: any) {
      res.status(error.message?.includes('Tenant isolation') ? 403 : 400).json({
        success: false,
        error: error.message || 'Failed to update statutory registration',
      });
    }
  }

  /**
   * DELETE /api/organizations/:id/legal-entities/:entityId/statutory-registrations/:registrationId
   */
  public async deleteStatutoryRegistration(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const entityId = String(req.params.entityId);
      const registrationId = String(req.params.registrationId);
      const isSuperAdminUser = isSuperAdmin(req.user);
      const scopeTenantId = isSuperAdminUser ? undefined : req.user?.tenantId;

      const success = await organizationService.deleteStatutoryRegistration(id, entityId, registrationId, scopeTenantId);
      if (!success) {
        res.status(404).json({ success: false, error: `Statutory registration '${registrationId}' not found` });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Statutory registration deleted successfully',
      });
    } catch (error: any) {
      res.status(error.message?.includes('Tenant isolation') ? 403 : 400).json({
        success: false,
        error: error.message || 'Failed to delete statutory registration',
      });
    }
  }
}

export const organizationController = new OrganizationController();
export default organizationController;
