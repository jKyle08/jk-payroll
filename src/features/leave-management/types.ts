// ==============================================================================
// JK-PAYROLL: LEAVE MANAGEMENT FEATURE TYPES
// File: src/features/leave-management/types.ts
// ==============================================================================

import { DataScope, TypeOfLeave, LeaveRequest } from '../../types/index.js';

export { TypeOfLeave, LeaveRequest, DataScope };

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface CreateTypeOfLeaveInput {
  code: string;
  name: string;
  daysAllowed: number;
  isActive?: boolean;
}

export interface CreateLeaveRequestInput {
  typeOfLeaveId: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason?: string;
}

export interface ScopedLeaveQuery {
  scope?: DataScope;
}
