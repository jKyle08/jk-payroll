// ==============================================================================
// JK-PAYROLL: APPLICATION FOOTER COMPONENT
// Design System: "Midnight & Champagne Steel" (Ramp / Linear / Stripe Aesthetic)
// File: src/components/layout/footer.tsx
// ==============================================================================

import React from 'react';
import { ShieldCheck, ExternalLink, Activity } from 'lucide-react';

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

export const DEFAULT_FOOTER_LINKS: FooterLink[] = [
  { label: 'Documentation', href: '#' },
  { label: 'Security & RBAC', href: '#' },
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Support', href: '#' },
];

export const Footer: React.FC<FooterProps> = ({
  systemName = 'PayPulse',
  systemTagline = 'Multi-Tenant Payroll & HR',
  companyName = 'jko.tech',
  companyUrl = 'https://jko.tech',
  version = 'v2.4.0',
  statusText = 'All Systems Operational',
  statusOperational = true,
  links = DEFAULT_FOOTER_LINKS,
  className = '',
}) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      role="contentinfo"
      aria-label="Application Footer"
      className={`mt-auto pt-8 pb-6 border-t border-[#E5E7EB] text-xs text-[#6B7280] select-none transition-all ${className}`}
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: System & Company Attribution */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-center md:text-left justify-center md:justify-start">
          {/* System Brand Pill */}
          <div className="inline-flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-[#0F172A] text-white flex items-center justify-center font-bold text-[10px] tracking-tight">
              {systemName.slice(0, 1)}
            </div>
            <span className="font-semibold text-[#111827]">{systemName}</span>
          </div>

          <span className="text-[#D1D5DB]">•</span>

          {/* Company Attribution */}
          <span>
            A product of{' '}
            <a
              href={companyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#111827] hover:text-[#0F172A] hover:underline underline-offset-2 transition-colors"
            >
              {companyName}
            </a>
          </span>

          <span className="text-[#D1D5DB]">•</span>

          {/* Copyright */}
          <span>© {currentYear} {companyName}. All rights reserved.</span>

          {/* Version mono badge */}
          {version && (
            <>
              <span className="text-[#D1D5DB] hidden sm:inline">•</span>
              <span className="hidden sm:inline font-mono text-[11px] text-[#6B7280] bg-[#F1F5F9] px-1.5 py-0.5 rounded border border-[#E5E7EB]">
                {version}
              </span>
            </>
          )}
        </div>

        {/* Right: Operational Status & System Links */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] justify-center md:justify-end">
          {/* Status Indicator */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              statusOperational
                ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
            }`}
            title={`System Status: ${statusText}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                statusOperational ? 'bg-[#047857] animate-pulse' : 'bg-[#B45309]'
              }`}
            />
            <span>{statusText}</span>
          </div>

          {/* Quick Links */}
          <nav aria-label="Footer Navigation" className="flex items-center gap-3">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                className="text-[#6B7280] hover:text-[#111827] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
};
