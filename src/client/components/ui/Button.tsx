// ==============================================================================
// JK-PAYROLL: STANDARDIZED BUTTON COMPONENT
// Design System: Monochromatic Enterprise SaaS ("Midnight & Champagne Steel")
// File: src/client/components/ui/Button.tsx
// ==============================================================================

import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive';

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
  // Primary: Midnight Slate (#0F172A) in Light mode, Platinum Slate (#CBD5E1) in Dark mode
  primary:
    'bg-[#0F172A] hover:bg-[#1E293B] active:bg-[#020617] text-white border border-[#0F172A] focus:ring-[#0F172A]/15 focus-visible:ring-[#0F172A]/15 dark:bg-[#CBD5E1] dark:hover:bg-[#E2E8F0] dark:active:bg-[#94A3B8] dark:text-[#0F172A] dark:border-[#CBD5E1] dark:focus:ring-slate-400/20 dark:focus-visible:ring-slate-400/20 shadow-2xs',

  // Secondary: Neutral surface background, subtle neutral border, default foreground text
  secondary:
    'bg-white dark:bg-slate-800 hover:bg-[#F8FAFC] dark:hover:bg-slate-700/80 active:bg-[#F1F5F9] dark:active:bg-slate-700 text-[#334155] dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-700 shadow-2xs',

  // Outline: Transparent background, subtle neutral border, neutral foreground, minimal hover background
  outline:
    'bg-transparent hover:bg-[#F8FAFC] dark:hover:bg-slate-800 active:bg-[#F1F5F9] dark:active:bg-slate-700/80 text-[#475569] dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700',

  // Ghost: Transparent background, no visible border, muted foreground, subtle neutral hover background
  ghost:
    'bg-transparent hover:bg-[#F1F5F9] dark:hover:bg-slate-800 active:bg-[#E2E8F0] dark:active:bg-slate-700 text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white border-transparent',

  // Destructive: Muted red treatment, reserved strictly for destructive actions
  destructive:
    'bg-rose-50 hover:bg-rose-100/90 active:bg-rose-200/80 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:active:bg-rose-900/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 shadow-2xs',
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
