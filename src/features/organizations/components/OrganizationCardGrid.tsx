// ==============================================================================
// JK-PAYROLL: ORGANIZATION CARD GRID COMPONENT (CARD VIEW)
// Renders organizations in a 2-column responsive card grid with pagination
// Design System: "Midnight & Champagne Steel"
// File: src/features/organizations/components/OrganizationCardGrid.tsx
// ==============================================================================

import React from 'react';
import {
  Building2,
  Edit3,
  Trash2,
  Users,
  Plus,
  SearchX,
  CalendarClock,
} from 'lucide-react';
import { Organization } from '../types.js';

export interface OrganizationCardGridProps {
  organizations: Organization[];
  startIndex?: number;
  pagination?: React.ReactNode;
  onEdit?: (id: string) => void;
  onDelete?: (org: Organization) => void;
  onAddNew?: () => void;
}

export const OrganizationCardGrid: React.FC<OrganizationCardGridProps> = ({
  organizations,
  startIndex = 0,
  pagination,
  onEdit,
  onDelete,
  onAddNew,
}) => {
  if (organizations.length === 0) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 text-[#6B7280] flex items-center justify-center mx-auto mb-3">
          <SearchX className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-[#111827] dark:text-white">
          No organizations found
        </h3>
        <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-1 max-w-sm mx-auto">
          No organizations match your current search and filter criteria, or none have been provisioned yet.
        </p>
        {onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Provision First Organization</span>
          </button>
        )}
      </div>
    );
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800';
      case 'Onboarding':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';
      case 'Suspended':
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800';
    }
  };

  const getTierBadgeClass = (tier: string) => {
    switch (tier) {
      case 'Enterprise':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800';
      case 'Standard':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800';
      case 'Starter':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {organizations.map((org, idx) => {
          const rowNumber = startIndex + idx + 1;
          const orgInitials =
            org.name
              .split(' ')
              .map((w) => w[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase() || 'OR';

          const adminName =
            org.admin?.fullName || org.admin?.name || 'Assigned Organization Admin';
          const adminInitials =
            org.admin?.avatarInitials ||
            adminName
              .split(' ')
              .map((n) => n[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase() ||
            'TA';
          const adminEmail =
            org.admin?.email || `admin@${org.code.toLowerCase()}.com`;
          const adminUsername = org.admin?.username || 'admin';
          const adminTitle = org.admin?.title || 'Organization Administrator';

          return (
            <div
              key={org.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-[#E5E7EB] dark:border-slate-800 shadow-xs space-y-4 hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* 1. Card Top Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 text-[#0F172A] dark:text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs">
                      {orgInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm text-[#111827] dark:text-white truncate">
                          {org.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 font-mono text-[10px] font-semibold text-[#475569] dark:text-slate-300">
                          {org.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
                        <span className="truncate">{org.industry || 'Enterprise'}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px] truncate">
                          {org.slug}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getTierBadgeClass(
                        org.planTier
                      )}`}
                    >
                      {org.planTier}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(
                        org.status
                      )}`}
                    >
                      {org.status}
                    </span>
                  </div>
                </div>

                {/* 2. Assigned Organization Administrator Info Card */}
                <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {adminInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {adminName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                        {adminEmail} {adminUsername ? `• @${adminUsername}` : ''}
                      </div>
                    </div>
                  </div>
                  {adminTitle && (
                    <span className="text-[10px] text-slate-400 hidden sm:inline-block font-medium flex-shrink-0">
                      {adminTitle}
                    </span>
                  )}
                </div>

                {/* 3. Active Modules & Operational Summary */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Modules Active ({org.modules ? org.modules.length : 0})
                    </span>
                    <div className="flex items-center gap-3 text-[11px] text-[#6B7280] dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums font-semibold text-[#111827] dark:text-slate-200">
                        <Users className="w-3.5 h-3.5 text-[#6B7280]" />
                        {org.headcount ?? 0} staff
                      </span>
                      {org.defaultPayFrequency && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="w-3.5 h-3.5 text-[#6B7280]" />
                          {org.defaultPayFrequency}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {(org.modules || []).map((mod) => (
                      <span
                        key={mod}
                        className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 font-medium"
                      >
                        {mod}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Card Footer: Row Number & Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono truncate">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-slate-300 font-semibold">
                    #{rowNumber}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(org.id)}
                      className="h-8 px-2.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#F8FAFC] dark:hover:bg-slate-700 text-[#374151] dark:text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Edit Organization"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#6B7280]" />
                      <span>Edit</span>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(org)}
                      className="h-8 px-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Delete Organization"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 shadow-xs overflow-hidden">
          {pagination}
        </div>
      )}
    </div>
  );
};

export default OrganizationCardGrid;

