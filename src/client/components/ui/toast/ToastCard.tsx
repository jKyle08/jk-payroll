// ==============================================================================
// PAYPULSE ENTERPRISE NOTIFICATION INFRASTRUCTURE: LUXURY GLASS TOAST CARD
// Design System: Translucent Graphite Glassmorphism with Reflective Top Specular Highlight
// File: src/client/components/ui/toast/ToastCard.tsx
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  X,
} from 'lucide-react';
import { ToastItem, ToastType } from './toast-types.js';
import { toastStore } from './toast-store.js';

export interface ToastCardProps {
  toast: ToastItem;
}

const TYPE_CONFIG: Record<
  ToastType,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    iconContainerClass: string;
    iconClass: string;
    progressBarClass: string;
    role: 'alert' | 'status';
    ariaLive: 'assertive' | 'polite';
  }
> = {
  success: {
    icon: CheckCircle2,
    label: 'Success',
    iconContainerClass:
      'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.18)]',
    iconClass: 'text-emerald-400',
    progressBarClass: 'bg-emerald-400',
    role: 'status',
    ariaLive: 'polite',
  },
  error: {
    icon: AlertCircle,
    label: 'Error',
    iconContainerClass:
      'bg-rose-500/15 text-rose-400 border border-rose-500/25 shadow-[0_0_12px_rgba(244,63,94,0.18)]',
    iconClass: 'text-rose-400',
    progressBarClass: 'bg-rose-400',
    role: 'alert',
    ariaLive: 'assertive',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Warning',
    iconContainerClass:
      'bg-amber-500/15 text-amber-400 border border-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.18)]',
    iconClass: 'text-amber-400',
    progressBarClass: 'bg-amber-400',
    role: 'status',
    ariaLive: 'polite',
  },
  info: {
    icon: Info,
    label: 'Information',
    iconContainerClass:
      'bg-sky-500/15 text-sky-400 border border-sky-500/25 shadow-[0_0_12px_rgba(14,165,233,0.18)]',
    iconClass: 'text-sky-400',
    progressBarClass: 'bg-sky-400',
    role: 'status',
    ariaLive: 'polite',
  },
  loading: {
    icon: Loader2,
    label: 'Loading',
    iconContainerClass:
      'bg-slate-400/15 text-slate-200 border border-white/15 shadow-[0_0_12px_rgba(255,255,255,0.1)]',
    iconClass: 'text-slate-200 animate-spin',
    progressBarClass: 'bg-slate-400',
    role: 'status',
    ariaLive: 'polite',
  },
};

