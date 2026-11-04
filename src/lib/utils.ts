// ==============================================================================
// JK-PAYROLL: SHARED UTILITIES
// File: src/lib/utils.ts
// ==============================================================================

/**
 * Concatenates and cleans CSS class strings.
 */
export function cn(...inputs: (string | boolean | null | undefined)[]): string {
  return inputs.filter(Boolean).join(' ');
}

/**
 * Formats a currency amount into standard localized currency string (e.g. PHP 24,500.00).
 */
export function formatCurrency(
  amount: number,
  currency: string = 'PHP',
  locale: string = 'en-PH'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats an ISO date string or Date object into human-readable date.
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Generates initials from a full name (e.g. "Alexander Wright" -> "AW").
 */
export function getInitials(name?: string): string {
  if (!name) return 'JK';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
