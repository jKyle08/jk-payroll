// ==============================================================================
// JK-PAYROLL: PAYROLL FEATURE TYPES
// File: src/features/payroll/types.ts
// ==============================================================================

export type PayrollStatus = 'Draft' | 'Computed' | 'Approved' | 'Dispatched';

export interface PayrollItem {
  id: string;
  batchId: string;
  userId: string;
  employeeName: string;
  departmentName: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  tax: number;
  netPay: number;
  createdAt: Date;
}

export interface PayrollBatch {
  id: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  status: PayrollStatus;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
  items?: PayrollItem[];
  computedBy: string;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComputePayrollInput {
  periodStart: string;
  periodEnd: string;
  departmentId?: string;
}
