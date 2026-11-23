// ==============================================================================
// JK-PAYROLL: SEARCHABLE SELECT (DROPDOWN WITH REAL-TIME SEARCH)
// Design System: Balanced Glossy Graphite
// File: src/client/components/ui/SearchableSelect.tsx
// ==============================================================================

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  avatarText?: string;
  avatarColor?: string;
  searchTerms?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  name,
  value,
  onChange,
  options,
  label,
  placeholder = 'Select an item...',
  searchPlaceholder = 'Search options...',
  disabled = false,
  error,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchSublabel = opt.sublabel?.toLowerCase().includes(q) || false;
      const matchBadge = opt.badge?.toLowerCase().includes(q) || false;
      const matchSearchTerms = opt.searchTerms?.toLowerCase().includes(q) || false;
      return matchLabel || matchSublabel || matchBadge || matchSearchTerms;
    });
  }, [options, query]);

  // Reset or initialize highlighted index when opening or filtering
  useEffect(() => {
    if (isOpen) {
      const selectedIdx = filteredOptions.findIndex((opt) => opt.value === value);
      setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setHighlightedIndex(-1);
    }
  }, [isOpen, filteredOptions.length]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [isOpen, highlightedIndex]);

  // Click outside and Esc handling
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
        setHighlightedIndex((prev) => {
          const len = filteredOptions.length;
          if (len === 0) return -1;
          let next = prev;
          for (let i = 0; i < len; i++) {
            next = (next + 1) % len;
            if (!filteredOptions[next].disabled) return next;
          }
          return prev;
        });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightedIndex((prev) => {
          const len = filteredOptions.length;
          if (len === 0) return -1;
          let next = prev <= 0 ? len - 1 : prev - 1;
          for (let i = 0; i < len; i++) {
            if (!filteredOptions[next].disabled) return next;
            next = next <= 0 ? len - 1 : next - 1;
          }
          return prev;
        });
      } else if (event.key === 'Enter') {
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < filteredOptions.length &&
          !filteredOptions[highlightedIndex].disabled
        ) {
          event.preventDefault();
          onChange(filteredOptions[highlightedIndex].value);
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
  }, [isOpen, highlightedIndex, filteredOptions, onChange]);

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

      {/* Hidden input for form tracking */}
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
          className={`min-h-[42px] w-full px-3 py-1.5 text-xs rounded-xl border bg-white dark:bg-[#121620] text-[#111827] dark:text-[#F8FAFC] flex items-center justify-between transition-all cursor-pointer shadow-2xs ${
            error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10'
              : isOpen
              ? 'border-[#0F172A] ring-2 ring-[#0F172A]/45 dark:border-white/50 dark:ring-white/40'
              : 'border-[#E5E7EB] dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20 focus:outline-none focus:border-[#0F172A] dark:focus:border-white/50 focus:ring-2 focus:ring-[#0F172A]/45 dark:focus:ring-white/40'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-white/[0.02]' : ''}`}
        >
          <div className="flex items-center gap-2.5 truncate min-w-0">
            {selectedOption ? (
              <>
                {selectedOption.avatarText && (
                  <div
                    className={`w-6 h-6 rounded-md text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 ${
                      selectedOption.avatarColor || 'bg-purple-600'
                    }`}
                  >
                    {selectedOption.avatarText}
                  </div>
                )}
                <div className="text-left truncate min-w-0">
                  <div className="font-semibold text-xs text-[#111827] dark:text-[#F8FAFC] truncate">
                    {selectedOption.label}
                  </div>
                  {selectedOption.sublabel && (
                    <div className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] font-mono truncate">
                      {selectedOption.sublabel}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <span className="text-[#9CA3AF] dark:text-[#64748B] font-medium">{placeholder}</span>
            )}
          </div>

          <ChevronDown
            className={`w-4 h-4 text-[#6B7280] dark:text-[#94A3B8] flex-shrink-0 ml-2 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#0F172A] dark:text-[#F8FAFC]' : ''
            }`}
          />
        </button>

        {/* Floating Menu Popover (WITH Search Bar) */}
        {isOpen && (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white dark:bg-[#181D2A] border border-[#E5E7EB] dark:border-white/12 rounded-xl shadow-xl dark:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Integrated Search Input Header */}
            <div className="p-2 border-b border-[#E5E7EB] dark:border-white/10 bg-[#FBFBFC] dark:bg-[#141924] sticky top-0 z-10">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-[#9CA3AF] dark:text-[#64748B] pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-8 w-full pl-8 pr-7 text-xs rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#121620] text-[#111827] dark:text-[#F8FAFC] placeholder-[#9CA3AF] dark:placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#0F172A] dark:focus:ring-white/50"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Filtered Options */}
            <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, idx) => {
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
                      <div className="flex items-center gap-2.5 truncate min-w-0">
                        {option.avatarText && (
                          <div
                            className={`w-6 h-6 rounded-md text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 ${
                              option.avatarColor || 'bg-purple-600'
                            }`}
                          >
                            {option.avatarText}
                          </div>
                        )}
                        <div className="truncate min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-[#111827] dark:text-[#F8FAFC] truncate">
                              {option.label}
                            </span>
                            {option.badge && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#121620] text-slate-600 dark:text-[#CBD5E1] border border-transparent dark:border-white/10 font-medium">
                                {option.badge}
                              </span>
                            )}
                          </div>
                          {option.sublabel && (
                            <div className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] font-mono truncate">
                              {option.sublabel}
                            </div>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[#0F172A] dark:text-[#CBD5E1] flex-shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-[#6B7280] dark:text-[#64748B]">
                  No matching options found for &ldquo;{query}&rdquo;
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}
    </div>
  );
};
