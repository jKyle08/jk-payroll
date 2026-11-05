// ==============================================================================
// JK-PAYROLL: AUDIT LOG DETAIL & FIELD-LEVEL DIFF MODAL
// File: src/features/audit-logs/components/AuditLogDetailModal.tsx
// ==============================================================================

import React, { useState } from 'react';
import {
  X,
  FileCheck2,
  Globe,
  Shield,
  Building2,
  User,
  Clock,
  Copy,
  Check,
  Code2,
  ArrowRight,
} from 'lucide-react';
import { AuditAction, AuditLogEntry } from '../types.js';

export interface AuditLogDetailModalProps {
  log: AuditLogEntry | null;
  organizationName?: string;
  onClose: () => void;
}

const INTERNAL_ID_KEYS = new Set([
  'id',
  'organization_id',
  'organizationId',
  'tenant_id',
  'tenantId',
  'user_id',
  'userId',
  'role_id',
  'roleId',
  'actor_id',
  'actorId',
  'entity_id',
  'entityId',
  'parent_department_id',
  'parentDepartmentId',
  'head_user_id',
  'headUserId',
]);

export const isInternalIdField = (key: string): boolean => {
  if (INTERNAL_ID_KEYS.has(key)) return true;
  if (key.endsWith('_id') || key.endsWith('Id')) return true;
  return false;
};

export const sanitizeSnapshotObject = (
  obj: Record<string, any> | null | undefined
): Record<string, any> | null => {
  if (!obj || typeof obj !== 'object') return null;
  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (isInternalIdField(k)) continue;
    cleaned[k] = v;
  }
  return cleaned;
};

export const getEntityDisplayName = (log: AuditLogEntry): string => {
  const nw = log.new_values || {};
  const old = log.old_values || {};
  const label =
    nw.name ||
    old.name ||
    nw.fullName ||
    old.fullName ||
    nw.userName ||
    old.userName ||
    nw.roleName ||
    old.roleName ||
    nw.assigneeName ||
    old.assigneeName ||
    nw.code ||
    old.code ||
    nw.slug ||
    old.slug;
  if (label) return String(label);
  return log.entity_type;
};

