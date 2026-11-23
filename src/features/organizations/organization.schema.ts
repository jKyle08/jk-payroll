// ==============================================================================
// JK-PAYROLL: ORGANIZATION VALIDATION SCHEMAS (ZOD V3.24)
// Shared between Client Forms and Express Backend Validation
// File: src/features/organizations/organization.schema.ts
// ==============================================================================

import { z } from 'zod';

export const organizationSectorEnum = z.enum(['Private', 'Public', 'NonProfit']);
export const organizationStatusEnum = z.enum(['Active', 'Onboarding', 'Suspended']);
export const organizationTierEnum = z.enum(['Enterprise', 'Standard', 'Starter']);
export const payFrequencyEnum = z.enum(['Weekly', 'Bi-Weekly', 'Semi-Monthly', 'Monthly']);
export const workModeEnum = z.enum(['OnSite', 'Remote', 'Hybrid']);
export const prorationMethodEnum = z.enum(['CalendarDays', 'WorkingDays', 'FixedHours']);
export const statutoryDeductionSplitEnum = z.enum(['SplitEqually', 'FirstPeriodOnly', 'SecondPeriodOnly']);

// Backward-compatible alias
export const organizationPlanEnum = organizationTierEnum;

/**
 * Settings schemas for payroll, time & attendance, leaves, and security
 */
export const payrollSettingsSchema = z.object({
  standardDailyHours: z.number().positive().default(8),
  standardWorkingDaysPerYear: z.number().positive().default(261),
  prorationMethod: prorationMethodEnum.default('WorkingDays'),
  statutoryDeductionSplit: statutoryDeductionSplitEnum.default('SplitEqually'),
});

export const timeAndAttendanceSettingsSchema = z.object({
  gracePeriodMinutes: z.number().min(0).default(15),
  overtimeMinimumMinutes: z.number().min(0).default(60),
  allowWebClockIn: z.boolean().default(true),
  requireGeofence: z.boolean().default(false),
  geofenceRadiusMeters: z.number().min(0).default(100),
});

export const leavesSettingsSchema = z.object({
  allowNegativeBalance: z.boolean().default(false),
  requireApprovalLevels: z.number().min(1).default(1),
  carryOverLimitDays: z.number().min(0).default(5),
});

export const securitySettingsSchema = z.object({
  enforce2FA: z.boolean().default(false),
  protectPayslipWithPassword: z.boolean().default(true),
  payslipPasswordFormat: z.string().default('BIRTHDATE_YYYYMMDD'),
});

export const organizationSettingsSchema = z.object({
  payroll: payrollSettingsSchema.default({
    standardDailyHours: 8,
    standardWorkingDaysPerYear: 261,
    prorationMethod: 'WorkingDays',
    statutoryDeductionSplit: 'SplitEqually',
  }),
  timeAndAttendance: timeAndAttendanceSettingsSchema.default({
    gracePeriodMinutes: 15,
    overtimeMinimumMinutes: 60,
    allowWebClockIn: true,
    requireGeofence: false,
    geofenceRadiusMeters: 100,
  }),
  leaves: leavesSettingsSchema.default({
    allowNegativeBalance: false,
    requireApprovalLevels: 1,
    carryOverLimitDays: 5,
  }),
  security: securitySettingsSchema.default({
    enforce2FA: false,
    protectPayslipWithPassword: true,
    payslipPasswordFormat: 'BIRTHDATE_YYYYMMDD',
  }),
});

export type OrganizationSettingsInput = z.infer<typeof organizationSettingsSchema>;

/**
 * Date helpers: blank strings become null; an omitted value stays undefined on update
 */
const normalizeDate = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

const createDateField = z.preprocess(normalizeDate, z.string().nullable().optional());
const updateDateField = z.preprocess(
  (value: unknown) => (value === undefined ? undefined : normalizeDate(value)),
  z.string().nullable().optional()
);

/**
 * Validation schema for initial tenant registration / onboarding wizard
 * Target Audience: Public signup / Super Admin onboarding a brand new tenant
 */
