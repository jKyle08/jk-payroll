// ==============================================================================
// JK-PAYROLL: AUDIT LOGS TYPES
// File: src/features/audit-logs/types.ts
// ==============================================================================

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'LOGIN' | 'EXPORT';

export type AuditActorType = 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'SYSTEM';

export interface AuditLogEntry {
  id: string;
  organization_id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_type?: AuditActorType;
  actor_role_name: string | null;
  actor_department_name: string | null;
  module_id: string;
  entity_type: string;
  entity_id: string;
  // Resource aliases for architectural consistency
  resource_type?: string;
  resource_id?: string;
  action: AuditAction;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogsFilterQuery {
  organizationId?: string;
  moduleId?: string;
  action?: AuditAction;
  actorId?: string;
  actorType?: AuditActorType;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TrustedActor {
  actorId: string | null;
  actorName: string;
  actorEmail: string | null;
  actorType: AuditActorType;
  actorRoleName?: string | null;
  actorDepartmentName?: string | null;
  organizationId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface RecordAuditLogInput {
  organizationId?: string | null;
  actor?: TrustedActor | null;
  module: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}
