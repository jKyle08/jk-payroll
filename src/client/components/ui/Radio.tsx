// ==============================================================================
// PAYPULSE: STANDARDIZED RADIO COMPONENT
// Design System: Balanced Glossy Graphite
// File: src/client/components/ui/Radio.tsx
// ==============================================================================

import React, { forwardRef } from 'react';

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      label,
      description,
      disabled,
      checked,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className={`flex items-start gap-2.5 ${className}`}>
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            type="radio"
            id={inputId}
            checked={checked}
            disabled={disabled}
            aria-required={props.required ? 'true' : undefined}
            className="peer sr-only"
            {...props}
          />
          <label
            htmlFor={inputId}
            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-2xs select-none ${
              checked
                ? 'border-[#0F172A] dark:border-[#CBD5E1]'
                : 'bg-white dark:bg-[#121620] border-[#CBD5E1] dark:border-white/20 hover:border-slate-400 dark:hover:border-white/40'
            } peer-focus-visible:ring-2 peer-focus-visible:ring-[#0F172A]/20 dark:peer-focus-visible:ring-white/20 ${
              disabled
                ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-white/[0.02]'
                : ''
            }`}
          >
            {checked && (
              <span className="w-2 h-2 rounded-full bg-[#0F172A] dark:bg-[#CBD5E1]" />
            )}
          </label>
        </div>

        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={inputId}
                className={`text-xs font-semibold cursor-pointer select-none ${
                  disabled
                    ? 'text-slate-400 dark:text-[#64748B] cursor-not-allowed'
                    : 'text-[#111827] dark:text-[#F8FAFC]'
                }`}
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-0.5 select-none">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';