const organizationOnboardingBaseSchema = z.object({
  name: z
    .string({ required_error: 'Organization name is required' })
    .trim()
    .superRefine((val, ctx) => {
      if (val.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Organization name is required',
        });
        return;
      }
      if (val.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          minimum: 2,
          type: 'string',
          inclusive: true,
          message: 'Organization name must be at least 2 characters',
        });
        return;
      }
      if (val.length > 150) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_big,
          maximum: 150,
          type: 'string',
          inclusive: true,
          message: 'Organization name cannot exceed 150 characters',
        });
      }
    }),
  code: z
    .string({ required_error: 'Organization code is required' })
    .trim()
    .superRefine((val, ctx) => {
      if (val.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Organization code is required',
        });
        return;
      }
      if (val.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          minimum: 2,
          type: 'string',
          inclusive: true,
          message: 'Organization code must be at least 2 characters',
        });
        return;
      }
      if (val.length > 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_big,
          maximum: 32,
          type: 'string',
          inclusive: true,
          message: 'Organization code cannot exceed 32 characters',
        });
        return;
      }
      if (!/^[A-Za-z0-9-_]+$/.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Code can only contain alphanumeric characters, hyphens, and underscores',
        });
      }
    })
    .transform((val) => val.toUpperCase()),
  slug: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined))
    .pipe(
      z
        .string()
        .min(2)
        .max(64)
        .regex(/^[a-z0-9-_]+$/, 'Slug must be URL-safe (lowercase alphanumeric, hyphens, and underscores)')
        .optional()
    ),
  sector: organizationSectorEnum.default('Private'),
  tier: organizationTierEnum.default('Enterprise'),
  planTier: organizationTierEnum.optional(), // Backwards compatibility for UI
  status: organizationStatusEnum.default('Active'),

  // Localization & Currency Defaults
  currency: z.string().length(3).default('PHP').transform((val) => val.toUpperCase()),
  timezone: z.string().max(64).default('Asia/Manila'),
  countryCode: z.string().length(2).default('PH').transform((val) => val.toUpperCase()),
  defaultPayFrequency: payFrequencyEnum.default('Semi-Monthly'),

  // Initial Root Administrator Bootstrap Account (Always provisions a fresh user account)
  admin: z.object({
    fullName: z
      .string({ required_error: 'Full name is required for the root administrator' })
      .trim()
      .superRefine((val, ctx) => {
        if (val.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Full name is required for the root administrator',
          });
          return;
        }
        if (val.length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_small,
            minimum: 2,
            type: 'string',
            inclusive: true,
            message: 'Name must be at least 2 characters',
          });
          return;
        }
        if (val.length > 100) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_big,
            maximum: 100,
            type: 'string',
            inclusive: true,
            message: 'Name cannot exceed 100 characters',
          });
        }
      }),
    email: z
      .string({ required_error: 'Official email is required' })
      .trim()
      .superRefine((val, ctx) => {
        if (val.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Official email is required',
          });
          return;
        }
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(val)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Valid administrator email address is required',
          });
        }
      }),
    username: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val && val.length > 0 ? val : undefined))
      .pipe(z.string().min(3).max(50).optional()),
    title: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val && val.length > 0 ? val : undefined))
      .pipe(z.string().max(80).optional().default('Administrator')),
    password: z
      .string({ required_error: 'Password is required for the new root administrator account' })
      .superRefine((val, ctx) => {
        if (val.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Password is required for the new root administrator account',
          });
          return;
        }
        if (val.length < 8) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_small,
            minimum: 8,
            type: 'string',
            inclusive: true,
            message: 'Password must be at least 8 characters',
          });
        }
      })
      .optional(),
    confirmPassword: z.string().optional(),
  }),

  // Optional business profile attributes
  legalName: z.string().max(255).optional().nullable(),
  taxId: z.string().max(64).optional().nullable(),
  domain: z.string().min(3).max(120).optional().or(z.literal('')).nullable(),
  industry: z.string().max(100).default('Technology & Software'),

  // Modalities & Statutory IDs
  supportedWorkModes: z.array(workModeEnum).default(['OnSite', 'Remote', 'Hybrid']),
  statutoryIds: z.record(z.string()).default({}),

  // Baseline Organizational Settings
  settings: organizationSettingsSchema.default({
    payroll: {
      standardDailyHours: 8,
      standardWorkingDaysPerYear: 261,
      prorationMethod: 'WorkingDays',
      statutoryDeductionSplit: 'SplitEqually',
    },
    timeAndAttendance: {
      gracePeriodMinutes: 15,
      overtimeMinimumMinutes: 60,
      allowWebClockIn: true,
      requireGeofence: false,
      geofenceRadiusMeters: 100,
    },
    leaves: {
      allowNegativeBalance: false,
      requireApprovalLevels: 1,
      carryOverLimitDays: 5,
    },
    security: {
      enforce2FA: false,
      protectPayslipWithPassword: true,
      payslipPasswordFormat: 'BIRTHDATE_YYYYMMDD',
    },
  }),

  // Initial Modules
  modules: z.array(z.string()).default(['Department', 'EmployeeProfile', 'RolePermission']),

  startDate: createDateField,
  endDate: createDateField,
});

