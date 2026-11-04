// ==============================================================================
// JK-PAYROLL: PAYROLL VALIDATION SCHEMAS (ZOD V3.24)
// File: src/features/payroll/payroll.schema.ts
// ==============================================================================

import { z } from 'zod';

export const computePayrollSchema = z.object({
  periodStart: z.string().min(1, 'Period start date is required'),
  periodEnd: z.string().min(1, 'Period end date is required'),
  departmentId: z.string().optional(),
});

export type ComputePayrollInput = z.infer<typeof computePayrollSchema>;

export const processPayrollRunSchema = z.object({
  payrollRunId: z.string().min(1, 'Payroll run ID is required'),
  action: z.enum(['approve', 'release', 'cancel']),
});

export type ProcessPayrollRunInput = z.infer<typeof processPayrollRunSchema>;
