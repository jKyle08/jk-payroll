// ==============================================================================
// JK-PAYROLL: TENANTS FEATURE ROUTES
// File: src/features/tenants/tenant.routes.ts
// ==============================================================================

import { Router } from 'express';
import { tenantController } from './tenant.controller.js';
import { authenticateJwt, requireSuperAdmin } from '../../middleware/auth.middleware.js';

export const tenantRoutes = Router();

tenantRoutes.use(authenticateJwt, requireSuperAdmin);

tenantRoutes.post('/', (req, res) => tenantController.createTenant(req, res));
tenantRoutes.get('/', (req, res) => tenantController.listTenants(req, res));
tenantRoutes.get('/:id', (req, res) => tenantController.getTenant(req, res));
tenantRoutes.put('/:id/modules', (req, res) => tenantController.setTenantModules(req, res));
tenantRoutes.get('/:id/modules', (req, res) => tenantController.getTenantModules(req, res));

export default tenantRoutes;
