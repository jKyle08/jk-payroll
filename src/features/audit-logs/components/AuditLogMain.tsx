// ==============================================================================
// JK-PAYROLL: AUDIT LOGS MAIN GOVERNANCE DASHBOARD
// File: src/features/audit-logs/components/AuditLogMain.tsx
// ==============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileCheck2,
  RefreshCw,
  Download,
  Database,
  PlusCircle,
  Edit3,
  Trash2,
  Search,
  X,
  Filter,
  Check,
  Globe,
  Shield,
  Building2,
  Eye,
  Code2,
  Sparkles,
} from 'lucide-react';
import { AuditAction, AuditLogEntry } from '../types.js';
import { KpiCard } from '../../../components/ui/KpiCard.js';
import { CustomSelect } from '../../../components/ui/CustomSelect.js';
import {
  SearchableSelect,
  type SearchableOption,
} from '../../../components/ui/SearchableSelect.js';
import { SearchButton } from '../../../components/ui/SearchButton.js';
import {
  Pagination,
  usePagination,
} from '../../../components/ui/Pagination.js';
import { useAuth } from '../../auth/hooks/use-auth.js';
import {
  AuditLogDetailModal,
  sanitizeSnapshotObject,
  getEntityDisplayName,
} from './AuditLogDetailModal.js';

interface OrganizationItem {
  id: string;
  name: string;
  code?: string;
  slug?: string;
}

const FALLBACK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-99201-a1',
    organization_id: 'org-apex-health',
    actor_id: 'usr-super-001',
    actor_name: 'Alexander Vance',
    actor_email: 'a.vance@paypulse.enterprise',
    actor_role_name: 'Super Admin',
    actor_department_name: 'Global Governance',
    module_id: 'ORGANIZATION',
    entity_type: 'Organization',
    entity_id: 'org-apex-health',
    action: 'UPDATE',
    old_values: {
      planTier: 'Standard',
      maxSeats: 150,
      payFrequency: 'Monthly',
    },
    new_values: {
      planTier: 'Enterprise',
      maxSeats: 500,
      payFrequency: 'Semi-Monthly',
    },
    ip_address: '192.168.10.42',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0',
    created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: 'aud-99201-b2',
    organization_id: 'org-apex-health',
    actor_id: 'usr-super-001',
    actor_name: 'Alexander Vance',
    actor_email: 'a.vance@paypulse.enterprise',
    actor_role_name: 'Super Admin',
    actor_department_name: 'Global Governance',
    module_id: 'RBAC',
    entity_type: 'Role',
    entity_id: 'role-payroll-comptroller',
    action: 'CREATE',
    old_values: null,
    new_values: {
      name: 'Payroll Comptroller',
      code: 'PAY_COMPTROLLER',
      permissionsCount: 18,
      status: 'Active',
    },
    ip_address: '192.168.10.42',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0',
    created_at: new Date(Date.now() - 34 * 60 * 1000).toISOString(),
  },
  {
    id: 'aud-99201-c3',
    organization_id: 'org-apex-health',
    actor_id: 'usr-admin-002',
    actor_name: 'Elena Rostova',
    actor_email: 'e.rostova@apexhealth.org',
    actor_role_name: 'Tenant Admin',
    actor_department_name: 'Human Capital & Payroll',
    module_id: 'DEPARTMENTS',
    entity_type: 'Department',
    entity_id: 'dept-cardiology-ops',
    action: 'UPDATE',
    old_values: {
      costCenterCode: 'CC-4100',
      headOfDepartment: 'Dr. Marcus Thorne',
    },
    new_values: {
      costCenterCode: 'CC-4105-CLIN',
      headOfDepartment: 'Dr. Clara Lin',
    },
    ip_address: '10.24.88.19',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Safari/605.1',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'aud-99201-d4',
    organization_id: 'org-apex-health',
    actor_id: 'usr-admin-002',
    actor_name: 'Elena Rostova',
    actor_email: 'e.rostova@apexhealth.org',
    actor_role_name: 'Tenant Admin',
    actor_department_name: 'Human Capital & Payroll',
    module_id: 'USER_ROLES',
    entity_type: 'UserRoleAssignment',
    entity_id: 'ura-88310',
    action: 'DELETE',
    old_values: {
      assigneeName: 'Julian Mercer',
      assigneeEmail: 'j.mercer@apexhealth.org',
      revokedRole: 'Treasury Approver',
      reason: 'Department transfer to Clinical Operations',
    },
    new_values: null,
    ip_address: '10.24.88.19',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Safari/605.1',
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
];

