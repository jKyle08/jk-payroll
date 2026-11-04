// ==============================================================================
// JK-PAYROLL: DEPARTMENTS FEATURE CONTROLLER
// File: src/features/departments/department.controller.ts
// ==============================================================================

import { Request, Response } from 'express';
import { departmentService } from './department.service.js';
import { permissionService } from '../access-control/services/permission.service.js';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  departmentQuerySchema,
  allocateDepartmentModulesSchema,
} from './department.schema.js';

export class DepartmentController {
  /**
   * GET /api/departments
   * List departments with query filters (search, organizationId, status, depth) and KPI stats
   */
  public async listDepartments(req: Request, res: Response): Promise<void> {
    try {
      const parsed = departmentQuerySchema.safeParse(req.query);
      const filters = parsed.success ? parsed.data : undefined;
      const actor = req.user
        ? {
            isSuperAdmin: (req.user as any).isSuperAdmin ?? false,
            tenantId: (req.user as any).tenantId,
          }
        : undefined;

      const result = departmentService.listDepartments(filters, actor);

      res.status(200).json({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          activeCount: result.activeCount,
          rootCount: result.rootCount,
          subCount: result.subCount,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to list departments' });
    }
  }

  /**
   * GET /api/departments/:id
   * Get single department by ID with enriched hierarchy metadata
   */
  public async getDepartment(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const dept = departmentService.getDepartmentById(id);
      if (!dept) {
        res.status(404).json({ success: false, error: `Department '${id}' not found` });
        return;
      }
      res.status(200).json({ success: true, department: dept, data: dept });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to retrieve department' });
    }
  }

  /**
   * POST /api/departments
   * Create new department (Head or Sub-department)
   */
  public async createDepartment(req: Request, res: Response): Promise<void> {
    try {
      const actor = req.user
        ? {
            isSuperAdmin: (req.user as any).isSuperAdmin ?? false,
            tenantId: (req.user as any).tenantId,
          }
        : undefined;

      const parsed = createDepartmentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Validation Error', details: parsed.error.format() });
        return;
      }

      const dept = departmentService.createDepartment(
        {
          organizationId: parsed.data.organizationId || parsed.data.tenantId,
          parentDepartmentId: parsed.data.parentDepartmentId,
          code: parsed.data.code,
          name: parsed.data.name,
          description: parsed.data.description,
          headUserId: parsed.data.headUserId,
          isActive: parsed.data.isActive,
        },
        actor
      );

      res.status(201).json({
        success: true,
        message: 'Department created successfully',
        department: dept,
        data: dept,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to create department' });
    }
  }

  /**
   * PUT /api/departments/:id
   * Update department details, parent hierarchy, head lead, or lifecycle status
   */
  public async updateDepartment(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const actor = req.user
        ? {
            isSuperAdmin: (req.user as any).isSuperAdmin ?? false,
            tenantId: (req.user as any).tenantId,
          }
        : undefined;

      const parsed = updateDepartmentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Validation Error', details: parsed.error.format() });
        return;
      }

      const updated = departmentService.updateDepartment(id, parsed.data, actor);
      res.status(200).json({
        success: true,
        message: 'Department updated successfully',
        department: updated,
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to update department' });
    }
  }

  /**
   * DELETE /api/departments/:id
   * Delete department (enforces ON DELETE RESTRICT on sub-departments)
   */
  public async deleteDepartment(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const actor = req.user
        ? {
            isSuperAdmin: (req.user as any).isSuperAdmin ?? false,
            tenantId: (req.user as any).tenantId,
          }
        : undefined;

      const success = departmentService.deleteDepartment(id, actor);
      if (!success) {
        res.status(404).json({ success: false, error: `Department '${id}' not found` });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Department deleted successfully',
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to delete department' });
    }
  }

  /**
   * GET /api/departments/tree
   * Get recursive department tree
   */
  public async getDepartmentTree(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req.query.organizationId as string) || (req.query.tenantId as string) || req.user?.tenantId;
      if (!tenantId) {
        res.status(400).json({ success: false, error: 'Organization ID is required' });
        return;
      }
      const tree = departmentService.getDepartmentTree(tenantId);
      res.status(200).json({ success: true, tenantId, departmentTree: tree, data: tree });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to retrieve department tree' });
    }
  }

  /**
   * GET /api/departments/:id/sub-tree
   * Get subtree rooted at department :id
   */
  public async getDepartmentSubTree(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req.query.organizationId as string) || (req.query.tenantId as string) || req.user?.tenantId;
      const departmentId = req.params.id as string;
      const subTree = departmentService.getDepartmentSubTree(tenantId || '', departmentId);
      res.status(200).json({ success: true, departmentId, subTree, data: subTree });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to retrieve subtree' });
    }
  }

  /**
   * PUT /api/departments/:id/modules
   * Allocate modules to a department
   */
  public async allocateDepartmentModules(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId || (req.body.organizationId as string);
      const departmentId = req.params.id as string;
      const parsed = allocateDepartmentModulesSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Validation Error', details: parsed.error.format() });
        return;
      }

      const allocated = permissionService.allocateDepartmentModules(
        tenantId,
        departmentId,
        parsed.data.moduleIds
      );

      res.status(200).json({
        success: true,
        message: 'Department modules allocated successfully',
        departmentId,
        allocatedModules: allocated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

export const departmentController = new DepartmentController();
