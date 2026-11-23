// ==============================================================================
// JK-PAYROLL: SERVER ROOT API ROUTER
// File: src/server/routes/index.ts
// ==============================================================================

import { Router } from 'express';
import { authRoutes } from '../../features/auth/auth.routes.js';
import { organizationRoutes } from '../../features/organizations/organization.routes.js';
import { departmentRoutes } from '../../features/departments/department.routes.js';
import { roleRoutes } from '../../features/roles/role.routes.js';
import { userRoleRoutes } from '../../features/roles/user-role.routes.js';
import { userRoutes } from '../../features/users/user.routes.js';
import { leaveRoutes } from '../../features/leave-management/leave.routes.js';
import { payrollRoutes } from '../../features/payroll/payroll.routes.js';
import { accessControlRoutes } from '../../features/access-control/access-control.routes.js';
import { auditLogsRoutes } from '../../features/audit-logs/audit-logs.routes.js';

import { authMiddleware } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.guard.js';
import { leaveController } from '../../features/leave-management/leave.controller.js';
import { organizationController } from '../../features/organizations/organization.controller.js';

export const apiRouter = Router();

// Health Check
apiRouter.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Reference Data Endpoints
apiRouter.get('/countries', authMiddleware, (req, res) => organizationController.getCountries(req, res));
apiRouter.get('/statutory-identifiers/definitions', authMiddleware, (req, res) =>
  organizationController.getStatutoryDefinitions(req, res)
);

// ------------------------------------------------------------------------------
// Domain / Feature-First Routes
// ------------------------------------------------------------------------------
apiRouter.use('/auth', authRoutes);
apiRouter.use('/organizations', organizationRoutes);
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

// Transactional Leave Endpoints
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