export const organizationOnboardingSchema = organizationOnboardingBaseSchema.superRefine(
  (data, ctx) => {
    if (data.admin.password && data.admin.password.trim().length > 0) {
      if (!data.admin.confirmPassword || data.admin.confirmPassword.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please confirm your root administrator password',
          path: ['admin', 'confirmPassword'],
        });
        return;
      }
      if (data.admin.password !== data.admin.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Passwords do not match',
          path: ['admin', 'confirmPassword'],
        });
      }
    }
  }
);

// Public onboarding is permitted only with a SuperAdmin-issued, one-use link.
// The token is transport authorization, not an organization/department/role selector.
export const organizationOnboardingSubmissionSchema = organizationOnboardingBaseSchema.extend({
  onboardingToken: z.string().min(40).max(200),
  admin: organizationOnboardingBaseSchema.shape.admin.extend({
    password: z
      .string({ required_error: 'Password is required for the new root administrator account' })
      .superRefine((val, ctx) => {
        if (val.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Password is required for the new root administrator account',
          });
          return;
        }
        if (val.length < 8) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_small,
            minimum: 8,
            type: 'string',
            inclusive: true,
            message: 'Password must be at least 8 characters',
          });
        }
      }),
    confirmPassword: z.string({ required_error: 'Please confirm your root administrator password' }),
  }).superRefine((admin, ctx) => {
    if (!admin.confirmPassword || admin.confirmPassword.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please confirm your root administrator password',
        path: ['confirmPassword'],
      });
      return;
    }
    if (admin.password !== admin.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        path: ['confirmPassword'],
      });
    }
  }),
});

// Same trusted first-owner payload, used when a SuperAdmin provisions directly
// instead of sending a registration link.
export const organizationProvisioningSchema = organizationOnboardingBaseSchema.extend({
  admin: organizationOnboardingBaseSchema.shape.admin.extend({
    password: z
      .string({ required_error: 'Password is required for the new root administrator account' })
      .superRefine((val, ctx) => {
        if (val.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Password is required for the new root administrator account',
          });
          return;
        }
        if (val.length < 8) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_small,
            minimum: 8,
            type: 'string',
            inclusive: true,
            message: 'Password must be at least 8 characters',
          });
        }
      }),
    confirmPassword: z.string({ required_error: 'Please confirm your root administrator password' }),
  }).superRefine((admin, ctx) => {
    if (!admin.confirmPassword || admin.confirmPassword.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please confirm your root administrator password',
        path: ['confirmPassword'],
      });
      return;
    }
    if (admin.password !== admin.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        path: ['confirmPassword'],
      });
    }
  }),
});

export const createOnboardingInvitationSchema = z.object({
  email: z.string().email().max(255),
});

export type OrganizationOnboardingSubmission = z.infer<typeof organizationOnboardingSubmissionSchema>;

export type OrganizationOnboardingInput = z.infer<typeof organizationOnboardingSchema>;
export type OrganizationOnboardingFormInput = z.input<typeof organizationOnboardingSchema>;

/**
 * Backward compatibility alias for createOrganizationSchema
 */
