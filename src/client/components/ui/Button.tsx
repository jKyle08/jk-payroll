// ==============================================================================
// JK-PAYROLL: STANDARDIZED BUTTON COMPONENT
// Design System: Balanced Glossy Graphite
// File: src/client/components/ui/Button.tsx
// ==============================================================================

import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'link';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  // Primary: Midnight Slate (#0F172A) in Light mode, Polished Platinum Slate (#CBD5E1) in Dark mode
  primary:
    'bg-[#0F172A] hover:bg-[#1E293B] active:bg-[#020617] text-white border border-[#0F172A] focus:ring-[#0F172A]/15 focus-visible:ring-[#0F172A]/15 dark:bg-[#CBD5E1] dark:hover:bg-[#E2E8F0] dark:active:bg-[#94A3B8] dark:text-[#0F172A] dark:border-[#CBD5E1] dark:focus:ring-white/20 dark:focus-visible:ring-white/20 shadow-2xs dark:shadow-[0_0_12px_rgba(203,213,225,0.12)]',

  // Secondary: Charcoal surface, metallic border, crisp text
  secondary:
    'bg-white dark:bg-[#181D2A] hover:bg-[#F8FAFC] dark:hover:bg-[#202637] active:bg-[#F1F5F9] dark:active:bg-[#252C3D] text-[#334155] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-white/10 shadow-2xs dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]',

  // Outline: Transparent background, subtle metallic border, muted to white text
  outline:
    'bg-transparent hover:bg-[#F8FAFC] dark:hover:bg-white/[0.06] active:bg-[#F1F5F9] dark:active:bg-white/[0.10] text-[#475569] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] border border-[#E2E8F0] dark:border-white/10',

  // Ghost: Transparent background, no border, subtle hover illumination
  ghost:
    'bg-transparent hover:bg-[#F1F5F9] dark:hover:bg-white/[0.06] active:bg-[#E2E8F0] dark:active:bg-white/[0.10] text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white border-transparent',

  // Destructive: Muted red treatment
  destructive:
    'bg-rose-50 hover:bg-rose-100/90 active:bg-rose-200/80 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:active:bg-rose-900/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 shadow-2xs',

  // Link: Inline clickable text with subtle hover underline
  link:
    'bg-transparent hover:underline text-[#0F172A] dark:text-[#CBD5E1] border-transparent shadow-none p-0 h-auto font-medium',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg font-medium',
  md: 'h-9 px-3.5 text-xs gap-2 rounded-lg font-semibold',
  lg: 'h-10 px-4 text-xs sm:text-sm gap-2 rounded-xl font-semibold',
  icon: 'h-9 w-9 p-0 rounded-lg justify-center',
  'icon-sm': 'h-7 w-7 p-0 rounded-lg justify-center',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variantClass = VARIANT_STYLES[variant];
    const sizeClass = SIZE_STYLES[size];
    const widthClass = fullWidth ? 'w-full justify-center' : '';

    return (
      <button
        ref={ref}
        data-variant={variant}
        disabled={disabled || isLoading}
        className={`inline-flex items-center select-none font-sans transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F172A]/15 dark:focus:ring-slate-400/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none flex-shrink-0 ${variantClass} ${sizeClass} ${widthClass} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
        ) : (
          leftIcon
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
