// ==============================================================================
// JK-PAYROLL: ACCESS CONTROL FEATURE ROUTES
// Express Router with Auth, Role Guards, and Zod Validation
// File: src/features/access-control/access-control.routes.ts
// ==============================================================================

import { Router } from 'express';
import { accessControlController } from './access-control.controller.js';
import { authMiddleware, requireTenantAdmin } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  evaluatePermissionSchema,
  updateRoleMatrixSchema,
  allocateDeptModulesSchema,
} from './access-control.schema.js';

export const accessControlRoutes = Router();

accessControlRoutes.use(authMiddleware);

/**
 * @route   POST /api/access-control/evaluate
 * @desc    Evaluate a user's runtime authorization for a permission key
 * @access  Authenticated Users
 */
accessControlRoutes.post(
  '/evaluate',
  validate({ body: evaluatePermissionSchema }),
  (req, res) => accessControlController.evaluatePermission(req, res)
);

/**
 * @route   GET /api/access-control/matrix/:roleId
 * @desc    Get permissions matrix catalog and active grants for a role
 * @access  Tenant Admin or SuperAdmin
 */
accessControlRoutes.get(
  '/matrix/:roleId',
  requireTenantAdmin,
  (req, res) => accessControlController.getRoleMatrix(req, res)
);

/**
 * @route   PUT /api/access-control/matrix/:roleId
 * @desc    Update permissions matrix for a role
 * @access  Tenant Admin or SuperAdmin
 */
accessControlRoutes.put(
  '/matrix/:roleId',
  requireTenantAdmin,
  validate({ body: updateRoleMatrixSchema }),
  (req, res) => accessControlController.updateRoleMatrix(req, res)
);

/**
 * @route   POST /api/access-control/departments/modules
 * @desc    Allocate tenant modules to a department
 * @access  Tenant Admin
 */
accessControlRoutes.post(
  '/departments/modules',
  requireTenantAdmin,
  validate({ body: allocateDeptModulesSchema }),
  (req, res) => accessControlController.allocateDepartmentModules(req, res)
);

export default accessControlRoutes;
