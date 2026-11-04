// ==============================================================================
// JK-PAYROLL: ROOT API ROUTER
// File: src/routes/index.ts
// ==============================================================================

import { Router } from 'express';
import { authRoutes } from '../features/auth/auth.routes.js';
import { organizationRoutes } from '../features/organizations/organization.routes.js';
import { departmentRoutes } from '../features/departments/department.routes.js';
import { roleRoutes } from '../features/roles/role.routes.js';
import { userRoleRoutes } from '../features/roles/user-role.routes.js';
import { userRoutes } from '../features/users/user.routes.js';
import { leaveRoutes } from '../features/leave-management/leave.routes.js';
import { payrollRoutes } from '../features/payroll/payroll.routes.js';
import { accessControlRoutes } from '../features/access-control/access-control.routes.js';
import { auditLogsRoutes } from '../features/audit-logs/audit-logs.routes.js';

import { authMiddleware, requireSuperAdmin, requireTenantAdmin } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.guard.js';
import { departmentController } from '../features/departments/department.controller.js';
import { userController } from '../features/users/user.controller.js';
import { organizationController } from '../features/organizations/organization.controller.js';
import { leaveController } from '../features/leave-management/leave.controller.js';

export const apiRouter = Router();

// Health Check
apiRouter.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ------------------------------------------------------------------------------
// Domain / Feature-First Routes
// ------------------------------------------------------------------------------
apiRouter.use('/auth', authRoutes);
apiRouter.use('/organizations', organizationRoutes);
apiRouter.use('/tenants', organizationRoutes); // Backward-compatibility alias pointing to organizationRoutes
apiRouter.use('/departments', departmentRoutes);
apiRouter.use('/roles', roleRoutes);
apiRouter.use('/user-roles', userRoleRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/leaves', leaveRoutes);
apiRouter.use('/payroll', payrollRoutes);
apiRouter.use('/access-control', accessControlRoutes);
apiRouter.use('/audit-logs', auditLogsRoutes);
apiRouter.use('/audits', auditLogsRoutes);

// ------------------------------------------------------------------------------
// Backward-Compatibility Aliases (for existing tests & integrations)
// ------------------------------------------------------------------------------

// 1. /api/super-admin
const superAdminCompat = Router();
superAdminCompat.use(authMiddleware, requireSuperAdmin);
superAdminCompat.post('/tenants', (req, res) => organizationController.createOrganization(req, res));
superAdminCompat.put('/tenants/:id/modules', (req, res) => organizationController.updateModules(req, res));
apiRouter.use('/super-admin', superAdminCompat);

// 2. /api/tenant
const tenantCompat = Router();
tenantCompat.use(authMiddleware, requireTenantAdmin);
tenantCompat.post('/departments', (req, res) => departmentController.createDepartment(req, res));
tenantCompat.get('/departments/tree', (req, res) => departmentController.getDepartmentTree(req, res));
tenantCompat.put('/departments/:id/modules', (req, res) => departmentController.allocateDepartmentModules(req, res));
tenantCompat.get('/users/:id/eligible-modules', (req, res) => userController.getUserEligibleModules(req, res));
tenantCompat.put('/users/:id/permissions', (req, res) => userController.assignUserPermissions(req, res));
apiRouter.use('/tenant', tenantCompat);

// 3. /api/type-of-leave & /api/leave-requests
const transactionCompat = Router();
transactionCompat.use(authMiddleware);
transactionCompat.post('/type-of-leave', requirePermission('TypeOfLeave.Add'), (req, res) =>
  leaveController.createTypeOfLeave(req, res)
);
transactionCompat.get('/type-of-leave', requirePermission('TypeOfLeave.View'), (req, res) =>
  leaveController.getTypeOfLeaveList(req, res)
);
transactionCompat.post('/leave-requests', requirePermission('RequestForLeave.Add'), (req, res) =>
  leaveController.createLeaveRequest(req, res)
);
transactionCompat.get('/leave-requests', requirePermission('RequestForLeave.View'), (req, res) =>
  leaveController.getLeaveRequests(req, res)
);
apiRouter.use('/', transactionCompat);

export default apiRouter;
