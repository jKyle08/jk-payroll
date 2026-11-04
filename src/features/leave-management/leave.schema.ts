// ==============================================================================
// JK-PAYROLL: LEAVE MANAGEMENT VALIDATION SCHEMAS (ZOD V3.24)
// File: src/features/leave-management/leave.schema.ts
// ==============================================================================

import { z } from 'zod';

export const createTypeOfLeaveSchema = z.object({
  name: z.string().min(2, 'Leave type name is required').max(100),
  code: z.string().min(2, 'Leave code is required').max(30),
  daysAllowed: z.coerce.number().positive('Days allowed must be greater than 0'),
  isPaid: z.boolean().default(true),
});

export type CreateTypeOfLeaveInput = z.infer<typeof createTypeOfLeaveSchema>;

export const createLeaveRequestSchema = z.object({
  typeOfLeaveId: z.string().min(1, 'Type of leave is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().max(500).optional(),
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

export const updateLeaveStatusSchema = z.object({
  status: z.enum(['Approved', 'Rejected', 'Pending']),
  rejectionReason: z.string().optional(),
});

export type UpdateLeaveStatusInput = z.infer<typeof updateLeaveStatusSchema>;
