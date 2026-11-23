// ==============================================================================
// JK-PAYROLL: MINIMAL STATUS INDICATOR COMPONENT
// Minimal status dot design with no background and no border.
// Active:   ● Active   (#22A06B muted green dot, 8px, 8px gap, 13px font-medium)
// Inactive: ● Inactive (#DC6262 muted red dot, 8px, 8px gap, 13px font-medium)
// File: src/client/components/ui/StatusIndicator.tsx
// ==============================================================================

import React from 'react';

export type StatusValue = 'Active' | 'Inactive' | 'Suspended' | 'Onboarding' | boolean | string;

export interface StatusIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: StatusValue;
  isActive?: boolean;
  label?: string;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  isActive,
  label,
  className = '',
  ...props
}) => {
  // Determine if active:
  let resolvedStatus = 'Active';

  if (typeof isActive === 'boolean') {
    resolvedStatus = isActive ? 'Active' : 'Inactive';
  } else if (typeof status === 'boolean') {
    resolvedStatus = status ? 'Active' : 'Inactive';
  } else if (typeof status === 'string') {
    if (status.toLowerCase() === 'active') {
      resolvedStatus = 'Active';
    } else if (status.toLowerCase() === 'inactive') {
      resolvedStatus = 'Inactive';
    } else {
      resolvedStatus = status;
    }
  }

  // Determine dot color:
  // Active: #22A06B (Muted green)
  // Inactive / Suspended: #DC6262 (Muted red)
  // Onboarding: #D97706 (Muted amber)
  let dotColor = '#22A06B';
  if (resolvedStatus === 'Inactive' || resolvedStatus === 'Suspended') {
    dotColor = '#DC6262';
  } else if (resolvedStatus === 'Onboarding') {
    dotColor = '#D97706';
  } else if (resolvedStatus !== 'Active') {
    dotColor = '#94A3B8';
  }

  const displayLabel = label || resolvedStatus;

  return (
    <span
      className={`inline-flex items-center gap-2 text-[13px] font-medium text-[#111827] dark:text-[#F8FAFC] select-none ${className}`}
      {...props}
    >
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${
          resolvedStatus === 'Active'
            ? 'dark:shadow-[0_0_6px_rgba(34,160,107,0.5)]'
            : resolvedStatus === 'Inactive' || resolvedStatus === 'Suspended'
            ? 'dark:shadow-[0_0_6px_rgba(220,98,98,0.5)]'
            : resolvedStatus === 'Onboarding'
            ? 'dark:shadow-[0_0_6px_rgba(217,119,6,0.5)]'
            : ''
        }`}
        style={{ backgroundColor: dotColor }}
        aria-hidden="true"
      />
      <span>{displayLabel}</span>
    </span>
  );
};

export default StatusIndicator;
