// ==============================================================================
// JK-PAYROLL: ROLES VALIDATION SCHEMAS (ZOD V3.24)
// File: src/features/roles/role.schema.ts
// ==============================================================================

import { z } from 'zod';

export const roleCodeSchema = z
  .string()
  .trim()
  .min(2, 'Role code must be at least 2 characters')
  .max(64, 'Role code cannot exceed 64 characters')
  .regex(/^[A-Za-z][A-Za-z0-9_]*$/, 'Use letters, numbers and underscores only, starting with a letter')
  .transform((v) => v.toUpperCase());

export const roleTypeEnum = z.enum(['SYSTEM', 'CUSTOM']);

export const createRoleSchema = z.object({
  /** null / omitted => global SYSTEM role (platform administrators only) */
  organizationId: z.string().min(1).nullable().optional().transform((v) => v ?? null),
  code: roleCodeSchema,
  name: z.string().trim().min(2, 'Role name must be at least 2 characters').max(128, 'Role name cannot exceed 128 characters'),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional(),
  roleType: roleTypeEnum.optional(),
  isDefault: z.boolean().default(false),
  isMutable: z.boolean().default(true),
});

export type CreateRoleSchemaInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(128).optional(),
  description: z.string().trim().max(500).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateRoleSchemaInput = z.infer<typeof updateRoleSchema>;

export const roleQuerySchema = z.object({
  search: z.string().optional(),
  organizationId: z.string().optional(),
  roleType: z.enum(['All', 'SYSTEM', 'CUSTOM']).optional().default('All'),
});

export type RoleQueryInput = z.infer<typeof roleQuerySchema>;

export const assignRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  roleId: z.string().min(1, 'Role ID is required'),
});

export type AssignRoleInput = z.infer<typeof assignRoleSchema>;

export const createUserRoleSchema = z.object({
  tenantId: z.string().min(1, 'Organization is required'),
  userId: z.string().min(1, 'User is required'),
  roleId: z.string().min(1, 'Role is required'),
  isActive: z.boolean().default(true),
});

export type CreateUserRoleSchemaInput = z.infer<typeof createUserRoleSchema>;

export const updateUserRoleSchema = z.object({
  tenantId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  roleId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserRoleSchemaInput = z.infer<typeof updateUserRoleSchema>;

export const userRoleQuerySchema = z.object({
  search: z.string().optional(),
  tenantId: z.string().optional(),
  roleId: z.string().optional(),
  status: z.enum(['All', 'Active', 'Inactive']).optional().default('All'),
});

export type UserRoleQueryInput = z.infer<typeof userRoleQuerySchema>;

