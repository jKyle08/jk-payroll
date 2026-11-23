// ==============================================================================
// PAYPULSE: STANDARDIZED FORM FIELD & LABEL COMPONENTS
// Design System: Balanced Glossy Graphite
// File: src/client/components/ui/FormField.tsx
// ==============================================================================

import React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  sublabel?: string;
}

export const Label: React.FC<LabelProps> = ({
  children,
  required,
  sublabel,
  className = '',
  ...props
}) => {
  return (
    <label
      className={`block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] select-none ${className}`}
      {...props}
    >
      <span className="flex items-center gap-1.5">
        <span>{children}</span>
        {required && <span className="text-rose-500 font-bold">*</span>}
        {sublabel && (
          <span className="text-[10px] font-normal text-[#6B7280] dark:text-[#64748B]">
            ({sublabel})
          </span>
        )}
      </span>
    </label>
  );
};

export interface FormDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const FormDescription: React.FC<FormDescriptionProps> = ({
  children,
  className = '',
  ...props
}) => {
  if (!children) return null;
  return (
    <p
      className={`text-[11px] text-[#6B7280] dark:text-[#64748B] mt-1 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
};

export interface FormErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const FormError: React.FC<FormErrorProps> = ({
  children,
  className = '',
  ...props
}) => {
  if (!children) return null;
  return (
    <p
      role="alert"
      className={`text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
};

export interface FormFieldProps {
  label?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  sublabel?: string;
  description?: React.ReactNode;
  error?: string | boolean | null;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  required,
  sublabel,
  description,
  error,
  className = '',
  children,
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <Label htmlFor={htmlFor} required={required} sublabel={sublabel}>
          {label}
        </Label>
      )}
      {children}
      {description && (
        <FormDescription id={htmlFor ? `${htmlFor}-desc` : undefined}>
          {description}
        </FormDescription>
      )}
      {typeof error === 'string' && error.trim() && (
        <FormError id={htmlFor ? `${htmlFor}-error` : undefined}>
          {error}
        </FormError>
      )}
    </div>
  );
};
