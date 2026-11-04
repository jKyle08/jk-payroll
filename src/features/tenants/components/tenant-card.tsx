// ==============================================================================
// JK-PAYROLL: TENANT CARD COMPONENT
// File: src/features/tenants/components/tenant-card.tsx
// ==============================================================================

import React from 'react';
import { Tenant } from '../types.js';

export interface TenantCardProps {
  tenant: Tenant;
  onSelect?: (tenant: Tenant) => void;
  isActive?: boolean;
}

export const TenantCard: React.FC<TenantCardProps> = ({ tenant, onSelect, isActive }) => {
  return (
    <div
      onClick={() => onSelect?.(tenant)}
      className={`p-4 rounded-xl border transition-all cursor-pointer ${
        isActive
          ? 'border-[#0F172A] bg-slate-50/50 shadow-sm'
          : 'border-[#E5E7EB] bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-[#6B7280]">
          {tenant.code}
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            tenant.isActive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {tenant.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      <h3 className="text-sm font-bold text-[#111827] mt-1 truncate">
        {tenant.name}
      </h3>
    </div>
  );
};

export default TenantCard;
