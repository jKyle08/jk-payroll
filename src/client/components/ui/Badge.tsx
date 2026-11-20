// ==============================================================================
// JK-PAYROLL: STANDARDIZED BADGE COMPONENT
// Design System: Monochromatic Enterprise SaaS ("Midnight & Champagne Steel")
// File: src/client/components/ui/Badge.tsx
// ==============================================================================

import React from 'react';

export type BadgeVariant =
  | 'neutral'
  | 'outline'
  | 'error'
  | 'warning'
  | 'success';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  dotColor?: string;
  icon?: React.ReactNode;
}

const VARIANT_STYLES: Record<BadgeVariant, { container: string; dot: string }> = {
  // Shared neutral default for Active, Inactive, Pending, Approved, Roles, Categories, etc.
  neutral: {
    container:
      'bg-[#F1F5F9] dark:bg-slate-800 text-[#334155] dark:text-slate-300 border-[#E2E8F0] dark:border-slate-700',
    dot: 'bg-slate-400 dark:bg-slate-500',
  },

  outline: {
    container:
      'bg-transparent text-[#475569] dark:text-slate-300 border-[#E2E8F0] dark:border-slate-700',
    dot: 'bg-slate-400 dark:bg-slate-500',
  },

  // Reserved exclusively for critical errors, security warnings, or exceptions
  error: {
    container:
      'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
    dot: 'bg-rose-500',
  },

  warning: {
    container:
      'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    dot: 'bg-amber-500',
  },

  success: {
    container:
      'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    dot: 'bg-emerald-500',
  },
};

const SIZE_STYLES: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-2 py-0.5 rounded gap-1',
  md: 'text-xs px-2.5 py-0.5 rounded-md gap-1.5',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  dotColor,
  icon,
  className = '',
  children,
  ...props
}) => {
  const styles = VARIANT_STYLES[variant];
  const sizeClass = SIZE_STYLES[size];

  return (
    <span
      className={`inline-flex items-center font-medium font-sans border select-none leading-none tracking-tight ${styles.container} ${sizeClass} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            dotColor || styles.dot
          }`}
          aria-hidden="true"
        />
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
