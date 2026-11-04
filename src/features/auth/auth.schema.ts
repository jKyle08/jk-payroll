// ==============================================================================
// JK-PAYROLL: AUTH VALIDATION SCHEMAS (ZOD V3.24)
// File: src/features/auth/auth.schema.ts
// ==============================================================================

import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  tenantId: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
