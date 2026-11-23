// ==============================================================================
// JK-PAYROLL: UNIVERSAL CONFIRMATION DIALOG COMPONENT
// Domain-agnostic modal for destructive deletions, actions, and confirmations
// Design System: Balanced Glossy Graphite
// File: src/client/components/ui/ConfirmDialog.tsx
// ==============================================================================

import React, { useEffect, useCallback, useRef, useId } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import { Button } from './Button.js';
import { registerModal } from './modal-inert.js';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmText,
  cancelText,
  isDestructive = false,
  isLoading = false,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();

  const resolvedConfirmLabel = confirmLabel || confirmText || 'Confirm';
  const resolvedCancelLabel = cancelLabel || cancelText || 'Cancel';

  useEffect(() => {
    if (!isOpen) return;

    // 1. Capture previously active element for focus restoration
    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;

    // 2. Lock body scroll and isolate background DOM via inert
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const cleanupInert = registerModal(dialogId, dialogRef.current, previouslyFocusedElementRef.current);

    // 3. Set initial focus (default to cancel on destructive dialogs to prevent accidental triggers)
    const timer = setTimeout(() => {
      if (isDestructive && cancelBtnRef.current) {
        cancelBtnRef.current.focus();
      } else if (confirmBtnRef.current) {
        confirmBtnRef.current.focus();
      }
    }, 50);

    // 4. Focus trapping & Escape key listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null);

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || document.activeElement === dialogRef.current) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      cleanupInert();

      // 5. Restore focus to trigger on close
      if (previouslyFocusedElementRef.current && typeof previouslyFocusedElementRef.current.focus === 'function') {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, [isOpen, isLoading, isDestructive, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      data-modal-container="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      {/* Dimmed & Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-[#0B0E14]/70 backdrop-blur-md transition-opacity duration-200"
        onClick={() => {
          if (!isLoading) onClose();
        }}
        aria-hidden="true"
      />

      {/* Dialog Surface (Balanced Glossy Graphite / White) */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#181D2A] dark:bg-gradient-to-b dark:from-[#202637] dark:to-[#161B27] p-6 shadow-2xl dark:shadow-[0_20px_48px_-8px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.18)] border border-[#E5E7EB] dark:border-white/12 transition-all transform scale-100 z-10 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:pointer-events-none focus:outline-none"
      >
        <div className="flex items-start gap-4">
          {/* Icon Badge */}
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
              isDestructive
                ? 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-500/25'
                : 'bg-slate-100 text-[#0F172A] border border-slate-200 dark:bg-white/[0.06] dark:text-[#CBD5E1] dark:border-white/10'
            }`}
          >
            {isDestructive ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Info className="w-5 h-5" />
            )}
          </div>

          {/* Dialog Content */}
          <div className="flex-1 min-w-0">
            <h3
              id="confirm-dialog-title"
              className="text-base font-semibold text-[#111827] dark:text-[#F8FAFC] leading-6"
            >
              {title}
            </h3>
            <div
              id="confirm-dialog-description"
              className="mt-2 text-xs text-[#6B7280] dark:text-[#94A3B8] leading-relaxed"
            >
              {description}
            </div>
          </div>

          {/* Dismiss Icon */}
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] p-1 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-white/[0.08] transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB] dark:border-white/10">
          <Button
            ref={cancelBtnRef}
            type="button"
            variant="secondary"
            size="md"
            disabled={isLoading}
            onClick={onClose}
          >
            {resolvedCancelLabel}
          </Button>

          <Button
            ref={confirmBtnRef}
            type="button"
            variant={isDestructive ? 'destructive' : 'primary'}
            size="md"
            isLoading={isLoading}
            onClick={onConfirm}
          >
            {resolvedConfirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
