// ==============================================================================
// JK-PAYROLL: ORGANIZATION TABLE SKELETON
// Hairline table loading state matching Midnight & Champagne Steel aesthetic
// File: src/features/organizations/components/OrganizationTableSkeleton.tsx
// ==============================================================================

import React from 'react';

interface OrganizationTableSkeletonProps {
  rows?: number;
}

export const OrganizationTableSkeleton: React.FC<OrganizationTableSkeletonProps> = ({
  rows = 5,
}) => {
  return (
    <div className="w-full bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden animate-pulse">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F8FAFC]/50 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
              <th className="py-3.5 px-6">Organization</th>
              <th className="py-3.5 px-4">Routing Code / Slug</th>
              <th className="py-3.5 px-4">Plan Tier</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Active Headcount</th>
              <th className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {Array.from({ length: rows }).map((_, idx) => (
              <tr key={idx} className="bg-white">
                {/* Org Name & Domain */}
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex-shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-36 bg-slate-200 rounded" />
                      <div className="h-2.5 w-24 bg-slate-100 rounded" />
                    </div>
                  </div>
                </td>

                {/* Slug in mono pill */}
                <td className="py-4 px-4">
                  <div className="h-6 w-28 bg-slate-100 rounded-md" />
                </td>

                {/* Plan Tier */}
                <td className="py-4 px-4">
                  <div className="h-5 w-16 bg-slate-100 rounded-full" />
                </td>

                {/* Status */}
                <td className="py-4 px-4">
                  <div className="h-5 w-14 bg-slate-100 rounded-full" />
                </td>

                {/* Headcount */}
                <td className="py-4 px-4">
                  <div className="h-4 w-12 bg-slate-100 rounded" />
                </td>

                {/* Actions */}
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-8 w-16 bg-slate-100 rounded-lg" />
                    <div className="h-8 w-8 bg-slate-100 rounded-lg" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrganizationTableSkeleton;
