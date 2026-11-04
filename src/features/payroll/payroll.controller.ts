// ==============================================================================
// JK-PAYROLL: PAYROLL FEATURE CONTROLLER
// File: src/features/payroll/payroll.controller.ts
// ==============================================================================

import { Request, Response } from 'express';
import { z } from 'zod';
import { payrollService } from './payroll.service.js';

const ComputePayrollSchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  departmentId: z.string().uuid().optional(),
});

export class PayrollController {
  public async computePayroll(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const parsed = ComputePayrollSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
        return;
      }

      const batch = payrollService.computePayroll(user, parsed.data);
      res.status(201).json({ message: 'Payroll computed successfully', batch });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  public async getBatches(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const batches = payrollService.getBatches(user.tenantId);
      res.status(200).json({ tenantId: user.tenantId, batches });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public async getBatch(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;
      const batch = payrollService.getBatchById(user.tenantId, id);
      if (!batch) {
        res.status(404).json({ error: `Payroll batch ${id} not found` });
        return;
      }
      res.status(200).json({ batch });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  public async approveBatch(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;
      const approved = payrollService.approveBatch(user.tenantId, id, user.userId);
      res.status(200).json({ message: 'Payroll batch approved', batch: approved });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const payrollController = new PayrollController();
