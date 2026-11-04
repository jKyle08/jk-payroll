// ==============================================================================
// JK-PAYROLL: AUDIT LOGS FEATURE SERVICE
// Ultra-Low-Latency Zero-Join Point-in-Time Audit Read Operations
// File: src/features/audit-logs/audit-logs.service.ts
// ==============================================================================

import { getSupabaseClient } from '../../db/supabase.js';
import { AuditLogEntry, AuditLogsFilterQuery } from './types.js';

export class AuditLogsService {
  /**
   * Fetch audit logs with filtering and zero-join point-in-time snapshot delivery.
   */
  public async getAuditLogs(filter: AuditLogsFilterQuery): Promise<{
    logs: AuditLogEntry[];
    total: number;
    stats: {
      total: number;
      creates: number;
      updates: number;
      deletes: number;
    };
  }> {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    if (filter.organizationId && filter.organizationId !== 'All') {
      query = query.eq('organization_id', filter.organizationId);
    }

    if (filter.moduleId && filter.moduleId !== 'All') {
      query = query.eq('module_id', filter.moduleId);
    }

    if (filter.action && filter.action !== ('All' as any)) {
      query = query.eq('action', filter.action);
    }

    if (filter.actorId) {
      query = query.eq('actor_id', filter.actorId);
    }

    if (filter.search && filter.search.trim() !== '') {
      const term = `%${filter.search.trim()}%`;
      query = query.or(`actor_name.ilike.${term},actor_email.ilike.${term},entity_type.ilike.${term},entity_id.ilike.${term},actor_role_name.ilike.${term}`);
    }

    const limit = Math.min(filter.limit || 50, 200);
    const offset = filter.offset || 0;

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching audit logs from Supabase:', error);
      throw new Error(`Failed to retrieve audit logs: ${error.message}`);
    }

    const logs: AuditLogEntry[] = (data || []) as AuditLogEntry[];
    const total = count ?? logs.length;

    // Calculate quick stats
    let creates = 0;
    let updates = 0;
    let deletes = 0;

    for (const log of logs) {
      if (log.action === 'CREATE') creates++;
      else if (log.action === 'UPDATE') updates++;
      else if (log.action === 'DELETE') deletes++;
    }

    return {
      logs,
      total,
      stats: {
        total,
        creates,
        updates,
        deletes,
      },
    };
  }

  /**
   * Fetch a single audit log entry by ID.
   */
  public async getAuditLogById(id: string): Promise<AuditLogEntry | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to retrieve audit log details: ${error.message}`);
    }

    return data as AuditLogEntry | null;
  }
}

export const auditLogsService = new AuditLogsService();

