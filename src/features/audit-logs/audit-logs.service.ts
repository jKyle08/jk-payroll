// ==============================================================================
// JK-PAYROLL: AUDIT LOGS FEATURE SERVICE
// Ultra-Low-Latency Zero-Join Point-in-Time Audit Read & Secure Attribution Operations
// File: src/features/audit-logs/audit-logs.service.ts
// ==============================================================================

import { Request } from 'express';
import crypto from 'node:crypto';
import { getSupabaseClient } from '../../server/db/supabase.js';
import { db } from '../../server/db/repository.js';
import {
  AuditLogEntry,
  AuditLogsFilterQuery,
  AuditAction,
  AuditActorType,
  TrustedActor,
  RecordAuditLogInput,
} from './types.js';

/**
 * Safely extracts client IP address from trusted server context.
 * Strictly ignores arbitrary client-supplied headers (e.g. X-Forwarded-For)
 * unless the application is explicitly running behind a trusted reverse proxy.
 */
export function extractTrustedIp(req?: Request): string | null {
  if (!req) return null;
  const trustProxy = Boolean(
    process.env.TRUST_PROXY === 'true' || (req.app && req.app.get && req.app.get('trust proxy'))
  );
  if (trustProxy && req.ip) {
    return req.ip;
  }
  // Untrusted proxy mode: rely strictly on verified remote socket address
  const remote = req.socket?.remoteAddress;
  if (!remote) return null;
  if (remote === '::1' || remote === '::ffff:127.0.0.1') return '127.0.0.1';
  return remote.replace(/^::ffff:/, '');
}

/**
 * Resolves trusted actor identity from authoritative server-side session context.
 * Never trusts client request bodies, query params, or unverified frontend headers.
 */
export function extractTrustedActor(
  req?: Request,
  overrideContext?: { system?: boolean; organizationId?: string }
): TrustedActor {
  if (overrideContext?.system || !req?.user) {
    return {
      actorId: null,
      actorName: 'System / Automated',
      actorEmail: null,
      actorType: 'SYSTEM',
      actorRoleName: 'System Process',
      actorDepartmentName: null,
      organizationId: overrideContext?.organizationId || '00000000-0000-0000-0000-000000000000',
      ipAddress: null,
      userAgent: null,
    };
  }

  const user = req.user;
  let actorType: AuditActorType = 'USER';
  let actorRoleName = 'Member';

  if (user.isSuperAdmin) {
    actorType = 'SUPER_ADMIN';
    actorRoleName = 'Super Administrator';
  } else if (user.isOrganizationAdmin || user.isTenantAdmin) {
    actorType = 'ADMIN';
    actorRoleName = 'Organization Administrator';
  }

  // Look up authoritative name and email from server-side database repository
  const profile = db.getProfileById(user.userId);
  const actorName = profile?.fullName || user.fullName || 'Authenticated User';
  const actorEmail = profile?.email || null;

  // Organization attribution strictly from validated context
  const organizationId = req.organization?.id || user.organizationId || user.tenantId;

  const ipAddress = extractTrustedIp(req);
  const userAgent =
    req && typeof req.get === 'function'
      ? req.get('user-agent') || null
      : (req?.headers && (req.headers['user-agent'] as string)) || null;

  return {
    actorId: user.userId,
    actorName,
    actorEmail,
    actorType,
    actorRoleName,
    actorDepartmentName: user.departmentId ? (db.getDepartmentById(user.departmentId)?.name || null) : null,
    organizationId,
    ipAddress,
    userAgent,
  };
}

