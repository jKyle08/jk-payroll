// ==============================================================================
// PAYPULSE: STANDARDIZED EMPTY STATE COMPONENT
// Design System: Balanced Glossy Graphite
// File: src/client/components/ui/EmptyState.tsx
// ==============================================================================

import React from 'react';
import { SearchX } from 'lucide-react';
import { Button } from './Button.js';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`w-full bg-white dark:bg-[#181D2A] rounded-2xl border border-[#E5E7EB] dark:border-white/10 p-12 text-center shadow-xs transition-colors ${className}`}
      {...props}
    >
      <div className="w-12 h-12 rounded-2xl bg-[#F8FAFC] dark:bg-[#121620] border border-[#E5E7EB] dark:border-white/10 text-[#6B7280] dark:text-[#64748B] flex items-center justify-center mx-auto mb-3">
        {icon || <SearchX className="w-6 h-6" />}
      </div>

      <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">
        {title}
      </h3>

      {description && (
        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}

      {children && <div className="mt-4">{children}</div>}

      {actionLabel && onAction && (
        <div className="mt-4">
          <Button
            variant="primary"
            size="md"
            onClick={onAction}
            leftIcon={actionIcon}
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
