// ==============================================================================
// JK-PAYROLL: DEPARTMENTS VALIDATION SCHEMAS (ZOD V3.24)
// File: src/features/departments/department.schema.ts
// ==============================================================================

import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name is required').max(100),
  code: z.string().min(2, 'Department code is required').max(30),
  parentDepartmentId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  description: z.string().max(250).optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const allocateDepartmentModulesSchema = z.object({
  moduleIds: z.array(z.string()).min(1, 'At least one module must be allocated'),
});

export type AllocateDepartmentModulesInput = z.infer<typeof allocateDepartmentModulesSchema>;
