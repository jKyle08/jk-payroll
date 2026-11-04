// ==============================================================================
// JK-PAYROLL: ORGANIZATION TABLE ROW COMPONENT
// Individual row with slug in JetBrains Mono, metrics in tabular-nums, and actions
// Design System: "Midnight & Champagne Steel"
// File: src/features/organizations/components/OrganizationTableRow.tsx
// ==============================================================================

import React from 'react';
import { Edit3, Trash2, Building2, Users } from 'lucide-react';
import { Organization } from '../types.js';

export interface OrganizationTableRowProps {
  organization: Organization;
  index?: number;
  onEdit?: (id: string) => void;
  onDelete?: (org: Organization) => void;
}

export const OrganizationTableRow: React.FC<OrganizationTableRowProps> = ({
  organization: org,
  index,
  onEdit,
  onDelete,
}) => {
  // Avatar initials from org name
  const initials = org.name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'OR';

  // Tier badge styling
  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'Enterprise':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Standard':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Starter':
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Onboarding':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Suspended':
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  return (
    <tr className="hover:bg-[#FBFBFC] transition-colors group">
      {/* 0. Column Number */}
      <td className="py-4 px-3 text-center font-mono text-[11px] text-[#9CA3AF] font-medium">
        {index !== undefined ? index + 1 : '—'}
      </td>

      {/* 1. Identity & Name */}
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] text-[#0F172A] font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[#111827] truncate">
                {org.name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#6B7280] mt-0.5">
              <span>{org.domain || 'internal.workspace'}</span>
              <span>•</span>
              <span className="truncate max-w-[140px]">{org.industry || 'Enterprise'}</span>
            </div>
          </div>
        </div>
      </td>

      {/* 2. Routing Code / Slug (JetBrains Mono) */}
      <td className="py-4 px-4 whitespace-nowrap">
        <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-[#F1F5F9] border border-[#E5E7EB] text-[#0F172A] font-medium tracking-tight">
          {org.slug || `org_${org.code.toLowerCase()}`}
        </span>
      </td>

      {/* 3. Plan Tier */}
      <td className="py-4 px-4 whitespace-nowrap">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTierBadge(
            org.planTier
          )}`}
        >
          {org.planTier}
        </span>
      </td>

      {/* 4. Status */}
      <td className="py-4 px-4 whitespace-nowrap">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
            org.status
          )}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              org.status === 'Active'
                ? 'bg-emerald-500'
                : org.status === 'Onboarding'
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
          />
          {org.status}
        </span>
      </td>

      {/* 5. Active Headcount (tabular-nums font-mono) */}
      <td className="py-4 px-4 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-xs text-[#111827]">
          <Users className="w-3.5 h-3.5 text-[#6B7280]" />
          <span className="font-mono tabular-nums font-semibold">
            {org.headcount ?? 0}
          </span>
          <span className="text-[#6B7280]">employees</span>
        </div>
      </td>

      {/* 6. Row Action Buttons */}
      <td className="py-4 px-6 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
          {/* Edit Button */}
          <button
            type="button"
            onClick={() => onEdit?.(org.id)}
            className="h-8 px-2.5 rounded-lg border border-[#E5E7EB] bg-white text-xs font-medium text-[#475569] hover:text-[#111827] hover:bg-[#F8FAFC] transition-colors flex items-center gap-1.5"
            title="Edit Organization Settings"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => onDelete?.(org)}
            className="h-8 w-8 rounded-lg border border-[#E5E7EB] bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors flex items-center justify-center"
            title="Delete Organization"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default OrganizationTableRow;