export const ToastCard: React.FC<ToastCardProps> = ({ toast }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [progress, setProgress] = useState(100);
  const config = TYPE_CONFIG[toast.type];
  const IconComponent = config.icon;
  const isAutoExpiring = toast.duration > 0 && toast.duration !== Infinity;
  const startTimeRef = useRef<number>(Date.now());
  const initialDurationRef = useRef<number>(toast.duration);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Entrance micro-animation
    const mountTimer = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(mountTimer);
  }, []);

  // Sync initial duration when toast updates (e.g. from loading to success)
  useEffect(() => {
    initialDurationRef.current = toast.duration;
    startTimeRef.current = Date.now();
  }, [toast.duration, toast.type]);

  // Smooth sub-pixel progress bar animation loop
  useEffect(() => {
    if (!isAutoExpiring) {
      setProgress(100);
      return;
    }

    const updateProgress = () => {
      if (toast.isPaused) {
        animFrameRef.current = requestAnimationFrame(updateProgress);
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;
      const total = initialDurationRef.current;
      const remainingPercent = Math.max(0, 100 - (elapsed / total) * 100);

      setProgress(remainingPercent);

      if (remainingPercent > 0) {
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isAutoExpiring, toast.isPaused, toast.type, toast.duration]);

  const handleMouseEnter = () => {
    toastStore.pause(toast.id);
  };

  const handleMouseLeave = () => {
    startTimeRef.current =
      Date.now() -
      (initialDurationRef.current - (toast.remainingTime ?? initialDurationRef.current));
    toastStore.resume(toast.id);
  };

  const handleFocus = () => {
    toastStore.pause(toast.id);
  };

  const handleBlur = () => {
    startTimeRef.current =
      Date.now() -
      (initialDurationRef.current - (toast.remainingTime ?? initialDurationRef.current));
    toastStore.resume(toast.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      toastStore.dismiss(toast.id);
    }
  };

  const handleDismiss = () => {
    toastStore.dismiss(toast.id);
  };

  const isVisible = isMounted && !toast.isExiting;

  return (
    <div
      role={config.role}
      aria-live={config.ariaLive}
      aria-atomic="true"
      tabIndex={0}
      data-testid="toast-card"
      data-toast-id={toast.id}
      data-toast-type={toast.type}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`
        group relative pointer-events-auto w-full max-w-sm sm:max-w-md
        rounded-2xl overflow-hidden select-none
        bg-slate-950/85 dark:bg-[#070b14]/90 backdrop-blur-xl
        border border-white/10 dark:border-white/[0.08]
        shadow-[0_20px_48px_-8px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06)_inset]
        p-3.5 sm:p-4
        transition-all duration-200 ease-out
        motion-reduce:transition-none motion-reduce:transform-none
        focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
        before:absolute before:inset-x-0 before:top-0 before:h-[1px]
        before:bg-gradient-to-r before:from-transparent before:via-white/35 before:to-transparent
        before:pointer-events-none
        ${
          isVisible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-2 sm:translate-y-0 sm:translate-x-2 scale-95'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Semantic Icon Container with Specular Ambient Glow */}
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${config.iconContainerClass}`}
          aria-hidden="true"
        >
          {toast.icon ? (
            toast.icon
          ) : (
            <IconComponent className={`w-4 h-4 ${config.iconClass}`} />
          )}
        </div>

        {/* Content Section with High-Contrast Typography */}
        <div className="flex-1 min-w-0 pr-1">
          <span className="sr-only">{config.label}: </span>

          {toast.title && (
            <div className="text-xs sm:text-[13px] font-semibold text-white tracking-tight leading-snug break-words">
              {toast.title}
            </div>
          )}

          {toast.description && (
            <div
              className={`text-[11px] sm:text-xs text-slate-300 leading-relaxed break-words font-normal ${
                toast.title ? 'mt-0.5' : ''
              }`}
            >
              {toast.description}
            </div>
          )}

          {/* Action / Cancel Buttons */}
          {(toast.action || toast.cancel) && (
            <div className="mt-2.5 flex items-center gap-2 pt-0.5">
              {toast.action && (
                <button
                  type="button"
                  onClick={(e) => {
                    toast.action?.onClick(e, toast);
                    handleDismiss();
                  }}
                  className={`
                    text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 cursor-pointer
                    ${
                      toast.action.primary !== false
                        ? 'bg-white/15 hover:bg-white/25 active:bg-white/20 text-white border border-white/20 shadow-xs'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }
                  `}
                >
                  {toast.action.label}
                </button>
              )}

              {toast.cancel && (
                <button
                  type="button"
                  onClick={(e) => {
                    toast.cancel?.onClick?.(e, toast);
                    handleDismiss();
                  }}
                  className="text-[11px] font-medium text-slate-400 hover:text-white px-2 py-1 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 cursor-pointer"
                >
                  {toast.cancel.label}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Minimal Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          className="
            p-1.5 rounded-lg text-slate-400 hover:text-white
            hover:bg-white/10 transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 cursor-pointer
            shrink-0 -mr-1 -mt-1
          "
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expiration Progress Bar Track & Specular Fill */}
      {isAutoExpiring && (
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.06] overflow-hidden"
          aria-hidden="true"
        >
          <div
            className={`h-full transition-none ${config.progressBarClass}`}
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      )}
    </div>
  );
};
