// ==============================================================================
// JK-PAYROLL: ORGANIZATION FEATURE ROUTES
// Express Router with Auth, Role Guards, and Zod Validation
// File: src/features/organizations/organization.routes.ts
// ==============================================================================

import { Router } from 'express';
import { organizationController } from './organization.controller.js';
import {
  authMiddleware,
  requireSuperAdmin,
  requireTenantAdmin,
} from '../../server/middleware/auth.middleware.js';
import { validate } from '../../server/middleware/validate.middleware.js';
import {
  organizationProvisioningSchema,
  organizationOnboardingSubmissionSchema,
  createOnboardingInvitationSchema,
  updateOrganizationSchema,
  updateOrganizationSettingsSchema,
  updateModulesSchema,
  organizationIdParamSchema,
  organizationQuerySchema,
  createLegalEntitySchema,
  updateLegalEntitySchema,
  createStatutoryRegistrationSchema,
  updateStatutoryRegistrationSchema,
  legalEntityIdParamSchema,
  registrationIdParamSchema,
} from './organization.schema.js';

export const organizationRoutes = Router();

// Public endpoint: authorization is a short-lived, single-use onboarding token.
// It is declared before the authenticated route barrier intentionally.
organizationRoutes.post(
  '/onboarding',
  validate({ body: organizationOnboardingSubmissionSchema }),
  (req, res) => organizationController.createOrganizationOnboarding(req, res)
);

// All remaining organization endpoints require a current authenticated session.
organizationRoutes.use(authMiddleware);

/**
 * @route   GET /api/organizations
 * @desc    List organizations with optional search, status, and tier filters
 * @access  Authenticated Users
 */
organizationRoutes.get(
  '/',
  validate({ query: organizationQuerySchema }),
  (req, res) => organizationController.listOrganizations(req, res)
);

/**
 * @route   GET /api/organizations/:id
 * @desc    Get details for an organization
 * @access  SuperAdmin or Scoped Tenant Admin
 */
organizationRoutes.get(
  '/:id',
  validate({ params: organizationIdParamSchema }),
  (req, res) => organizationController.getOrganization(req, res)
);

/**
 * @route   POST /api/organizations
 * @desc    Provision a new organization & root administrator
 * @access  SuperAdmin Only
 */
organizationRoutes.post(
  '/',
  requireSuperAdmin,
  validate({ body: organizationProvisioningSchema }),
  (req, res) => organizationController.createOrganization(req, res)
);

/** SuperAdmin issues a one-use, 24-hour onboarding link bound to an email. */
organizationRoutes.post(
  '/onboarding-invitations',
  requireSuperAdmin,
  validate({ body: createOnboardingInvitationSchema }),
  (req, res) => organizationController.createOnboardingInvitation(req, res)
);

/**
 * @route   PUT /api/organizations/:id/settings
 * @desc    Update company profile, statutory agency IDs, work modalities, and organizational settings
 * @access  Tenant Admin or SuperAdmin
 */
organizationRoutes.put(
  '/:id/settings',
  requireTenantAdmin,
  validate({
    params: organizationIdParamSchema,
    body: updateOrganizationSettingsSchema,
  }),
  (req, res) => organizationController.updateOrganizationSettings(req, res)
);

organizationRoutes.patch(
  '/:id/settings',
  requireTenantAdmin,
  validate({
    params: organizationIdParamSchema,
    body: updateOrganizationSettingsSchema,
  }),
  (req, res) => organizationController.updateOrganizationSettings(req, res)
);

/**
 * @route   PUT /api/organizations/:id
 * @desc    Update organization settings
 * @access  SuperAdmin or Tenant Admin
 */
organizationRoutes.put(
  '/:id',
  requireTenantAdmin,
  validate({
    params: organizationIdParamSchema,
    body: updateOrganizationSchema,
  }),
  (req, res) => organizationController.updateOrganization(req, res)
);

organizationRoutes.patch(
  '/:id',
  requireTenantAdmin,
  validate({
    params: organizationIdParamSchema,
    body: updateOrganizationSchema,
  }),
  (req, res) => organizationController.updateOrganization(req, res)
);

/**
 * @route   PUT /api/organizations/:id/modules
 * @desc    Allocate module entitlements to an organization
 * @access  SuperAdmin Only
 */
organizationRoutes.put(
  '/:id/modules',
  requireSuperAdmin,
  validate({
    params: organizationIdParamSchema,
    body: updateModulesSchema,
  }),
  (req, res) => organizationController.updateModules(req, res)
);

/**
 * @route   POST /api/organizations/:id/suspend
 * @desc    Suspend an organization
 * @access  SuperAdmin Only
 */
