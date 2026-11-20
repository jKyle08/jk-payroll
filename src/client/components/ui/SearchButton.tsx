// ==============================================================================
// JK-PAYROLL: REUSABLE SEARCH BUTTON COMPONENT
// Design System: Monochromatic Enterprise SaaS ("Midnight & Champagne Steel")
// File: src/client/components/ui/SearchButton.tsx
// ==============================================================================

import React from 'react';
import { Search } from 'lucide-react';
import { Button } from './Button.js';

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
    <Button
      type={type}
      variant="primary"
      size="lg"
      onClick={onClick}
      disabled={disabled}
      title={title}
      leftIcon={<Search className="w-3.5 h-3.5" />}
      className={`h-10 ${className}`}
    >
      {label}
    </Button>
  );
};

export default SearchButton;
