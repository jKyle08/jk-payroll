// ==============================================================================
// JK-PAYROLL: DEPARTMENTS FEATURE SERVICE
// File: src/features/departments/department.service.ts
// ==============================================================================

import { db } from '../../db/repository.js';
import { Department, DepartmentNode, CreateDepartmentInput } from './types.js';

export class DepartmentService {
  public createDepartment(data: CreateDepartmentInput): Department {
    return db.createDepartment(data);
  }

  public getDepartmentById(id: string): Department | undefined {
    return db.getDepartmentById(id);
  }

  public getDepartmentsByTenant(tenantId: string): Department[] {
    return db.getDepartmentsByTenant(tenantId);
  }

  public getDepartmentTree(tenantId: string): DepartmentNode[] {
    return db.getDepartmentTree(tenantId);
  }

  public getDepartmentSubTree(tenantId: string, departmentId: string): Department[] {
    return db.getDepartmentSubTree(tenantId, departmentId);
  }

  public getDepartmentAncestors(tenantId: string, departmentId: string): Department[] {
    return db.getDepartmentAncestors(tenantId, departmentId);
  }
}

export const departmentService = new DepartmentService();
