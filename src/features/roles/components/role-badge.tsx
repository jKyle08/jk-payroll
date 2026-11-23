// ==============================================================================
// JK-PAYROLL: ROLE BADGE COMPONENT
// Design System: Monochromatic Enterprise SaaS (Balanced Glossy Graphite)
// File: src/features/roles/components/role-badge.tsx
// ==============================================================================

import React from 'react';
import { Badge } from '../../../client/components/ui/Badge.js';

export interface RoleBadgeProps {
  roleName: string;
  isSystem?: boolean;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ roleName, isSystem }) => {
  return (
    <Badge variant="neutral" size="md">
      <span>{roleName}</span>
      {isSystem && (
        <span className="text-[9px] uppercase tracking-wider font-bold opacity-70 ml-0.5">
          Sys
        </span>
      )}
    </Badge>
  );
};

export default RoleBadge;