export const createOrganizationSchema = organizationOnboardingSchema;
export type CreateOrganizationInput = OrganizationOnboardingInput;
export type CreateOrganizationFormInput = OrganizationOnboardingFormInput;

/**
 * Validation schema for existing tenant administrators updating company profile & operational settings
 * Target Audience: Existing Admin updating company profile and operational settings
 * MUST NOT allow re-registering admin, changing immutable identifiers (id, code, slug), or altering tier/status
 */
export const updateOrganizationSettingsSchema = z.object({
  // Profile / Identity
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(150).optional(),
  legalName: z.string().max(255).optional().nullable(),
  taxId: z.string().max(64).optional().nullable(),
  industry: z.string().max(100).optional(),
  sector: organizationSectorEnum.optional(),
  domain: z.string().min(3).max(120).optional().or(z.literal('')).nullable(),
  logoUrl: z.string().url().optional().nullable(),

  // HR, Localization & Work Modalities
  currency: z.string().length(3).optional().transform((v) => v?.toUpperCase()),
  timezone: z.string().max(64).optional(),
  supportedWorkModes: z.array(workModeEnum).optional(),
  defaultPayFrequency: payFrequencyEnum.optional(),

  // Statutory IDs (Country / Sector specific)
  statutoryIds: z.record(z.string()).optional(),

  // Tenant Settings (JSONB)
  settings: organizationSettingsSchema.deepPartial().optional(),
});

export type UpdateOrganizationSettingsInput = z.infer<typeof updateOrganizationSettingsSchema>;
export type UpdateOrganizationSettingsFormInput = z.input<typeof updateOrganizationSettingsSchema>;

/**
 * Full validation schema for administrative organization updates (SuperAdmin / Management)
 */
export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  code: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[A-Za-z0-9-_]+$/)
    .transform((val) => val.toUpperCase())
    .optional(),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-_]+$/)
    .optional(),
  legalName: z.string().max(255).optional().nullable(),
  taxId: z.string().max(64).optional().nullable(),
  domain: z.string().min(3).max(120).optional().or(z.literal('')).nullable(),
  logoUrl: z.string().url().optional().nullable(),
  industry: z.string().max(100).optional(),
  sector: organizationSectorEnum.optional(),
  tier: organizationTierEnum.optional(),
  planTier: organizationTierEnum.optional(),
  status: organizationStatusEnum.optional(),
  currency: z.string().length(3).optional().transform((v) => v?.toUpperCase()),
  timezone: z.string().max(64).optional(),
  countryCode: z.string().length(2).optional().transform((v) => v?.toUpperCase()),
  defaultPayFrequency: payFrequencyEnum.optional(),
  supportedWorkModes: z.array(workModeEnum).optional(),
  statutoryIds: z.record(z.string()).optional(),
  settings: organizationSettingsSchema.deepPartial().optional(),
  modules: z.array(z.string()).optional(),
  admin: z
    .object({
      fullName: z.string().min(2).max(100).optional(),
      email: z.string().email().optional(),
      title: z.string().max(80).optional(),
    })
    .optional(),
  primaryContactId: z.string().uuid().optional().nullable(),
  startDate: updateDateField,
  endDate: updateDateField,
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
  moduleCodes: z.array(z.string()).optional(),
  moduleIds: z.array(z.string()).optional(),
}).refine(
  (data) => (data.moduleCodes && data.moduleCodes.length > 0) || (data.moduleIds && data.moduleIds.length > 0),
  {
    message: 'At least Core platform modules must remain allocated',
  }
);

export type UpdateModulesInput = z.infer<typeof updateModulesSchema>;

/**
 * Organization directory querying / filtering schema
 */
export const organizationQuerySchema = z.object({
  search: z.string().optional(),
  status: z.union([organizationStatusEnum, z.literal('All')]).optional().default('All'),
  sector: z.union([organizationSectorEnum, z.literal('All')]).optional().default('All'),
  tier: z.union([organizationTierEnum, z.literal('All')]).optional().default('All'),
  planTier: z.union([organizationTierEnum, z.literal('All')]).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export type OrganizationQueryInput = z.infer<typeof organizationQuerySchema>;
