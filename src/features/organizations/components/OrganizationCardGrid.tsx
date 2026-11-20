// ==============================================================================
// JK-PAYROLL: ORGANIZATION CARD GRID COMPONENT (CARD VIEW)
// Renders organizations in a 2-column responsive card grid with pagination
// Design System: Monochromatic Enterprise SaaS ("Midnight & Champagne Steel")
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
import { Badge, Button, StatusIndicator } from '../../../client/components/ui/index.js';

export interface OrganizationCardGridProps {
  organizations: Organization[];
  isLoading?: boolean;
  startIndex?: number;
  pagination?: React.ReactNode;
  onEdit?: (id: string) => void;
  onDelete?: (org: Organization) => void;
  onAddNew?: () => void;
}

export const OrganizationCardGrid: React.FC<OrganizationCardGridProps> = ({
  organizations,
  isLoading = false,
  startIndex = 0,
  pagination,
  onEdit,
  onDelete,
  onAddNew,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 p-12 text-center shadow-xs">
          <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-[#0F172A] dark:border-blue-400 mb-2.5"></div>
          <p className="text-xs text-[#6B7280] dark:text-slate-400">
            Loading organizations...
          </p>
        </div>
        {pagination && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 shadow-xs">
            {pagination}
          </div>
        )}
      </div>
    );
  }

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
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onAddNew}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="mt-4"
          >
            Provision First Organization
          </Button>
        )}
      </div>
    );
  }

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
              .toUpperCase();

          const adminEmail = org.admin?.email || 'admin@tenant.internal';
          const adminUsername = org.admin?.username;
          const adminTitle = org.admin?.title;

          return (
            <div
              key={org.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
            >
              {/* 1. Header Section */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 text-[#0F172A] dark:text-slate-200 font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-2xs">
                      {orgInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[#111827] dark:text-white truncate">
                          {org.name}
                        </h4>
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

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="neutral" size="sm">
                      {org.tier || org.planTier || 'Enterprise'}
                    </Badge>
                    <StatusIndicator status={org.status} />
                  </div>
                </div>

                {/* 2. Assigned Organization Administrator Info Card */}
                <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#0F172A] text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
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
                      <Badge key={mod} variant="neutral" size="sm">
                        {mod}
                      </Badge>
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
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onEdit(org.id)}
                      leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                      title="Edit Organization"
                    >
                      Edit
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(org)}
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                      title="Delete Organization"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 shadow-xs">
          {pagination}
        </div>
      )}
    </div>
  );
};

export default OrganizationCardGrid;
