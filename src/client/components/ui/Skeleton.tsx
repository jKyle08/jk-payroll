// ==============================================================================
// PAYPULSE: STANDARDIZED SKELETON LOADING COMPONENT
// Design System: Balanced Glossy Graphite
// File: src/client/components/ui/Skeleton.tsx
// ==============================================================================

import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'rounded';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rounded',
  className = '',
  ...props
}) => {
  const variantClass =
    variant === 'circular'
      ? 'rounded-full'
      : variant === 'rectangular'
      ? 'rounded-none'
      : 'rounded-xl';

  return (
    <div
      className={`animate-pulse bg-slate-200/80 dark:bg-white/[0.08] ${variantClass} ${className}`}
      {...props}
    />
  );
};
