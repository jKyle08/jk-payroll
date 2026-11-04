// ==============================================================================
// JK-PAYROLL: USERS VALIDATION SCHEMAS (ZOD V3.24)
// File: src/features/users/user.schema.ts
// ==============================================================================

import { z } from 'zod';

export const createUserSchema = z.object({
  fullName: z.string().min(2, 'Full name is required').max(100),
  email: z.string().email('Valid email is required'),
  departmentId: z.string().optional().nullable(),
  roleId: z.string().optional().nullable(),
  title: z.string().max(80).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const assignUserPermissionsSchema = z.object({
  permissionIds: z.array(z.string()).default([]),
});

export type AssignUserPermissionsInput = z.infer<typeof assignUserPermissionsSchema>;
