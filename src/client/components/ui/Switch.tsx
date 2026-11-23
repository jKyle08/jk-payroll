// ==============================================================================
// PAYPULSE: STANDARDIZED SWITCH (TOGGLE) COMPONENT
// Design System: Balanced Glossy Graphite
// File: src/client/components/ui/Switch.tsx
// ==============================================================================

import React, { forwardRef } from 'react';

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      label,
      description,
      disabled,
      checked,
      className = '',
      id,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className={`flex items-start justify-between gap-3 ${className}`}>
        {(label || description) && (
          <div className="flex flex-col select-none">
            {label && (
              <label
                htmlFor={inputId}
                className={`text-xs font-semibold cursor-pointer ${
                  disabled
                    ? 'text-slate-400 dark:text-[#64748B] cursor-not-allowed'
                    : 'text-[#111827] dark:text-[#F8FAFC]'
                }`}
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                {description}
              </p>
            )}
          </div>
        )}

        <div className="relative inline-flex items-center flex-shrink-0 mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            role="switch"
            id={inputId}
            checked={checked}
            aria-checked={checked}
            disabled={disabled}
            aria-required={props.required ? 'true' : undefined}
            onChange={onChange}
            className="peer sr-only"
            {...props}
          />
          <label
            htmlFor={inputId}
            className={`w-9 h-5 rounded-full transition-colors cursor-pointer border shadow-2xs relative block ${
              checked
                ? 'bg-[#0F172A] border-[#0F172A] dark:bg-[#CBD5E1] dark:border-[#CBD5E1]'
                : 'bg-slate-200 border-slate-300 dark:bg-[#121620] dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20'
            } peer-focus-visible:ring-2 peer-focus-visible:ring-[#0F172A]/20 dark:peer-focus-visible:ring-white/20 ${
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-[#0F172A] shadow-xs transition-transform duration-200 ${
                checked ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </label>
        </div>
      </div>
    );
  }
);

Switch.displayName = 'Switch';
