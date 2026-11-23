// ==============================================================================
// JK-PAYROLL: ORGANIZATION TABLE ROW COMPONENT
// Individual row with slug in JetBrains Mono, metrics in tabular-nums, and actions
// Design System: Monochromatic Enterprise SaaS (Balanced Glossy Graphite)
// File: src/features/organizations/components/OrganizationTableRow.tsx
// ==============================================================================

import React from 'react';
import { Edit3, Trash2, Users } from 'lucide-react';
import { Organization } from '../types.js';
import { Badge, StatusIndicator, TableActionMenu } from '../../../client/components/ui/index.js';

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
  const initials =
    org.name
      ?.split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'OR';

  return (
    <tr className="hover:bg-[#FBFBFC] dark:hover:bg-white/[0.03] transition-colors group">
      {/* 0. Column Number */}
      <td className="py-4 px-3 text-center font-mono text-[11px] text-[#9CA3AF] dark:text-[#64748B] font-medium">
        {index !== undefined ? index + 1 : '—'}
      </td>

      {/* 1. Identity & Name */}
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] dark:bg-[#181D2A] border border-[#E5E7EB] dark:border-white/10 text-[#0F172A] dark:text-[#CBD5E1] font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[#111827] dark:text-[#F8FAFC] truncate">
                {org.name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
              <span>{org.domain || 'internal.workspace'}</span>
              <span className="dark:text-white/10">•</span>
              <span className="truncate max-w-[140px]">{org.industry || 'Enterprise'}</span>
            </div>
          </div>
        </div>
      </td>

      {/* 2. Routing Code / Slug (JetBrains Mono) */}
      <td className="py-4 px-4 whitespace-nowrap">
        <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-[#F1F5F9] dark:bg-[#181D2A] border border-[#E5E7EB] dark:border-white/10 text-[#0F172A] dark:text-[#CBD5E1] font-medium tracking-tight">
          {org.slug || `org_${org.code.toLowerCase()}`}
        </span>
      </td>

      {/* 3. Plan Tier */}
      <td className="py-4 px-4 whitespace-nowrap">
        <Badge variant="neutral" size="md">
          {org.tier || org.planTier || 'Enterprise'}
        </Badge>
      </td>

      {/* 4. Status */}
      <td className="py-4 px-4 whitespace-nowrap">
        <StatusIndicator status={org.status} />
      </td>

      {/* 5. Active Headcount (tabular-nums font-mono) */}
      <td className="py-4 px-4 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-xs text-[#111827] dark:text-[#F8FAFC]">
          <Users className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#64748B]" />
          <span className="font-mono tabular-nums font-semibold">
            {org.headcount ?? 0}
          </span>
          <span className="text-[#6B7280] dark:text-[#94A3B8]">employees</span>
        </div>
      </td>

      {/* 6. Row Action 3-Dots Menu */}
      <td className="py-4 px-6 text-right whitespace-nowrap">
        <TableActionMenu
          actions={[
            {
              label: 'Edit Organization',
              icon: <Edit3 className="w-3.5 h-3.5" />,
              onClick: () => onEdit?.(org.id),
            },
            {
              label: 'Delete Organization',
              icon: <Trash2 className="w-3.5 h-3.5" />,
              variant: 'danger',
              divider: true,
              onClick: () => onDelete?.(org),
            },
          ]}
          title="Organization Actions"
        />
      </td>
    </tr>
  );
};

export default OrganizationTableRow;
