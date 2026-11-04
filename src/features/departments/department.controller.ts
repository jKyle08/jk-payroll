// ==============================================================================
// JK-PAYROLL: DEPARTMENTS FEATURE CONTROLLER
// File: src/features/departments/department.controller.ts
// ==============================================================================

import { Request, Response } from 'express';
import { z } from 'zod';
import { departmentService } from './department.service.js';
import { permissionService } from '../access-control/services/permission.service.js';

const CreateDepartmentSchema = z.object({
  code: z.string().min(2).max(64),
  name: z.string().min(2).max(255),
  parentDepartmentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

const AllocateDeptModulesSchema = z.object({
  moduleIds: z.array(z.string().uuid()),
});

export class DepartmentController {
  public async createDepartment(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const parsed = CreateDepartmentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
        return;
      }

      const dept = departmentService.createDepartment({
        tenantId,
        parentDepartmentId: parsed.data.parentDepartmentId,
        code: parsed.data.code,
        name: parsed.data.name,
        isActive: parsed.data.isActive,
      });

      res.status(201).json({ message: 'Department created successfully', department: dept });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  public async getDepartmentTree(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const tree = departmentService.getDepartmentTree(tenantId);
      res.status(200).json({ tenantId, departmentTree: tree });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  public async getDepartment(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const dept = departmentService.getDepartmentById(id);
      if (!dept) {
        res.status(404).json({ error: `Department ${id} not found` });
        return;
      }
      res.status(200).json({ department: dept });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  public async getDepartmentSubTree(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const departmentId = req.params.id as string;
      const subTree = departmentService.getDepartmentSubTree(tenantId, departmentId);
      res.status(200).json({ departmentId, subTree });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  public async allocateDepartmentModules(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const departmentId = req.params.id as string;
      const parsed = AllocateDeptModulesSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
        return;
      }

      const allocated = permissionService.allocateDepartmentModules(
        tenantId,
        departmentId,
        parsed.data.moduleIds
      );

      res.status(200).json({
        message: 'Department modules allocated successfully',
        departmentId,
        allocatedModules: allocated,
      });
    } catch (error: any) {
      // 400 Bad Request on Tier 1 violation (module not enabled for tenant)
      res.status(400).json({ error: error.message });
    }
  }
}

export const departmentController = new DepartmentController();
