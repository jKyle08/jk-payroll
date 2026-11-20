// ==============================================================================
// JK-PAYROLL: UNIVERSAL CONFIRMATION DIALOG COMPONENT
// Domain-agnostic modal for destructive deletions, actions, and confirmations
// Design System: "Midnight & Champagne Steel"
// File: src/components/ui/ConfirmDialog.tsx
// ==============================================================================

import React, { useEffect, useCallback } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import { Button } from './Button.js';

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
  const resolvedConfirmLabel = confirmLabel || confirmText || 'Confirm';
  const resolvedCancelLabel = cancelLabel || cancelText || 'Cancel';
  // Close on Escape key press
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    },
    [onClose, isLoading]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Lock body scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Dimmed & Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={() => {
          if (!isLoading) onClose();
        }}
        aria-hidden="true"
      />

      {/* Dialog Surface (Champagne Steel / White) */}
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#E5E7EB] transition-all transform scale-100 z-10">
        <div className="flex items-start gap-4">
          {/* Icon Badge */}
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
              isDestructive
                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                : 'bg-slate-100 text-[#0F172A] border border-slate-200'
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
              className="text-base font-semibold text-[#111827] leading-6"
            >
              {title}
            </h3>
            <div className="mt-2 text-xs text-[#6B7280] leading-relaxed">
              {description}
            </div>
          </div>

          {/* Dismiss Icon */}
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB] dark:border-slate-800">
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={isLoading}
            onClick={onClose}
          >
            {resolvedCancelLabel}
          </Button>

          <Button
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
