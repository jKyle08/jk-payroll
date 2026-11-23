// ==============================================================================
// PAYPULSE: STANDARDIZED NATIVE SELECT COMPONENT
// Design System: Balanced Glossy Graphite
// File: src/client/components/ui/Select.tsx
// ==============================================================================

import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectOptionItem {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  selectSize?: SelectSize;
  error?: string | boolean;
  options?: SelectOptionItem[];
  fullWidth?: boolean;
}

const SIZE_STYLES: Record<SelectSize, string> = {
  sm: 'h-8 px-2.5 text-xs rounded-lg',
  md: 'h-10 px-3 text-xs rounded-xl',
  lg: 'h-11 px-3.5 text-sm rounded-xl',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      selectSize = 'md',
      error,
      options,
      fullWidth = true,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const sizeClass = SIZE_STYLES[selectSize];
    const hasError = Boolean(error);

    return (
      <div className={`relative flex items-center ${fullWidth ? 'w-full' : 'inline-flex'}`}>
        <select
          ref={ref}
          disabled={disabled}
          aria-invalid={hasError ? 'true' : undefined}
          aria-required={props.required ? 'true' : undefined}
          className={`appearance-none w-full ${sizeClass} pr-9 border transition-all bg-white dark:bg-[#121620] text-[#111827] dark:text-[#F8FAFC] shadow-2xs focus:outline-none cursor-pointer font-medium ${
            hasError
              ? 'border-rose-400 dark:border-rose-500/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15 dark:focus:ring-rose-500/25'
              : 'border-[#E5E7EB] dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus:border-[#0F172A] dark:focus:border-white/50 focus:ring-2 focus:ring-[#0F172A]/45 dark:focus:ring-white/40'
          } ${
            disabled
              ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-white/[0.02]'
              : ''
          } ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.disabled}
                  className="bg-white dark:bg-[#181D2A] text-[#111827] dark:text-[#F8FAFC]"
                >
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        <div className="absolute right-3 flex items-center justify-center text-slate-400 dark:text-[#94A3B8] pointer-events-none">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';
