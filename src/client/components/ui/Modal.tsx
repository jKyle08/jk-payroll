// ==============================================================================
// PAYPULSE: STANDARDIZED MODAL & DIALOG COMPONENT
// Design System: Balanced Glossy Graphite
// File: src/client/components/ui/Modal.tsx
// ==============================================================================

import React, { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';
import { registerModal } from './modal-inert.js';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  size?: ModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  className?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

const SIZE_STYLES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[calc(100vw-2rem)] min-h-[80vh]',
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  showCloseButton = true,
  className = '',
  initialFocusRef,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();
  const modalId = useId();

  useEffect(() => {
    if (!isOpen) return;

    // 1. Save previously active element for focus restoration on close
    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;

    // 2. Lock body scroll and isolate background DOM via inert
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const cleanupInert = registerModal(modalId, modalRef.current, previouslyFocusedElementRef.current);

    // 3. Set initial focus
    const focusTimer = setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else {
          modalRef.current.focus();
        }
      }
    }, 50);

    // 4. Keyboard navigation & focus trap
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null); // visible elements only

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || document.activeElement === modalRef.current) {
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
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      cleanupInert();

      // 5. Restore focus to previous element on close
      if (previouslyFocusedElementRef.current && typeof previouslyFocusedElementRef.current.focus === 'function') {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, [isOpen, onClose, initialFocusRef]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-modal-container="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Surface Card */}
      <div
        ref={modalRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${SIZE_STYLES[size]} bg-white dark:bg-[#181D2A] rounded-2xl border border-[#E5E7EB] dark:border-white/12 shadow-2xl dark:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.18)] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] focus:outline-none ${className}`}
      >
        {/* Top Specular Line in Dark Mode */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        {/* Modal Header */}
        {(title || showCloseButton) && (
          <div className="p-6 pb-4 flex items-start justify-between gap-4 border-b border-slate-100 dark:border-white/10 flex-shrink-0">
            <div>
              {title && (
                <h3
                  id={titleId}
                  className="text-base sm:text-lg font-bold text-[#111827] dark:text-[#F8FAFC] tracking-tight"
                >
                  {title}
                </h3>
              )}
              {description && (
                <p id={descId} className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-[#94A3B8] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer flex-shrink-0"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar text-xs text-[#334155] dark:text-[#CBD5E1]">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="p-6 pt-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-[#141924]/50 flex items-center justify-end gap-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
