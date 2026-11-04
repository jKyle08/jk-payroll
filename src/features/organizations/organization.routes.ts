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
} from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  updateModulesSchema,
  organizationIdParamSchema,
  organizationQuerySchema,
} from './organization.schema.js';

export const organizationRoutes = Router();

// Global auth barrier for all organization endpoints
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
  validate({ body: createOrganizationSchema }),
  (req, res) => organizationController.createOrganization(req, res)
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

export default organizationRoutes;
