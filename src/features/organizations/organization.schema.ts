// ==============================================================================
// JK-PAYROLL: ORGANIZATION VALIDATION SCHEMAS (ZOD V3.24)
// Shared between Client Forms and Express Backend Validation
// File: src/features/organizations/organization.schema.ts
// ==============================================================================

import { z } from 'zod';

export const organizationPlanEnum = z.enum(['Enterprise', 'Standard', 'Starter']);
export const organizationStatusEnum = z.enum(['Active', 'Onboarding', 'Suspended']);

/**
 * Validation schema for provisioning a new organization with root admin
 */
export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name cannot exceed 100 characters'),
  code: z
    .string()
    .min(2, 'Organization code must be at least 2 characters')
    .max(30, 'Organization code cannot exceed 30 characters')
    .regex(/^[A-Za-z0-9-_]+$/, 'Code can only contain letters, numbers, hyphens, and underscores')
    .transform((val) => val.toUpperCase()),
  domain: z
    .string()
    .min(3, 'Domain must be at least 3 characters')
    .max(120, 'Domain cannot exceed 120 characters')
    .optional()
    .or(z.literal('')),
  industry: z.string().max(80).default('Technology & Software'),
  planTier: organizationPlanEnum.default('Enterprise'),
  status: organizationStatusEnum.default('Active'),
  adminMode: z.enum(['new', 'existing']).default('new'),
  // Administrator Assignment
  admin: z.object({
    fullName: z.string().min(2, 'Administrator name is required').max(100),
    email: z.string().email('Valid administrator email address is required'),
    username: z.string().min(3).max(50).optional(),
    title: z.string().max(80).optional().default('Administrator'),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    existingUserId: z.string().optional(),
  }),
  // Initial allocated module codes
  modules: z.array(z.string()).default(['Department', 'EmployeeProfile', 'UserRole']),
  startDate: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() !== '' ? val : null)),
  endDate: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() !== '' ? val : null)),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type CreateOrganizationFormInput = z.input<typeof createOrganizationSchema>;

/**
 * Validation schema for updating organization settings
 */
export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  domain: z.string().min(3).max(120).optional().or(z.literal('')),
  industry: z.string().max(80).optional(),
  planTier: organizationPlanEnum.optional(),
  status: organizationStatusEnum.optional(),
  startDate: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() !== '' ? val : null)),
  endDate: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() !== '' ? val : null)),
  admin: z
    .object({
      fullName: z.string().min(2).max(100).optional(),
      email: z.string().email().optional(),
      title: z.string().max(80).optional(),
    })
    .optional(),
  modules: z.array(z.string()).optional(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

/**
 * Route parameter validation schema
 */
export const organizationIdParamSchema = z.object({
  id: z.string().min(1, 'Organization ID is required'),
});

/**
 * Module entitlement allocation schema
 */
export const updateModulesSchema = z.object({
  moduleCodes: z
    .array(z.string())
    .min(1, 'At least Core platform modules must remain allocated'),
});

export type UpdateModulesInput = z.infer<typeof updateModulesSchema>;

/**
 * Organization directory querying / filtering schema
 */
export const organizationQuerySchema = z.object({
  search: z.string().optional(),
  status: z.union([organizationStatusEnum, z.literal('All')]).optional().default('All'),
  tier: z.union([organizationPlanEnum, z.literal('All')]).optional().default('All'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export type OrganizationQueryInput = z.infer<typeof organizationQuerySchema>;
