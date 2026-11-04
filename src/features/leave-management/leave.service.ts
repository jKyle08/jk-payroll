// ==============================================================================
// JK-PAYROLL: LEAVE MANAGEMENT FEATURE SERVICE
// File: src/features/leave-management/leave.service.ts
// ==============================================================================

import { db } from '../../db/repository.js';
import {
  TypeOfLeave,
  LeaveRequest,
  CreateTypeOfLeaveInput,
  CreateLeaveRequestInput,
} from './types.js';
import { AuthUserContext, DataScope } from '../../types/index.js';

export class LeaveService {
  // ----------------------------------------------------------------------------
  // TypeOfLeave
  // ----------------------------------------------------------------------------
  public createTypeOfLeave(tenantId: string, data: CreateTypeOfLeaveInput): TypeOfLeave {
    return db.createTypeOfLeave(tenantId, data);
  }

  public getTypeOfLeaveList(tenantId: string): TypeOfLeave[] {
    return db.getTypeOfLeaveByTenant(tenantId);
  }

  // ----------------------------------------------------------------------------
  // RequestForLeave (with Data Scoping)
  // ----------------------------------------------------------------------------
  public createLeaveRequest(
    user: AuthUserContext,
    input: CreateLeaveRequestInput
  ): LeaveRequest {
    if (!user.departmentId) {
      throw new Error('Cannot create leave request without assigned department');
    }

    return db.createLeaveRequest(user.tenantId, {
      departmentId: user.departmentId,
      userId: user.userId,
      typeOfLeaveId: input.typeOfLeaveId,
      startDate: input.startDate,
      endDate: input.endDate,
      daysCount: input.daysCount,
      reason: input.reason,
    });
  }

  public getLeaveRequests(
    user: AuthUserContext,
    scope: DataScope = 'Self'
  ): { scopeApplied: DataScope; records: LeaveRequest[] } {
    let effectiveScope: DataScope = scope;
    if (scope === 'Tenant' && !user.isTenantAdmin && !user.isSuperAdmin) {
      effectiveScope = 'EntireDepartment';
    }

    const allTenantRequests = db.getLeaveRequestsByTenant(user.tenantId);

    // Apply strict scope filter
    let filtered: LeaveRequest[] = [];

    if (effectiveScope === 'Tenant') {
      filtered = allTenantRequests;
    } else if (!user.departmentId) {
      filtered = allTenantRequests.filter((r) => r.userId === user.userId);
    } else if (effectiveScope === 'Self') {
      filtered = allTenantRequests.filter((r) => r.userId === user.userId);
    } else if (effectiveScope === 'SubDepartment') {
      filtered = allTenantRequests.filter((r) => r.departmentId === user.departmentId);
    } else if (effectiveScope === 'EntireDepartment') {
      const subTree = db.getDepartmentSubTree(user.tenantId, user.departmentId);
      const allowedIds = new Set(subTree.map((d) => d.id));
      filtered = allTenantRequests.filter((r) => allowedIds.has(r.departmentId));
    } else {
      filtered = allTenantRequests.filter((r) => r.userId === user.userId);
    }

    return {
      scopeApplied: effectiveScope,
      records: filtered,
    };
  }

  public approveLeaveRequest(
    tenantId: string,
    requestId: string,
    approverUserId: string
  ): LeaveRequest {
    const request = db.leaveRequests.get(requestId);
    if (!request || request.tenantId !== tenantId) {
      throw new Error(`Leave request ${requestId} not found`);
    }

    request.status = 'Approved';
    request.approvedBy = approverUserId;
    request.approvedAt = new Date();
    request.updatedAt = new Date();

    return request;
  }
}

export const leaveService = new LeaveService();