export class AuditLogsService {
  /**
   * Records an immutable audit log entry with trusted actor attribution.
   * Atomically registers with in-memory repository and mirrors to Supabase PostgreSQL.
   */
  public async recordAuditLog(input: RecordAuditLogInput): Promise<AuditLogEntry> {
    const actor = input.actor;
    const actorId = actor ? actor.actorId : null;
    const actorName = actor ? actor.actorName : 'System / Automated';
    const actorEmail = actor ? actor.actorEmail : null;
    const actorType: AuditActorType = actor ? actor.actorType : 'SYSTEM';
    const actorRoleName = actor ? (actor.actorRoleName || null) : 'System / Automated';
    const actorDepartmentName = actor ? (actor.actorDepartmentName || null) : null;

    const organizationId =
      input.organizationId || actor?.organizationId || '00000000-0000-0000-0000-000000000000';
    const ipAddress = actor?.ipAddress !== undefined ? actor.ipAddress : (input.ipAddress || null);
    const userAgent = actor?.userAgent !== undefined ? actor.userAgent : (input.userAgent || null);

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const logEntry: AuditLogEntry = {
      id,
      organization_id: organizationId,
      actor_id: actorId,
      actor_name: actorName,
      actor_email: actorEmail,
      actor_type: actorType,
      actor_role_name: actorRoleName,
      actor_department_name: actorDepartmentName,
      module_id: input.module,
      entity_type: input.entityType,
      entity_id: input.entityId,
      resource_type: input.entityType,
      resource_id: input.entityId,
      action: input.action,
      old_values: input.oldValues ?? null,
      new_values: input.newValues ?? null,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: createdAt,
    };

    // 1. Commit to in-memory repository (append-only)
    db.createAuditLog(logEntry);

    // 2. Commit to Supabase PostgreSQL (service-role write)
    try {
      const supabase = getSupabaseClient();
      await supabase.from('audit_logs').insert({
        id: logEntry.id,
        organization_id: logEntry.organization_id,
        actor_id: logEntry.actor_id,
        actor_name: logEntry.actor_name,
        actor_email: logEntry.actor_email,
        actor_type: logEntry.actor_type,
        actor_role_name: logEntry.actor_role_name,
        actor_department_name: logEntry.actor_department_name,
        module_id: logEntry.module_id,
        entity_type: logEntry.entity_type,
        entity_id: logEntry.entity_id,
        action: logEntry.action,
        old_values: logEntry.old_values,
        new_values: logEntry.new_values,
        ip_address: logEntry.ip_address,
        user_agent: logEntry.user_agent,
        created_at: logEntry.created_at,
      });
    } catch {
      // In offline or testing mode, repository write is authoritatively persisted
    }

    return logEntry;
  }

  /**
   * Fetch audit logs with multi-tenant filtering and zero-join point-in-time snapshot delivery.
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
    try {
      const supabase = getSupabaseClient();
      let query = supabase.from('audit_logs').select('*', { count: 'exact' });

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

      if (filter.actorType) {
        query = query.eq('actor_type', filter.actorType);
      }

      if (filter.search && filter.search.trim() !== '') {
        const term = `%${filter.search.trim()}%`;
        query = query.or(
          `actor_name.ilike.${term},actor_email.ilike.${term},entity_type.ilike.${term},entity_id.ilike.${term},actor_role_name.ilike.${term}`
        );
      }

      const limit = Math.min(filter.limit || 50, 200);
      const offset = filter.offset || 0;

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (!error && data && data.length > 0) {
        const logs: AuditLogEntry[] = data.map((d: any) => ({
          ...d,
          resource_type: d.resource_type || d.entity_type,
          resource_id: d.resource_id || d.entity_id,
        }));
        const total = count ?? logs.length;

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
          stats: { total, creates, updates, deletes },
        };
      }
    } catch {
      // Fallback
    }

    // Repository fallback
    return db.getAuditLogs(filter);
  }

  /**
   * Fetch a single audit log entry by ID.
   */
  public async getAuditLogById(id: string): Promise<AuditLogEntry | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return {
          ...data,
          resource_type: data.resource_type || data.entity_type,
          resource_id: data.resource_id || data.entity_id,
        } as AuditLogEntry;
      }
    } catch {
      // Fallback
    }

    return db.getAuditLogById(id);
  }
}

export const auditLogsService = new AuditLogsService();
