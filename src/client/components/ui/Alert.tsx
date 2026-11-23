// ==============================================================================
// PAYPULSE: STANDARDIZED ALERT BANNER COMPONENT
// Design System: Balanced Glossy Graphite
// File: src/client/components/ui/Alert.tsx
// ==============================================================================

import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'destructive';

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: AlertVariant;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  onDismiss?: () => void;
}

const VARIANT_CONFIG: Record<
  AlertVariant,
  {
    container: string;
    iconColor: string;
    DefaultIcon: React.ComponentType<{ className?: string }>;
  }
> = {
  info: {
    container:
      'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-500/30 text-blue-800 dark:text-blue-300',
    iconColor: 'text-blue-600 dark:text-blue-400',
    DefaultIcon: Info,
  },
  success: {
    container:
      'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    DefaultIcon: CheckCircle2,
  },
  warning: {
    container:
      'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300',
    iconColor: 'text-amber-600 dark:text-amber-400',
    DefaultIcon: AlertTriangle,
  },
  destructive: {
    container:
      'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300',
    iconColor: 'text-rose-600 dark:text-rose-400',
    DefaultIcon: AlertCircle,
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  icon,
  onDismiss,
  className = '',
  children,
  ...props
}) => {
  const config = VARIANT_CONFIG[variant];
  const IconComponent = config.DefaultIcon;

  return (
    <div
      role="alert"
      className={`p-4 rounded-xl border text-xs flex items-start gap-3 transition-colors ${config.container} ${className}`}
      {...props}
    >
      <div className={`mt-0.5 flex-shrink-0 ${config.iconColor}`}>
        {icon || <IconComponent className="w-4 h-4" />}
      </div>

      <div className="flex-1 min-w-0">
        {title && <h5 className="font-semibold mb-0.5 tracking-tight">{title}</h5>}
        <div className="text-xs leading-relaxed opacity-95">{children}</div>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg opacity-70 hover:opacity-100 transition-opacity flex-shrink-0 cursor-pointer"
          aria-label="Dismiss alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
