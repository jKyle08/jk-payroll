// ==============================================================================
// PAYPULSE: STANDARDIZED INPUT COMPONENT
// Design System: Balanced Glossy Graphite
// File: src/client/components/ui/Input.tsx
// ==============================================================================

import React, { forwardRef } from 'react';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  inputSize?: InputSize;
  error?: string | boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  fullWidth?: boolean;
  isMonospace?: boolean;
}

const SIZE_STYLES: Record<InputSize, { container: string; input: string; iconPaddingLeft: string; iconPaddingRight: string }> = {
  sm: {
    container: 'h-8 text-xs rounded-lg',
    input: 'px-2.5 py-1 text-xs',
    iconPaddingLeft: 'pl-8',
    iconPaddingRight: 'pr-8',
  },
  md: {
    container: 'h-10 text-xs rounded-xl',
    input: 'px-3 py-2 text-xs',
    iconPaddingLeft: 'pl-9',
    iconPaddingRight: 'pr-9',
  },
  lg: {
    container: 'h-11 text-sm rounded-xl',
    input: 'px-3.5 py-2.5 text-sm',
    iconPaddingLeft: 'pl-10',
    iconPaddingRight: 'pr-10',
  },
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      inputSize = 'md',
      error,
      leftIcon,
      rightIcon,
      leftElement,
      rightElement,
      fullWidth = true,
      isMonospace = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const sizeConfig = SIZE_STYLES[inputSize];
    const hasError = Boolean(error);

    const paddingLeft = leftIcon ? sizeConfig.iconPaddingLeft : '';
    const paddingRight = rightIcon ? sizeConfig.iconPaddingRight : '';

    return (
      <div className={`relative flex items-center ${fullWidth ? 'w-full' : 'inline-flex'}`}>
        {leftIcon && (
          <div className="absolute left-3 flex items-center justify-center text-slate-400 dark:text-[#64748B] pointer-events-none">
            {leftIcon}
          </div>
        )}
        {leftElement && (
          <div className="absolute left-1.5 flex items-center">
            {leftElement}
          </div>
        )}

        <input
          ref={ref}
          disabled={disabled}
          aria-invalid={hasError ? 'true' : undefined}
          aria-required={props.required ? 'true' : undefined}
          className={`w-full ${sizeConfig.container} ${sizeConfig.input} ${paddingLeft} ${paddingRight} border transition-all bg-white dark:bg-[#121620] text-[#111827] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] shadow-2xs focus:outline-none ${
            hasError
              ? 'border-rose-400 dark:border-rose-500/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15 dark:focus:ring-rose-500/25'
              : 'border-[#E5E7EB] dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus:border-[#0F172A] dark:focus:border-white/50 focus:ring-2 focus:ring-[#0F172A]/45 dark:focus:ring-white/40'
          } ${
            disabled
              ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-white/[0.02]'
              : 'cursor-text'
          } ${isMonospace ? 'font-mono' : 'font-sans'} ${className}`}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-1.5 flex items-center">
            {rightElement}
          </div>
        )}
        {rightIcon && !rightElement && (
          <div className="absolute right-3 flex items-center justify-center text-slate-400 dark:text-[#64748B] pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