const formatRelativeTime = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffSec = Math.max(1, Math.floor(diffMs / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
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

const getActorInitials = (name: string | null): string => {
  if (!name) return 'SY';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const buildDiffSummary = (log: AuditLogEntry): string => {
  const cleanOld = sanitizeSnapshotObject(log.old_values);
  const cleanNew = sanitizeSnapshotObject(log.new_values);
  const targetLabel = getEntityDisplayName(log);

  if (log.action === 'UPDATE' && cleanOld && cleanNew) {
    const keys = Array.from(
      new Set([...Object.keys(cleanOld), ...Object.keys(cleanNew)])
    ).filter(
      (k) =>
        JSON.stringify(cleanOld?.[k]) !== JSON.stringify(cleanNew?.[k])
    );
    if (keys.length === 0) return `Updated ${targetLabel}`;
    const preview = keys
      .slice(0, 2)
      .map(
        (k) =>
          `${k}: ${String(cleanOld?.[k] ?? '—')} → ${String(
            cleanNew?.[k] ?? '—'
          )}`
      )
      .join(' • ');
    return keys.length > 2 ? `${preview} (+${keys.length - 2} more)` : preview;
  }

  if (log.action === 'CREATE' && cleanNew) {
    const entries = Object.entries(cleanNew).slice(0, 3);
    if (entries.length > 0) {
      return `Provisioned (${entries
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join(', ')})`;
    }
    return `Created ${log.entity_type} (${targetLabel})`;
  }

  if (log.action === 'DELETE' && cleanOld) {
    const entries = Object.entries(cleanOld).slice(0, 2);
    if (entries.length > 0) {
      return `Purged snapshot (${entries
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join(', ')})`;
    }
    return `Deleted ${log.entity_type} (${targetLabel})`;
  }

  return `${log.action} on ${log.entity_type} (${targetLabel})`;
};

export const AuditLogMain: React.FC = () => {
  const { user, token } = useAuth();
  const isSuperAdmin = Boolean(user?.isSuperAdmin);

  // Raw logs + organizations map
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Applied filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('All');
  const [selectedModule, setSelectedModule] = useState<string>('All');
  const [selectedAction, setSelectedAction] = useState<string>('All');

  // Collapsible filter panel + draft states
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);
  const [draftOrgId, setDraftOrgId] = useState<string>('All');
  const [draftModule, setDraftModule] = useState<string>('All');
  const [draftAction, setDraftAction] = useState<string>('All');

  // Fetch organizations for SearchableSelect dropdown
  useEffect(() => {
    let isMounted = true;
    const loadOrgs = async () => {
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/organizations', { headers });
        if (res.ok) {
          const json = await res.json();
          const list: OrganizationItem[] = Array.isArray(json)
            ? json
            : Array.isArray(json.data)
            ? json.data
            : [];
          if (isMounted && list.length > 0) {
            setOrganizations(list);
          }
        }
      } catch {
        // Ignore network fallback
      }
    };
    loadOrgs();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Fetch audit logs from API
  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const params = new URLSearchParams();
      params.set('limit', '200');
      if (selectedOrgId !== 'All') params.set('organizationId', selectedOrgId);
      if (selectedModule !== 'All') params.set('moduleId', selectedModule);
      if (selectedAction !== 'All') params.set('action', selectedAction);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/audit-logs?${params.toString()}`, {
        headers,
      });

      if (res.ok) {
        const json = await res.json();
        const apiLogs: AuditLogEntry[] = Array.isArray(json.data)
          ? json.data
          : Array.isArray(json)
          ? json
          : [];
        if (apiLogs.length > 0) {
          setLogs(apiLogs);
        } else {
          setLogs(FALLBACK_AUDIT_LOGS);
        }
      } else {
        setLogs(FALLBACK_AUDIT_LOGS);
      }
    } catch {
      setLogs(FALLBACK_AUDIT_LOGS);
    } finally {
      setLoading(false);
    }
  }, [token, selectedOrgId, selectedModule, selectedAction, searchQuery]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Organization lookup map
  const orgMap = useMemo(() => {
    const map: Record<string, string> = {
      'org-apex-health': 'Apex Health Systems',
      '00000000-0000-0000-0000-000000000000': 'SuperAdmin Platform',
      '00000000-0000-0000-0000-000000000001': 'Apex Health Systems',
    };
    organizations.forEach((o) => {
      map[o.id] = o.name;
    });
    return map;
  }, [organizations]);

  // Organization options for SearchableSelect
  const orgOptions: SearchableOption[] = useMemo(() => {
    const base: SearchableOption[] = [
      {
        value: 'All',
        label: 'All Organizations (Global Scope)',
        sublabel: 'Cross-tenant governance stream',
      },
    ];
    organizations.forEach((org) => {
      base.push({
        value: org.id,
        label: org.name,
        sublabel: org.code || org.slug || undefined,
      });
    });
    if (organizations.length === 0) {
      base.push(
        {
          value: '00000000-0000-0000-0000-000000000000',
          label: 'SuperAdmin Platform',
          sublabel: 'ROOT',
        },
        {
          value: '00000000-0000-0000-0000-000000000001',
          label: 'Apex Health Systems',
          sublabel: 'APEX-HLTH',
        }
      );
    }
    return base;
  }, [organizations]);

  // Client-side instant filtering over loaded logs
  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      if (selectedOrgId !== 'All' && entry.organization_id !== selectedOrgId) {
        return false;
      }
      if (selectedModule !== 'All' && entry.module_id !== selectedModule) {
        return false;
      }
      if (selectedAction !== 'All' && entry.action !== selectedAction) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = [
          entry.actor_name,
          entry.actor_email,
          entry.actor_role_name,
          entry.actor_department_name,
          entry.module_id,
          entry.entity_type,
          entry.entity_id,
          entry.action,
          entry.ip_address,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, selectedOrgId, selectedModule, selectedAction, searchQuery]);

  // Compute KPI stats
  const kpiStats = useMemo(() => {
    const total = filteredLogs.length;
    const creates = filteredLogs.filter((l) => l.action === 'CREATE').length;
    const updates = filteredLogs.filter((l) => l.action === 'UPDATE').length;
    const deletes = filteredLogs.filter((l) => l.action === 'DELETE').length;
    return { total, creates, updates, deletes };
  }, [filteredLogs]);

  // Pagination hook
  const pagination = usePagination(filteredLogs, 10);

  // Handlers for Search & Filters
  const handleSearchInputChange = (val: string) => {
    setSearchInput(val);
    setSearchQuery(val);
    pagination.resetPage();
  };

  const handleExecuteSearch = () => {
    setSearchQuery(searchInput.trim());
    pagination.resetPage();
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    pagination.resetPage();
  };

  const handleApplyFilters = () => {
    setSelectedOrgId(draftOrgId);
    setSelectedModule(draftModule);
    setSelectedAction(draftAction);
    pagination.resetPage();
  };

  const handleResetFilters = () => {
    setDraftOrgId('All');
    setDraftModule('All');
    setDraftAction('All');
    setSelectedOrgId('All');
    setSelectedModule('All');
    setSelectedAction('All');
    pagination.resetPage();
  };

  const handleClearAll = () => {
    setSearchInput('');
    setSearchQuery('');
    handleResetFilters();
  };

  const hasActiveDropdownFilters =
    selectedOrgId !== 'All' ||
    selectedModule !== 'All' ||
    selectedAction !== 'All';

  // Active filter chips
  const activeChips: {
    key: 'search' | 'org' | 'module' | 'action';
    label: string;
  }[] = [];

  if (searchQuery.trim()) {
    activeChips.push({
      key: 'search',
      label: `Search: "${searchQuery.trim()}"`,
    });
  }
  if (selectedOrgId !== 'All') {
    activeChips.push({
      key: 'org',
      label: `Organization: ${orgMap[selectedOrgId] || 'Selected Organization'}`,
    });
  }
  if (selectedModule !== 'All') {
    activeChips.push({
      key: 'module',
      label: `Module: ${selectedModule}`,
    });
  }
  if (selectedAction !== 'All') {
    activeChips.push({
      key: 'action',
      label: `Action: ${selectedAction}`,
    });
  }

  const handleRemoveChip = (key: 'search' | 'org' | 'module' | 'action') => {
    if (key === 'search') {
      handleClearSearch();
    } else if (key === 'org') {
      setDraftOrgId('All');
      setSelectedOrgId('All');
    } else if (key === 'module') {
      setDraftModule('All');
      setSelectedModule('All');
    } else if (key === 'action') {
      setDraftAction('All');
      setSelectedAction('All');
    }
    pagination.resetPage();
  };

  // Export CSV handler
  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;
    const headers = [
      'Timestamp (UTC)',
      'Organization',
      'Actor Name',
      'Actor Email',
      'Actor Role',
      'Actor Department',
      'Module',
      'Action',
      'Entity Type',
      'Target Record',
      'IP Address',
    ];
    const rows = filteredLogs.map((l) => [
      l.created_at,
      orgMap[l.organization_id] || 'Apex Health Systems',
      l.actor_name || 'System',
      l.actor_email || '',
      l.actor_role_name || '',
      l.actor_department_name || '',
      l.module_id,
      l.action,
      l.entity_type,
      getEntityDisplayName(l),
      l.ip_address || '',
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `PayPulse_AuditLogs_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* ================================================================== */}
      {/* 1. MODULE HEADER                                                   */}
      {/* ================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-[#6B7280] dark:text-slate-400">
            <span>Security &amp; Governance</span>
            <span>/</span>
            <span className="text-[#111827] dark:text-slate-200 font-semibold">
              Audit Logs
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-white tracking-tight flex items-center gap-2.5">
              <FileCheck2 className="w-6 h-6 text-[#0F172A] dark:text-emerald-400" />
              <span>Audit Trail &amp; Governance Logs</span>
            </h1>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Zero-Join In-Memory Snapshots
            </span>
          </div>

          <p className="text-xs text-[#6B7280] dark:text-slate-400 max-w-3xl leading-relaxed">
            Point-in-time immutable audit records capturing the human-readable
            state of actors, assigned roles, department trees, and granular
            field-level diffs at the millisecond of mutation.
          </p>
        </div>

        {/* Right Quick Actions */}
        <div className="flex items-center gap-2.5 self-start lg:self-center">
          <button
            type="button"
            onClick={fetchAuditLogs}
            className="h-10 px-3.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#F8FAFC] dark:hover:bg-slate-700 text-xs font-semibold text-[#111827] dark:text-white flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
            title="Refresh Audit Stream"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#6B7280] ${
                loading ? 'animate-spin' : ''
              }`}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="h-10 px-4 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* 2. KPI SUMMARY METRIC ROW                                          */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Audit Events"
          value={kpiStats.total}
          suffix="events"
          tone="slate"
          icon={<Database className="w-4 h-4" />}
        />
        <KpiCard
          label="Record Creations"
          value={kpiStats.creates}
          suffix="provisions"
          tone="emerald"
          icon={<PlusCircle className="w-4 h-4" />}
        />
        <KpiCard
          label="Mutations & Updates"
          value={kpiStats.updates}
          suffix="modifications"
          tone="blue"
          icon={<Edit3 className="w-4 h-4" />}
        />
        <KpiCard
          label="Deletions & Revocations"
          value={kpiStats.deletes}
          suffix="purged"
          tone="rose"
          icon={<Trash2 className="w-4 h-4" />}
        />
      </div>

      {/* ================================================================== */}
      {/* 3. TWO-PANEL SEARCH & FILTER TOOLBAR                               */}
      {/* ================================================================== */}
      <div className="space-y-3">
        {/* PANEL 1: Search Box + SearchButton + Filter Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-[#E5E7EB] dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleExecuteSearch();
                  }
                }}
                placeholder="Search actor name, email, role, department, entity type, or IP address..."
                className="h-10 w-full pl-10 pr-9 text-xs rounded-lg bg-[#FBFBFC] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 text-[#111827] dark:text-white placeholder-[#6B7280] focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827] dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title="Clear search query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <SearchButton onClick={handleExecuteSearch} />
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen((prev) => !prev)}
              className={`h-10 px-3.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all flex-shrink-0 cursor-pointer ${
                isFilterPanelOpen || hasActiveDropdownFilters
                  ? 'border-[#0F172A] bg-[#0F172A]/5 text-[#0F172A] dark:border-slate-400 dark:text-white'
                  : 'border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#F8FAFC] text-[#475569] dark:text-slate-200'
              }`}
              title="Filter Audit Stream"
            >
              <Filter className="w-4 h-4 text-[#6B7280]" />
              <span>Filter</span>
              {hasActiveDropdownFilters && (
                <span className="w-2 h-2 rounded-full bg-[#0F172A] dark:bg-blue-400" />
              )}
            </button>
          </div>
        </div>

        {/* ACTIVE FILTER DISMISSAL CHIPS */}
        {activeChips.length > 0 && (
          <div className="flex items-center flex-wrap gap-1.5 py-1 text-xs">
            <span className="text-[11px] font-semibold text-[#6B7280] dark:text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-[#6B7280]" />
              <span>Active Filters:</span>
            </span>
            {activeChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F1F5F9] dark:bg-slate-800 text-[#0F172A] dark:text-white border border-[#E5E7EB] dark:border-slate-700 shadow-2xs"
              >
                <span>{chip.label}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveChip(chip.key)}
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[#6B7280] hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Remove filter"
                >
                  ✕
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-semibold text-[#0F172A] dark:text-blue-400 hover:underline ml-1.5 cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}

        {/* PANEL 2: COLLAPSIBLE FILTER DIRECTORY PANEL */}
        {isFilterPanelOpen && (
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-[#E5E7EB] dark:border-slate-800 space-y-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E7EB] dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#475569] dark:text-slate-300" />
                <span className="text-xs font-bold text-[#111827] dark:text-white">
                  Filter Audit Governance Stream
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="h-8 px-3 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#F8FAFC] dark:hover:bg-slate-700 text-xs font-semibold text-[#475569] dark:text-slate-300 transition-all cursor-pointer"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="h-8 px-4 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center justify-center transition-all cursor-pointer"
                >
                  <span>Apply</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Organization Filter (with SearchableSelect, updates draft state only) */}
              <div>
                <SearchableSelect
                  label="Organization / Tenant Scope"
                  value={draftOrgId}
                  onChange={(val) => setDraftOrgId(val)}
                  options={orgOptions}
                  placeholder="Select or search organization..."
                  searchPlaceholder="Search organization by name or code..."
                  disabled={!isSuperAdmin && organizations.length <= 1}
                />
              </div>

              {/* 2. System Module Filter (updates draft state only) */}
              <div>
                <CustomSelect
                  label="Target System Module"
                  value={draftModule}
                  onChange={(val) => setDraftModule(val)}
                  options={[
                    { value: 'All', label: 'All System Modules' },
                    { value: 'ORGANIZATION', label: 'ORGANIZATION (Tenants)' },
                    { value: 'DEPARTMENTS', label: 'DEPARTMENTS (Hierarchy)' },
                    { value: 'RBAC', label: 'RBAC (Roles & Matrix)' },
                    { value: 'USER_ROLES', label: 'USER_ROLES (Bindings)' },
                    { value: 'PROFILES', label: 'PROFILES (Staff Records)' },
                  ]}
                />
              </div>

              {/* 3. Mutation Action Filter (updates draft state only) */}
              <div>
                <CustomSelect
                  label="Mutation / Event Action"
                  value={draftAction}
                  onChange={(val) => setDraftAction(val)}
                  options={[
                    { value: 'All', label: 'All Actions' },
                    { value: 'CREATE', label: 'CREATE (Provisioned)' },
                    { value: 'UPDATE', label: 'UPDATE (Field Mutation)' },
                    { value: 'DELETE', label: 'DELETE (Purged / Revoked)' },
                    { value: 'RESTORE', label: 'RESTORE (Recovered)' },
                    { value: 'LOGIN', label: 'LOGIN (Session Auth)' },
                    { value: 'EXPORT', label: 'EXPORT (Data Extract)' },
                  ]}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* 4. AUDIT TRAIL DATA TABLE + PAGINATION                             */}
      {/* ================================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E5E7EB] dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] dark:bg-slate-800/60 border-b border-[#E5E7EB] dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-slate-400">
                <th className="py-3.5 pl-5 pr-2 w-12 text-center">#</th>
                <th className="py-3.5 px-4">Timestamp &amp; Network</th>
                <th className="py-3.5 px-4">Actor Snapshot</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Target Entity &amp; Module</th>
                <th className="py-3.5 px-4">Field Diff / Snapshot Summary</th>
                <th className="py-3.5 pl-4 pr-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-800 text-xs">
              {pagination.pageItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#6B7280]">
                        <FileCheck2 className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-[#111827] dark:text-white">
                        No Matching Governance Audit Events
                      </p>
                      <p className="text-xs text-[#6B7280] dark:text-slate-400 max-w-md">
                        No point-in-time audit snapshots match your active
                        search or filter criteria.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pagination.pageItems.map((log, idx) => {
                  const rowNumber = pagination.startIndex + idx + 1;
                  const formattedDate = new Date(
                    log.created_at
                  ).toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric',
                  });
                  const formattedTime = new Date(
                    log.created_at
                  ).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* 1. Sequential Row Number (#) */}
                      <td className="py-3.5 pl-5 pr-2 text-center font-mono text-xs font-semibold text-[#6B7280] dark:text-slate-400 tabular-nums">
                        {rowNumber}
                      </td>

                      {/* 2. Timestamp & Network */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#111827] dark:text-white tabular-nums">
                              {formatRelativeTime(log.created_at)}
                            </span>
                            <span className="text-[11px] font-mono text-[#6B7280] dark:text-slate-400 tabular-nums">
                              ({formattedTime})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-[#6B7280] dark:text-slate-400">
                            <span>{formattedDate}</span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-slate-300">
                              <Globe className="w-2.5 h-2.5" />
                              {log.ip_address || '127.0.0.1'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Actor Snapshot */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#0F172A] text-white font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                            {getActorInitials(log.actor_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[#111827] dark:text-white truncate">
                              {log.actor_name || 'System Automated Process'}
                            </p>
                            <p className="text-[11px] font-mono text-[#6B7280] dark:text-slate-400 truncate">
                              {log.actor_email || 'system@paypulse.internal'}
                            </p>
                            <div className="flex items-center flex-wrap gap-1.5 mt-1">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-slate-200">
                                <Shield className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                                {log.actor_role_name || 'Super Admin'}
                              </span>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-slate-300">
                                <Building2 className="w-2.5 h-2.5 text-slate-500" />
                                {log.actor_department_name || 'Global'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 4. Action Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getActionBadgeStyles(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* 5. Target Entity & Module */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0F172A]/5 dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 border border-[#E5E7EB] dark:border-slate-700">
                              {log.module_id}
                            </span>
                            <span className="font-semibold text-[#111827] dark:text-white">
                              {log.entity_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] dark:text-slate-400">
                            <span
                              className="font-medium text-[#111827] dark:text-slate-200 truncate max-w-[160px]"
                              title={getEntityDisplayName(log)}
                            >
                              {getEntityDisplayName(log)}
                            </span>
                            <span>•</span>
                            <span className="text-[#475569] dark:text-slate-300 font-sans font-medium truncate max-w-[140px]">
                              {orgMap[log.organization_id] || 'Apex Health Systems'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 6. Field Diff / Snapshot Summary */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="p-2 rounded-lg bg-[#FBFBFC] dark:bg-slate-800/50 border border-[#E5E7EB] dark:border-slate-800 font-mono text-[11px] text-[#475569] dark:text-slate-300 truncate">
                          {buildDiffSummary(log)}
                        </div>
                      </td>

                      {/* 7. Inspect Action */}
                      <td className="py-3.5 pl-4 pr-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="h-8 px-3 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#0F172A] hover:text-white hover:border-[#0F172A] dark:hover:bg-blue-600 dark:hover:border-blue-600 text-xs font-semibold text-[#111827] dark:text-slate-200 inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        >
                          {log.action === 'UPDATE' ? (
                            <>
                              <Code2 className="w-3.5 h-3.5" />
                              <span>Inspect Diff</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Snapshot</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Shared Pagination Footer */}
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          itemLabel="audit events"
        />
      </div>

      {/* ================================================================== */}
      {/* 5. DETAIL & FIELD-LEVEL DIFF MODAL                                 */}
      {/* ================================================================== */}
      <AuditLogDetailModal
        log={selectedLog}
        organizationName={
          selectedLog
            ? orgMap[selectedLog.organization_id] || 'Apex Health Systems'
            : undefined
        }
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
};

export default AuditLogMain;

