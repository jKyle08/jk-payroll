// ==============================================================================
// JK-PAYROLL: LEAVE MANAGEMENT FEATURE CONTROLLER
// File: src/features/leave-management/leave.controller.ts
// ==============================================================================

import { Request, Response } from 'express';
import { z } from 'zod';
import { leaveService } from './leave.service.js';
import { DataScope } from '../../types/index.js';

const CreateTypeOfLeaveSchema = z.object({
  code: z.string().min(2).max(32),
  name: z.string().min(2).max(128),
  daysAllowed: z.number().nonnegative(),
});

const CreateLeaveRequestSchema = z.object({
  typeOfLeaveId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
  daysCount: z.number().positive(),
  reason: z.string().optional(),
});

export class LeaveController {
  // ----------------------------------------------------------------------------
  // TypeOfLeave
  // ----------------------------------------------------------------------------
  public async createTypeOfLeave(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const parsed = CreateTypeOfLeaveSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
        return;
      }

      const item = leaveService.createTypeOfLeave(user.tenantId, parsed.data);
      res.status(201).json({ message: 'Leave type created successfully', leaveType: item });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  public async getTypeOfLeaveList(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const list = leaveService.getTypeOfLeaveList(user.tenantId);
      res.status(200).json({ tenantId: user.tenantId, typesOfLeave: list });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ----------------------------------------------------------------------------
  // RequestForLeave (with Data Scoping)
  // ----------------------------------------------------------------------------
  public async createLeaveRequest(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const parsed = CreateLeaveRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
        return;
      }

      const item = leaveService.createLeaveRequest(user, parsed.data);
      res.status(201).json({ message: 'Leave request submitted successfully', leaveRequest: item });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  public async getLeaveRequests(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const requestedScope = (req.query.scope as DataScope) || 'Self';

      const { scopeApplied, records } = leaveService.getLeaveRequests(user, requestedScope);

      res.status(200).json({
        tenantId: user.tenantId,
        scopeApplied,
        count: records.length,
        leaveRequests: records,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public async approveLeaveRequest(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;
      const approved = leaveService.approveLeaveRequest(user.tenantId, id, user.userId);
      res.status(200).json({ message: 'Leave request approved', leaveRequest: approved });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const leaveController = new LeaveController();
