// ==============================================================================
// JK-PAYROLL: DEPARTMENTS VALIDATION SCHEMAS (ZOD V3.24)
// File: src/features/departments/department.schema.ts
// ==============================================================================

import { z } from 'zod';

export const createDepartmentSchema = z.object({
  organizationId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  parentDepartmentId: z.string().uuid().nullable().optional(),
  code: z
    .string()
    .min(2, 'Department code must be at least 2 characters')
    .max(64, 'Department code cannot exceed 64 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Department code may only contain letters, numbers, hyphens, and underscores'),
  name: z
    .string()
    .min(2, 'Department name must be at least 2 characters')
    .max(128, 'Department name cannot exceed 128 characters'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  headUserId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = z.object({
  organizationId: z.string().uuid().optional(),
  parentDepartmentId: z.string().uuid().nullable().optional(),
  code: z
    .string()
    .min(2, 'Department code must be at least 2 characters')
    .max(64, 'Department code cannot exceed 64 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Department code may only contain letters, numbers, hyphens, and underscores')
    .optional(),
  name: z
    .string()
    .min(2, 'Department name must be at least 2 characters')
    .max(128, 'Department name cannot exceed 128 characters')
    .optional(),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  headUserId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

export const departmentQuerySchema = z.object({
  search: z.string().optional(),
  organizationId: z.string().optional(),
  tenantId: z.string().optional(),
  status: z.enum(['All', 'Active', 'Inactive']).optional(),
  depth: z.union([z.string(), z.number()]).optional(),
});

export type DepartmentQueryInput = z.infer<typeof departmentQuerySchema>;

export const allocateDepartmentModulesSchema = z.object({
  moduleIds: z.array(z.string().uuid()).min(1, 'At least one module must be allocated'),
});

export type AllocateDepartmentModulesInput = z.infer<typeof allocateDepartmentModulesSchema>;
