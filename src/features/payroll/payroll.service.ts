// ==============================================================================
// JK-PAYROLL: PAYROLL FEATURE SERVICE
// File: src/features/payroll/payroll.service.ts
// ==============================================================================

import { db } from '../../db/repository.js';
import { PayrollBatch, PayrollItem, ComputePayrollInput, PayrollStatus } from './types.js';
import { AuthUserContext } from '../../types/index.js';

// In-memory collection for payroll demo records
const payrollBatches = new Map<string, PayrollBatch>();

export class PayrollService {
  public computePayroll(user: AuthUserContext, input: ComputePayrollInput): PayrollBatch {
    const batchId = crypto.randomUUID();
    const profiles = Array.from(db.profiles.values()).filter(
      (p) => p.tenantId === user.tenantId && p.isActive
    );

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    const items: PayrollItem[] = profiles.map((p) => {
      const baseSalary = 35000;
      const allowances = 3000;
      const deductions = 1500;
      const tax = (baseSalary + allowances) * 0.12;
      const netPay = baseSalary + allowances - deductions - tax;

      totalGross += baseSalary + allowances;
      totalDeductions += deductions + tax;
      totalNet += netPay;

      const dept = p.departmentId ? db.departments.get(p.departmentId) : undefined;

      return {
        id: crypto.randomUUID(),
        batchId,
        userId: p.id,
        employeeName: p.fullName,
        departmentName: dept?.name || 'General Operations',
        baseSalary,
        allowances,
        deductions,
        tax,
        netPay,
        createdAt: new Date(),
      };
    });

    const batch: PayrollBatch = {
      id: batchId,
      tenantId: user.tenantId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      status: 'Computed',
      totalGross,
      totalDeductions,
      totalNet,
      employeeCount: items.length,
      items,
      computedBy: user.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    payrollBatches.set(batchId, batch);
    return batch;
  }

  public getBatches(tenantId: string): PayrollBatch[] {
    return Array.from(payrollBatches.values()).filter((b) => b.tenantId === tenantId);
  }

  public getBatchById(tenantId: string, id: string): PayrollBatch | undefined {
    const batch = payrollBatches.get(id);
    if (!batch || batch.tenantId !== tenantId) return undefined;
    return batch;
  }

  public approveBatch(tenantId: string, id: string, approverUserId: string): PayrollBatch {
    const batch = payrollBatches.get(id);
    if (!batch || batch.tenantId !== tenantId) {
      throw new Error(`Payroll batch ${id} not found`);
    }

    batch.status = 'Approved';
    batch.approvedBy = approverUserId;
    batch.updatedAt = new Date();
    return batch;
  }
}

export const payrollService = new PayrollService();
