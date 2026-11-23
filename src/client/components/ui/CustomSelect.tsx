// ==============================================================================
// JK-PAYROLL: CUSTOM SELECT (DROPDOWN WITHOUT SEARCH)
// Design System: Balanced Glossy Graphite
// File: src/client/components/ui/CustomSelect.tsx
// ==============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface CustomSelectProps {
  id?: string;
  name?: string;
  value?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  /** Open the menu above the trigger (useful at the bottom of clipped containers) */
  dropUp?: boolean;
  /** Compact size ('sm' = h-8) or standard size ('md' = h-10) */
  size?: 'sm' | 'md';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  id,
  name,
  value,
  onChange,
  options,
  label,
  placeholder = 'Select an option...',
  disabled = false,
  error,
  className = '',
  dropUp = false,
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  // Sync highlighted option when opening
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [isOpen, selectedIndex]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [isOpen, highlightedIndex]);

  // Helper to find next non-disabled option
  const getNextEnabledIndex = (currentIndex: number, step: 1 | -1) => {
    const len = options.length;
    if (len === 0) return -1;
    let next = currentIndex;
    for (let i = 0; i < len; i++) {
      next = (next + step + len) % len;
      if (!options[next].disabled) return next;
    }
    return currentIndex;
  };

  // Close when clicking outside and handle keyboard navigation
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) {
        if (
          document.activeElement === triggerRef.current &&
          (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ')
        ) {
          event.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightedIndex((prev) => getNextEnabledIndex(prev, 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightedIndex((prev) => getNextEnabledIndex(prev, -1));
      } else if (event.key === 'Home') {
        event.preventDefault();
        const firstEnabled = options.findIndex((o) => !o.disabled);
        if (firstEnabled >= 0) setHighlightedIndex(firstEnabled);
      } else if (event.key === 'End') {
        event.preventDefault();
        for (let i = options.length - 1; i >= 0; i--) {
          if (!options[i].disabled) {
            setHighlightedIndex(i);
            break;
          }
        }
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < options.length &&
          !options[highlightedIndex].disabled
        ) {
          onChange(options[highlightedIndex].value);
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, highlightedIndex, options, onChange]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={`space-y-1 ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1]"
        >
          {label}
        </label>
      )}

      {/* Hidden native input for form compatibility */}
      <input type="hidden" id={id} name={name} value={value} />

      <div className="relative">
        {/* Trigger Button */}
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`${
            size === 'sm' ? 'h-8 px-2.5 rounded-lg' : 'h-10 px-3 rounded-xl'
          } w-full text-xs border bg-white dark:bg-[#121620] text-[#111827] dark:text-[#F8FAFC] flex items-center justify-between transition-all cursor-pointer shadow-2xs ${
            error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10'
              : isOpen
              ? 'border-[#0F172A] ring-2 ring-[#0F172A]/45 dark:border-white/50 dark:ring-white/40'
              : 'border-[#E5E7EB] dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20 focus:outline-none focus:border-[#0F172A] dark:focus:border-white/50 focus:ring-2 focus:ring-[#0F172A]/45 dark:focus:ring-white/40'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-white/[0.02]' : ''}`}
        >
          <div className="flex items-center gap-2 truncate">
            {selectedOption?.icon}
            <span
              className={`truncate ${
                selectedOption ? 'font-medium' : 'text-[#9CA3AF] dark:text-[#64748B]'
              }`}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>

          <ChevronDown
            className={`w-4 h-4 text-[#6B7280] dark:text-[#94A3B8] flex-shrink-0 ml-2 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#0F172A] dark:text-[#F8FAFC]' : ''
            }`}
          />
        </button>

        {/* Floating Menu Popover (WITHOUT search) */}
        {isOpen && (
          <div
            role="listbox"
            className={`absolute left-0 right-0 ${dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} z-40 bg-white dark:bg-[#181D2A] border border-[#E5E7EB] dark:border-white/12 rounded-xl shadow-lg dark:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.15)] p-1.5 space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100`}
          >
            {options.map((option, idx) => {
              const isSelected = option.value === value;
              const isHighlighted = idx === highlightedIndex;
              return (
                <button
                  key={option.value}
                  ref={(el) => {
                    optionRefs.current[idx] = el;
                  }}
                  type="button"
                  role="option"
                  disabled={option.disabled}
                  aria-disabled={option.disabled}
                  aria-selected={isSelected}
                  onMouseEnter={() => !option.disabled && setHighlightedIndex(idx)}
                  onClick={() => !option.disabled && handleSelect(option.value)}
                  className={`w-full px-2.5 py-2 text-xs rounded-lg flex items-center justify-between text-left transition-colors ${
                    option.disabled
                      ? 'opacity-40 cursor-not-allowed select-none text-[#9CA3AF] dark:text-[#64748B]'
                      : 'cursor-pointer'
                  } ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-[#202637] font-semibold text-[#0F172A] dark:text-[#F8FAFC]'
                      : isHighlighted && !option.disabled
                      ? 'bg-[#F1F5F9] dark:bg-white/[0.08] text-[#111827] dark:text-[#F8FAFC] font-medium'
                      : 'text-[#374151] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-white/[0.06] dark:hover:text-[#F8FAFC] font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {option.icon}
                    <div className="truncate">
                      <div className="truncate">{option.label}</div>
                      {option.description && (
                        <div className="text-[10px] text-[#6B7280] dark:text-[#64748B] font-normal truncate">
                          {option.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[#0F172A] dark:text-[#CBD5E1] flex-shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}
    </div>
  );
};
