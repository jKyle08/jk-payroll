// ==============================================================================
// JK-PAYROLL: AUDIT LOGS TYPES
// File: src/features/audit-logs/types.ts
// ==============================================================================

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'LOGIN' | 'EXPORT';

export interface AuditLogEntry {
  id: string;
  organization_id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_role_name: string | null;
  actor_department_name: string | null;
  module_id: string;
  entity_type: string;
  entity_id: string;
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
  search?: string;
  limit?: number;
  offset?: number;
}

