// ==============================================================================
// JK-PAYROLL: ACCESS CONTROL VALIDATION SCHEMAS (ZOD V3.24)
// File: src/features/access-control/access-control.schema.ts
// ==============================================================================

import { z } from 'zod';

export const evaluatePermissionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  permissionKey: z.string().min(1, 'Permission key is required'),
  departmentId: z.string().optional(),
});

export type EvaluatePermissionInput = z.infer<typeof evaluatePermissionSchema>;

export const updateRoleMatrixSchema = z.object({
  grantedActionIds: z.array(z.string()).default([]),
});

export type UpdateRoleMatrixInput = z.infer<typeof updateRoleMatrixSchema>;

export const allocateDeptModulesSchema = z.object({
  departmentId: z.string().min(1, 'Department ID is required'),
  moduleIds: z.array(z.string()).min(1, 'At least one module must be allocated'),
});

export type AllocateDeptModulesInput = z.infer<typeof allocateDeptModulesSchema>;
