// ==============================================================================
// PAYPULSE: STANDARDIZED CARD & SURFACE COMPONENTS
// Design System: Balanced Glossy Graphite
// File: src/client/components/ui/Card.tsx
// ==============================================================================

import React, { forwardRef } from 'react';

export type CardVariant = 'default' | 'nested' | 'elevated' | 'glossy';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  specular?: boolean;
}

const VARIANT_STYLES: Record<CardVariant, string> = {
  // Level 2 standard card / panel
  default:
    'bg-white dark:bg-[#181D2A] rounded-2xl border border-[#E5E7EB] dark:border-white/10 shadow-xs dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)]',

  // Level 3 nested secondary card / inner panel
  nested:
    'bg-[#F8FAFC] dark:bg-[#141924] rounded-xl border border-[#E5E7EB] dark:border-white/10',

  // Level 4 elevated surface
  elevated:
    'bg-white dark:bg-[#202637] rounded-2xl border border-[#CBD5E1] dark:border-white/14 shadow-lg dark:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.6)]',

  // Subtle Balanced Glossy Graphite surface with top gradient shine
  glossy:
    'glossy-card bg-white dark:bg-gradient-to-b dark:from-[#181D2A] dark:to-[#121620] rounded-2xl border border-[#E5E7EB] dark:border-white/10 shadow-xs dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.12)]',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      specular = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const variantClass = VARIANT_STYLES[variant];
    const specularClass = specular
      ? 'relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent'
      : '';

    return (
      <div
        ref={ref}
        className={`${variantClass} ${specularClass} transition-all ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`p-6 pb-4 sm:p-8 sm:pb-4 border-b border-slate-100 dark:border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={`text-sm sm:text-base font-bold text-[#111827] dark:text-[#F8FAFC] tracking-tight flex items-center gap-2 ${className}`}
        {...props}
      >
        {children}
      </h3>
    );
  }
);

CardTitle.displayName = 'CardTitle';

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={`text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5 ${className}`}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'CardDescription';

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`p-6 sm:p-8 ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`p-6 pt-4 sm:p-8 sm:pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-end gap-3 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';