const getActionBadgeStyles = (action: AuditAction) => {
  switch (action) {
    case 'CREATE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
    case 'UPDATE':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
    case 'DELETE':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
    case 'RESTORE':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
    case 'LOGIN':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800';
    case 'EXPORT':
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
};

const formatValue = (val: unknown): string => {
  if (val === undefined || val === null) return '—';
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val);
};

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({
  log,
  organizationName,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!log) return null;

  const oldObj = sanitizeSnapshotObject(log.old_values);
  const newObj = sanitizeSnapshotObject(log.new_values);

  const allDiffKeys = Array.from(
    new Set([
      ...(oldObj ? Object.keys(oldObj) : []),
      ...(newObj ? Object.keys(newObj) : []),
    ])
  );

  const sanitizedLogForCopy = {
    action: log.action,
    module: log.module_id,
    entityType: log.entity_type,
    targetRecord: getEntityDisplayName(log),
    organization: organizationName || 'Apex Health Systems',
    actorName: log.actor_name || 'System Automated Process',
    actorEmail: log.actor_email || 'system@paypulse.internal',
    actorRole: log.actor_role_name || 'Super Admin',
    actorDepartment: log.actor_department_name || 'Global',
    ipAddress: log.ip_address || '127.0.0.1',
    createdAt: log.created_at,
    oldValues: oldObj,
    newValues: newObj,
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(sanitizedLogForCopy, null, 2)
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignore
    }
  };

  const formattedUtc = new Date(log.created_at).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-detail-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl border border-[#E5E7EB] dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#F8FAFC] dark:bg-slate-800/60 border-b border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <FileCheck2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="audit-detail-modal-title"
                  className="text-sm font-bold text-[#111827] dark:text-white truncate"
                >
                  Point-in-Time Immutable Audit Record
                </h2>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getActionBadgeStyles(
                    log.action
                  )}`}
                >
                  {log.action}
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#6B7280] dark:text-slate-400 truncate mt-0.5">
                {getEntityDisplayName(log)} • {formattedUtc}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#6B7280] hover:text-[#111827] dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Snapshot Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Actor Snapshot Card */}
            <div className="p-3.5 rounded-xl bg-[#FBFBFC] dark:bg-slate-800/50 border border-[#E5E7EB] dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  Actor Snapshot (At Mutation)
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                  Zero-Join Frozen
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#111827] dark:text-white">
                  {log.actor_name || 'System Automated Process'}
                </p>
                <p className="text-[11px] font-mono text-[#6B7280] dark:text-slate-400">
                  {log.actor_email || 'system@paypulse.internal'}
                </p>
              </div>
              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 font-medium">
                  <Shield className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  {log.actor_role_name || 'Super Admin'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-slate-300 font-medium">
                  <Building2 className="w-3 h-3 text-slate-500" />
                  {log.actor_department_name || 'Executive / Global'}
                </span>
              </div>
            </div>

            {/* Target Entity & Network Card */}
            <div className="p-3.5 rounded-xl bg-[#FBFBFC] dark:bg-slate-800/50 border border-[#E5E7EB] dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-slate-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  Target Entity &amp; Network Context
                </span>
                <span className="text-[10px] font-mono font-semibold text-[#0F172A] dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {log.module_id}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#6B7280] dark:text-slate-400">
                    Entity Type:
                  </span>
                  <span className="font-semibold text-[#111827] dark:text-white">
                    {log.entity_type}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#6B7280] dark:text-slate-400">
                    Target Record:
                  </span>
                  <span className="font-semibold text-[#0F172A] dark:text-slate-200 truncate max-w-[200px]">
                    {getEntityDisplayName(log)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#6B7280] dark:text-slate-400">
                    Organization:
                  </span>
                  <span className="font-semibold text-[#111827] dark:text-white truncate max-w-[200px]">
                    {organizationName || 'Apex Health Systems'}
                  </span>
                </div>
              </div>
              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-[#6B7280] dark:text-slate-400 font-mono">
                <span>IP: {log.ip_address || '127.0.0.1'}</span>
                <span
                  className="truncate max-w-[190px]"
                  title={log.user_agent || 'Browser Client'}
                >
                  {log.user_agent || 'Mozilla/5.0 (PayPulse Admin)'}
                </span>
              </div>
            </div>
          </div>

          {/* Field-Level Diff or Snapshot Payload */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-white flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-[#0F172A] dark:text-blue-400" />
                {log.action === 'UPDATE'
                  ? 'Granular Field-Level Diff (Before vs. After)'
                  : log.action === 'CREATE'
                  ? 'Created Record Snapshot'
                  : log.action === 'DELETE'
                  ? 'Purged Record Pre-Deletion Snapshot'
                  : 'Event Payload Snapshot'}
              </h3>
              <span className="text-[11px] text-[#6B7280] dark:text-slate-400 font-mono">
                {allDiffKeys.length}{' '}
                {allDiffKeys.length === 1 ? 'attribute' : 'attributes'} captured
              </span>
            </div>

            {log.action === 'UPDATE' && allDiffKeys.length > 0 ? (
              <div className="rounded-xl border border-[#E5E7EB] dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#F8FAFC] dark:bg-slate-800/80 border-b border-[#E5E7EB] dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-slate-400">
                        <th className="py-2.5 px-3.5 w-1/4">Column / Field</th>
                        <th className="py-2.5 px-3.5 w-[37.5%] text-rose-700 dark:text-rose-400">
                          Old Value (Before)
                        </th>
                        <th className="py-2.5 px-3.5 w-[37.5%] text-emerald-700 dark:text-emerald-400">
                          New Value (After)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-800 text-xs font-mono">
                      {allDiffKeys.map((key) => {
                        const beforeVal = oldObj ? oldObj[key] : undefined;
                        const afterVal = newObj ? newObj[key] : undefined;
                        const isChanged =
                          JSON.stringify(beforeVal) !==
                          JSON.stringify(afterVal);

                        return (
                          <tr
                            key={key}
                            className={
                              isChanged
                                ? 'bg-amber-50/30 dark:bg-amber-950/10'
                                : 'bg-white dark:bg-slate-900'
                            }
                          >
                            <td className="py-2.5 px-3.5 font-semibold text-[#111827] dark:text-white align-top">
                              <div className="flex items-center gap-1.5">
                                <span>{key}</span>
                                {isChanged && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3.5 text-rose-700 dark:text-rose-300 bg-rose-50/40 dark:bg-rose-950/20 align-top whitespace-pre-wrap break-all">
                              {formatValue(beforeVal)}
                            </td>
                            <td className="py-2.5 px-3.5 text-emerald-700 dark:text-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20 align-top whitespace-pre-wrap break-all">
                              <div className="flex items-start gap-1.5">
                                {isChanged && (
                                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                )}
                                <span>{formatValue(afterVal)}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-[#0F172A] text-slate-100 p-4 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
                <pre className="leading-relaxed">
                  {JSON.stringify(
                    log.action === 'DELETE'
                      ? oldObj || {}
                      : newObj || oldObj || {},
                    null,
                    2
                  )}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#F8FAFC] dark:bg-slate-800/60 border-t border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] dark:text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Immutable SHA-Verified Governance Log</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyJson}
              className="h-9 px-3.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#F8FAFC] dark:hover:bg-slate-700 text-xs font-semibold text-[#111827] dark:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogDetailModal;
