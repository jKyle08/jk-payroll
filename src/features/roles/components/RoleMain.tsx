// ==============================================================================
// JK-PAYROLL: ROLE DIRECTORY (MAIN) PAGE
// Breadcrumb: Roles / Role Directory. Design System: "Midnight & Champagne Steel"
// File: src/features/roles/components/RoleMain.tsx
// ==============================================================================

import React, { useState } from 'react';
import { Plus, Search, Lock, Pencil, Trash2, Eye, RotateCcw, AlertCircle } from 'lucide-react';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.js';
import { RoleItem } from '../types.js';
import { useRoleDirectory } from '../hooks/useRoleDirectory.js';
import { useRoleMutations } from '../hooks/useRoleMutations.js';

export interface RoleMainProps {
  organizations?: { id: string; name: string; code: string }[];
  onCreate?: () => void;
  onOpen?: (item: RoleItem) => void;
}

const selectClass =
  'h-9 px-3 text-xs rounded-lg border border-[#E5E7EB] bg-[#FBFBFC] text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#0F172A]';

export const RoleMain: React.FC<RoleMainProps> = ({ organizations = [], onCreate, onOpen }) => {
  const { items, meta, filters, setFilters, resetFilters, isLoading, error, refresh } = useRoleDirectory();
  const { removeRole, isSubmitting, error: mutationError } = useRoleMutations();
  const [pendingDelete, setPendingDelete] = useState<RoleItem | null>(null);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await removeRole(pendingDelete.id);
      setPendingDelete(null);
      await refresh();
    } catch {
      setPendingDelete(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 text-[#111827]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB]">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="text-xs font-semibold text-[#6B7280]">User Roles</span>
            <span className="text-xs text-[#E5E7EB]">/</span>
            <span className="text-xs font-semibold text-[#111827]">User Role Directory</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">User Role</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Manage user roles, tenant authorization scopes, and access boundaries.</p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="h-10 px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Role</span>
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Roles', value: meta.total },
          { label: 'System Roles', value: meta.systemCount },
          { label: 'Custom Roles', value: meta.customCount },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-xl p-5 border border-[#E5E7EB]">
            <div className="text-xs font-semibold text-[#6B7280] mb-2">{k.label}</div>
            <div className="text-2xl font-bold tabular-nums">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 min-w-[220px] w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search by role name, code or organization"
            className="h-9 w-full pl-9 pr-3 text-xs rounded-lg border border-[#E5E7EB] bg-[#FBFBFC] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#0F172A]"
          />
        </div>
        <select value={filters.organizationId} onChange={(e) => setFilters({ ...filters, organizationId: e.target.value })} className={selectClass}>
          <option value="All">All Organizations</option>
          <option value="GLOBAL">Global (System)</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select value={filters.roleType} onChange={(e) => setFilters({ ...filters, roleType: e.target.value as any })} className={selectClass}>
          <option value="All">All Types</option>
          <option value="SYSTEM">System</option>
          <option value="CUSTOM">Custom</option>
        </select>
        <button
          type="button"
          onClick={resetFilters}
          className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#475569] flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {(error || mutationError) && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error || mutationError}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FBFBFC] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Users</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#6B7280]">
                    Loading roles...
                  </td>
                </tr>
              )}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#6B7280]">
                    No roles match the current filters.
                  </td>
                </tr>
              )}
              {items.map((r) => (
                <tr key={r.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{r.name}</span>
                      {r.isDefault && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">DEFAULT</span>
                      )}
                      {!r.isMutable && <Lock className="w-3 h-3 text-[#9CA3AF]" />}
                    </div>
                    <div className="text-[11px] text-[#6B7280] font-mono">{r.code}</div>
                  </td>
                  <td className="py-3 px-4">{r.organizationName}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        r.roleType === 'SYSTEM' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {r.roleType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">{r.assignedUsers}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpen?.(r)}
                        className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-[#F1F5F9]"
                        title={r.isEditable ? 'Edit role' : 'View role'}
                      >
                        {r.isEditable ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      {r.isEditable && (
                        <button
                          type="button"
                          onClick={() => setPendingDelete(r)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                          title="Delete role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete role?"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" will be permanently removed. Roles that are still assigned to users cannot be deleted.`
            : ''
        }
        confirmLabel="Delete Role"
        isDestructive
        isLoading={isSubmitting}
      />
    </div>
  );
};
