// ==============================================================================
// JK-PAYROLL: REUSABLE SEARCH BUTTON COMPONENT
// Design System: "Midnight & Champagne Steel"
// File: src/components/ui/SearchButton.tsx
// ==============================================================================

import React from 'react';
import { Search } from 'lucide-react';

export interface SearchButtonProps {
  onClick?: () => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  title?: string;
}

export const SearchButton: React.FC<SearchButtonProps> = ({
  onClick,
  label = 'Search',
  disabled = false,
  className = '',
  type = 'button',
  title = 'Execute search',
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-10 px-4 rounded-lg bg-[#475569] hover:bg-[#334155] active:bg-[#1E293B] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all flex-shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Search className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
};

export default SearchButton;

