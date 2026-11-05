// ==============================================================================
// JK-PAYROLL: CUSTOM SELECT (DROPDOWN WITHOUT SEARCH)
// Design System: "Midnight & Champagne Steel"
// File: src/components/ui/CustomSelect.tsx
// ==============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

export interface CustomSelectProps {
  id?: string;
  name?: string;
  value: string;
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
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close when clicking outside
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

      {/* Hidden native input for form compatibility */}
      <input type="hidden" id={id} name={name} value={value} />

      <div className="relative">
        {/* Trigger Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`${
            size === 'sm' ? 'h-8 px-2.5 rounded-lg' : 'h-10 px-3 rounded-xl'
          } w-full text-xs border bg-white dark:bg-slate-800 text-[#111827] dark:text-white flex items-center justify-between transition-all cursor-pointer shadow-2xs ${
            error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10'
              : isOpen
              ? 'border-[#0F172A] ring-2 ring-[#0F172A]/10 dark:border-slate-400'
              : 'border-[#E5E7EB] dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
        >
          <div className="flex items-center gap-2 truncate">
            {selectedOption?.icon}
            <span
              className={`truncate ${
                selectedOption ? 'font-medium' : 'text-[#9CA3AF] dark:text-slate-400'
              }`}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>

          <ChevronDown
            className={`w-4 h-4 text-[#6B7280] dark:text-slate-400 flex-shrink-0 ml-2 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#0F172A] dark:text-white' : ''
            }`}
          />
        </button>

        {/* Floating Menu Popover (WITHOUT search) */}
        {isOpen && (
          <div
            role="listbox"
            className={`absolute left-0 right-0 ${dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} z-50 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 rounded-xl shadow-lg p-1.5 space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100`}
          >
            {options.map((option) => {
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
                  <div className="flex items-center gap-2 truncate">
                    {option.icon}
                    <div className="truncate">
                      <div className="truncate">{option.label}</div>
                      {option.description && (
                        <div className="text-[10px] text-[#6B7280] dark:text-slate-400 font-normal truncate">
                          {option.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[#0F172A] dark:text-white flex-shrink-0 ml-2" />
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
