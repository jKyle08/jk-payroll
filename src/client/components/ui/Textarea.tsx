// ==============================================================================
// PAYPULSE: STANDARDIZED TEXTAREA COMPONENT
// Design System: Balanced Glossy Graphite
// File: src/client/components/ui/Textarea.tsx
// ==============================================================================

import React, { forwardRef } from 'react';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string | boolean;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      error,
      fullWidth = true,
      disabled,
      className = '',
      rows = 3,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);

    return (
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        aria-invalid={hasError ? 'true' : undefined}
        aria-required={props.required ? 'true' : undefined}
        className={`${fullWidth ? 'w-full' : ''} p-3 text-xs rounded-xl border transition-all bg-white dark:bg-[#121620] text-[#111827] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] shadow-2xs focus:outline-none custom-scrollbar ${
          hasError
            ? 'border-rose-400 dark:border-rose-500/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15 dark:focus:ring-rose-500/25'
            : 'border-[#E5E7EB] dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus:border-[#0F172A] dark:focus:border-white/50 focus:ring-2 focus:ring-[#0F172A]/45 dark:focus:ring-white/40'
        } ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-white/[0.02]'
            : ''
        } ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
