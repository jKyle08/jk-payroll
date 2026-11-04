// ==============================================================================
// JK-PAYROLL: ROLE BADGE COMPONENT
// File: src/features/roles/components/role-badge.tsx
// ==============================================================================

import React from 'react';

export interface RoleBadgeProps {
  roleName: string;
  isSystem?: boolean;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ roleName, isSystem }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
        isSystem
          ? 'bg-purple-50 text-purple-700 border-purple-200'
          : 'bg-slate-50 text-slate-700 border-slate-200'
      }`}
    >
      <span>{roleName}</span>
      {isSystem && <span className="text-[9px] uppercase tracking-wider font-bold opacity-75">Sys</span>}
    </span>
  );
};

export default RoleBadge;