organizationRoutes.post(
  '/:id/suspend',
  requireSuperAdmin,
  validate({ params: organizationIdParamSchema }),
  (req, res) => organizationController.suspendOrganization(req, res)
);

/**
 * @route   DELETE /api/organizations/:id
 * @desc    Delete an organization
 * @access  SuperAdmin Only
 */
organizationRoutes.delete(
  '/:id',
  requireSuperAdmin,
  validate({ params: organizationIdParamSchema }),
  (req, res) => organizationController.deleteOrganization(req, res)
);

// ------------------------------------------------------------------------------
// Legal Entities & Statutory Registrations Sub-Resources
// ------------------------------------------------------------------------------

/**
 * @route   GET /api/organizations/:id/legal-entities
 * @desc    List legal entities for an organization
 * @access  Scoped Organization Member
 */
organizationRoutes.get(
  '/:id/legal-entities',
  validate({ params: organizationIdParamSchema }),
  (req, res) => organizationController.listLegalEntities(req, res)
);

/**
 * @route   POST /api/organizations/:id/legal-entities
 * @desc    Create a legal entity for an organization
 * @access  Tenant Admin or SuperAdmin
 */
organizationRoutes.post(
  '/:id/legal-entities',
  requireTenantAdmin,
  validate({
    params: organizationIdParamSchema,
    body: createLegalEntitySchema,
  }),
  (req, res) => organizationController.createLegalEntity(req, res)
);

/**
 * @route   GET /api/organizations/:id/legal-entities/:entityId
 * @desc    Get details for a legal entity
 * @access  Scoped Organization Member
 */
organizationRoutes.get(
  '/:id/legal-entities/:entityId',
  validate({ params: legalEntityIdParamSchema }),
  (req, res) => organizationController.getLegalEntity(req, res)
);

/**
 * @route   PUT /api/organizations/:id/legal-entities/:entityId
 * @desc    Update a legal entity
 * @access  Tenant Admin or SuperAdmin
 */
organizationRoutes.put(
  '/:id/legal-entities/:entityId',
  requireTenantAdmin,
  validate({
    params: legalEntityIdParamSchema,
    body: updateLegalEntitySchema,
  }),
  (req, res) => organizationController.updateLegalEntity(req, res)
);

/**
 * @route   DELETE /api/organizations/:id/legal-entities/:entityId
 * @desc    Delete a legal entity
 * @access  Tenant Admin or SuperAdmin
 */
organizationRoutes.delete(
  '/:id/legal-entities/:entityId',
  requireTenantAdmin,
  validate({ params: legalEntityIdParamSchema }),
  (req, res) => organizationController.deleteLegalEntity(req, res)
);

/**
 * @route   GET /api/organizations/:id/legal-entities/:entityId/statutory-registrations
 * @desc    List statutory registrations for a legal entity
 * @access  Scoped Organization Member
 */
organizationRoutes.get(
  '/:id/legal-entities/:entityId/statutory-registrations',
  validate({ params: legalEntityIdParamSchema }),
  (req, res) => organizationController.listStatutoryRegistrations(req, res)
);

/**
 * @route   POST /api/organizations/:id/legal-entities/:entityId/statutory-registrations
 * @desc    Create or upsert statutory registration
 * @access  Tenant Admin or SuperAdmin
 */
organizationRoutes.post(
  '/:id/legal-entities/:entityId/statutory-registrations',
  requireTenantAdmin,
  validate({
    params: legalEntityIdParamSchema,
    body: createStatutoryRegistrationSchema,
  }),
  (req, res) => organizationController.saveStatutoryRegistration(req, res)
);

/**
 * @route   PUT /api/organizations/:id/legal-entities/:entityId/statutory-registrations/:registrationId
 * @desc    Update statutory registration
 * @access  Tenant Admin or SuperAdmin
 */
organizationRoutes.put(
  '/:id/legal-entities/:entityId/statutory-registrations/:registrationId',
  requireTenantAdmin,
  validate({
    params: registrationIdParamSchema,
    body: updateStatutoryRegistrationSchema,
  }),
  (req, res) => organizationController.updateStatutoryRegistration(req, res)
);

/**
 * @route   DELETE /api/organizations/:id/legal-entities/:entityId/statutory-registrations/:registrationId
 * @desc    Delete statutory registration
 * @access  Tenant Admin or SuperAdmin
 */
organizationRoutes.delete(
  '/:id/legal-entities/:entityId/statutory-registrations/:registrationId',
  requireTenantAdmin,
  validate({ params: registrationIdParamSchema }),
  (req, res) => organizationController.deleteStatutoryRegistration(req, res)
);

export default organizationRoutes;
