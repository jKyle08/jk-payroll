// ==============================================================================
// JK-PAYROLL: SEARCHABLE SELECT (DROPDOWN WITH REAL-TIME SEARCH)
// Design System: "Midnight & Champagne Steel"
// File: src/components/ui/SearchableSelect.tsx
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
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Click outside and Esc handling
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`space-y-1 ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-[#374151] dark:text-slate-300"
        >
          {label}
        </label>
      )}

      {/* Hidden input for form tracking */}
      <input type="hidden" id={id} name={name} value={value} />

      <div className="relative">
        {/* Trigger Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`min-h-[42px] w-full px-3 py-1.5 text-xs rounded-xl border bg-white dark:bg-slate-800 text-[#111827] dark:text-white flex items-center justify-between transition-all cursor-pointer shadow-2xs ${
            error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10'
              : isOpen
              ? 'border-[#0F172A] ring-2 ring-[#0F172A]/10 dark:border-slate-400'
              : 'border-[#E5E7EB] dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
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
                  <div className="font-semibold text-xs text-[#111827] dark:text-white truncate">
                    {selectedOption.label}
                  </div>
                  {selectedOption.sublabel && (
                    <div className="text-[10px] text-[#6B7280] dark:text-slate-400 font-mono truncate">
                      {selectedOption.sublabel}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <span className="text-[#9CA3AF] dark:text-slate-400 font-medium">{placeholder}</span>
            )}
          </div>

          <ChevronDown
            className={`w-4 h-4 text-[#6B7280] dark:text-slate-400 flex-shrink-0 ml-2 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#0F172A] dark:text-white' : ''
            }`}
          />
        </button>

        {/* Floating Menu Popover (WITH Search Bar) */}
        {isOpen && (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Integrated Search Input Header */}
            <div className="p-2 border-b border-[#E5E7EB] dark:border-slate-800 bg-[#FBFBFC] dark:bg-slate-800/60 sticky top-0 z-10">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-[#9CA3AF] pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-8 w-full pl-8 pr-7 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#0F172A] dark:focus:ring-slate-400"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Filtered Options */}
            <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(option.value)}
                      className={`w-full px-2.5 py-2 text-xs rounded-lg flex items-center justify-between text-left transition-colors ${
                        isSelected
                          ? 'bg-slate-100 dark:bg-slate-800 font-semibold text-[#0F172A] dark:text-white'
                          : 'text-[#374151] dark:text-slate-300 hover:bg-[#F8FAFC] dark:hover:bg-slate-800/60 font-medium'
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
                            <span className="font-semibold text-xs text-[#111827] dark:text-white truncate">
                              {option.label}
                            </span>
                            {option.badge && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                {option.badge}
                              </span>
                            )}
                          </div>
                          {option.sublabel && (
                            <div className="text-[10px] text-[#6B7280] dark:text-slate-400 font-mono truncate">
                              {option.sublabel}
                            </div>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[#0F172A] dark:text-white flex-shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-[#6B7280] dark:text-slate-400">
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
