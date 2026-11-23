// ==============================================================================
// PAYPULSE ENTERPRISE TOAST NOTIFICATION SYSTEM: TOAST CONTAINER
// Design System: Balanced Glossy Graphite Luxury Translucent Glassmorphism
// Dynamic Shell Integration, Max-3 Stacking, Managed Queue, and Responsive Positioning
// File: src/client/components/ui/toast/ToastContainer.tsx
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { ToastItem, ToastPosition, ToastQueueState } from './toast-types.js';
import { toastStore } from './toast-store.js';
import { ToastCard } from './ToastCard.js';

export interface ToastContainerProps {
  position?: ToastPosition;
  className?: string;
  defaultSpacing?: number;
}

export const DEFAULT_TOPBAR_HEIGHT_PX = 56; // 3.5rem (matches --app-topbar-height)
export const DEFAULT_TOAST_SPACING_PX = 16;  // 1rem (matches --toast-spacing)

/**
 * Dynamically measures the actual application shell / topbar element height
 * to calculate the exact vertical offset, preventing any overlap with topbar navigation.
 * Defaults immediately to topbar height + spacing (72px) to prevent layout flash on mount.
 */
export function useTopbarOffset(defaultSpacing = DEFAULT_TOAST_SPACING_PX): number {
  const [offset, setOffset] = useState<number>(() => {
    if (typeof document !== 'undefined') {
      const topbar =
        document.getElementById('app-topbar') ||
        document.querySelector('[data-app-topbar="true"]');

      if (topbar) {
        const rect = topbar.getBoundingClientRect();
        const topbarHeight = rect.height > 0 ? rect.height : DEFAULT_TOPBAR_HEIGHT_PX;
        return Math.round(topbarHeight + defaultSpacing);
      }
    }
    return DEFAULT_TOPBAR_HEIGHT_PX + defaultSpacing;
  });

  useEffect(() => {
    const updateOffset = () => {
      if (typeof document === 'undefined') return;

      const topbar =
        document.getElementById('app-topbar') ||
        document.querySelector('[data-app-topbar="true"]');

      if (topbar) {
        const rect = topbar.getBoundingClientRect();
        const topbarHeight = rect.height > 0 ? rect.height : DEFAULT_TOPBAR_HEIGHT_PX;
        setOffset(Math.round(topbarHeight + defaultSpacing));
      } else {
        setOffset(DEFAULT_TOPBAR_HEIGHT_PX + defaultSpacing);
      }
    };

    updateOffset();

    let resizeObserver: ResizeObserver | null = null;
    const topbar =
      typeof document !== 'undefined'
        ? document.getElementById('app-topbar') ||
          document.querySelector('[data-app-topbar="true"]')
        : null;

    if (topbar && typeof ResizeObserver !== 'undefined') {
      try {
        resizeObserver = new ResizeObserver(() => updateOffset());
        resizeObserver.observe(topbar);
      } catch {
        // Fallback for environments lacking ResizeObserver
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateOffset);
      window.addEventListener('scroll', updateOffset, { passive: true });
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateOffset);
        window.removeEventListener('scroll', updateOffset);
      }
    };
  }, [defaultSpacing]);

  return offset;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'top-right',
  className = '',
  defaultSpacing = DEFAULT_TOAST_SPACING_PX,
}) => {
  const [queueState, setQueueState] = useState<ToastQueueState>(() =>
    toastStore.getState()
  );
  const topbarOffset = useTopbarOffset(defaultSpacing);

  useEffect(() => {
    return toastStore.subscribe((state) => {
      setQueueState(state);
    });
  }, []);

  const { visible: toasts, queueCount } = queueState;

  if (toasts.length === 0 && queueCount === 0) {
    return null;
  }

  const isBottom = position.startsWith('bottom');
  const isCenter = position.endsWith('center');
  const isLeft = position.endsWith('left');

  // Newest notifications appear at the top of the stack (index 0)
  const displayToasts = isBottom ? [...toasts].reverse() : toasts;

  // Declarative topbar token positioning: always positions strictly below the topbar with 1rem spacing
  const containerStyle: React.CSSProperties = {
    ...(isBottom
      ? { bottom: `calc(var(--toast-spacing, 1rem) + env(safe-area-inset-bottom, 0px))` }
      : { top: `calc(var(--app-topbar-height, 3.5rem) + var(--toast-spacing, 1rem) + env(safe-area-inset-top, 0px))` }),
    zIndex: 'var(--z-toast, 45)' as any,
  };

  // Alignment classes for desktop and mobile
  // Mobile (<sm): Centered with horizontal margins, respecting safe area
  // Desktop (>=sm): Positioned with consistent 24px (right-6) offset from viewport/content area
  let horizontalClasses = 'left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 sm:items-end';

  if (isCenter) {
    horizontalClasses = 'left-1/2 -translate-x-1/2 items-center';
  } else if (isLeft) {
    horizontalClasses = 'left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 sm:right-auto sm:items-start';
  }

  return (
    <section
      role="region"
      aria-label="Notifications"
      style={containerStyle}
      data-testid="toast-container"
      data-top-offset={topbarOffset}
      data-queue-count={queueCount}
      className={`
        fixed z-[45] pointer-events-none flex flex-col gap-2.5
        w-full max-w-[calc(100vw-2rem)] sm:max-w-sm md:max-w-md
        transition-all duration-200
        pr-[env(safe-area-inset-right,0px)]
        pl-[env(safe-area-inset-left,0px)]
        motion-reduce:transition-none
        ${horizontalClasses}
        ${className}
      `}
    >
      {/* Active Visible Toasts Stack (Max 3) */}
      {displayToasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}

      {/* Subtle Remaining-Notification Queue Indicator Badge */}
      {queueCount > 0 && (
        <div
          role="status"
          aria-live="polite"
          data-testid="toast-queue-indicator"
          className="
            pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2
            rounded-xl text-xs font-medium select-none
            bg-slate-950/85 dark:bg-[#0B0E14]/90 backdrop-blur-xl
            border border-white/10 dark:border-white/[0.08]
            text-slate-300 shadow-[0_12px_28px_-6px_rgba(0,0,0,0.5)]
            transition-all duration-200
            motion-reduce:transition-none
          "
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse"
              aria-hidden="true"
            />
            <span className="text-[12px] text-slate-200">
              <strong className="font-semibold text-white">+{queueCount}</strong>{' '}
              more {queueCount === 1 ? 'notification' : 'notifications'} queued
            </span>
          </div>

          <button
            type="button"
            onClick={() => toastStore.clearQueue()}
            aria-label="Dismiss all queued notifications"
            className="
              text-[11px] font-medium text-slate-400 hover:text-white
              hover:underline underline-offset-2 transition-colors
              focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 cursor-pointer
              shrink-0
            "
          >
            Clear queue
          </button>
        </div>
      )}
    </section>
  );
};
