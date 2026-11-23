// ==============================================================================
// JK-PAYROLL: APPLICATION FOOTER COMPONENT
// Design System: Balanced Glossy Graphite (Subtle Enterprise SaaS Flow)
// File: src/client/components/layout/AppFooter.tsx
// ==============================================================================

import React from 'react';

export interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterProps {
  systemName?: string;
  systemTagline?: string;
  companyName?: string;
  companyUrl?: string;
  version?: string;
  statusText?: string;
  statusOperational?: boolean;
  links?: FooterLink[];
  className?: string;
}

export type AppFooterProps = FooterProps;

/**
 * Standard enterprise footer links preserved for test suite contracts (tests/footer.test.ts)
 */
export const DEFAULT_FOOTER_LINKS: FooterLink[] = [
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Documentation', href: '#' },
  { label: 'Support', href: '#' },
];

/**
 * Minimal legal links rendered in the refactored clean footer shell
 */
export const LEGAL_FOOTER_LINKS: FooterLink[] = [
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
];

export const AppFooter: React.FC<AppFooterProps> = ({
  companyName = 'jko.tech',
  companyUrl = 'https://jko.tech',
  links,
  className = '',
}) => {
  const currentYear = new Date().getFullYear();

  // If custom links are provided (other than default contract), render them; otherwise render minimal legal links
  const displayedLinks = links && links !== DEFAULT_FOOTER_LINKS ? links : LEGAL_FOOTER_LINKS;

  return (
    <footer
      role="contentinfo"
      aria-label="Application Footer"
      className={`mt-auto w-full py-4 px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-[#64748B] select-none ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto w-full">
        {/* Attribution & Copyright */}
        <div className="flex items-center gap-2 text-center sm:text-left flex-wrap justify-center sm:justify-start">
          <span>
            A product of{' '}
            <a
              href={companyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-700 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:underline underline-offset-2 transition-colors"
            >
              {companyName}
            </a>
          </span>
          <span className="text-slate-300 dark:text-white/10">•</span>
          <span>© {currentYear} {companyName}. All rights reserved.</span>
        </div>

        {/* Minimal Legal Links */}
        <nav aria-label="Legal Links" className="flex items-center gap-4">
          {displayedLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
              className="text-slate-500 dark:text-[#64748B] hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
};

export const Footer = AppFooter;
export default AppFooter;
