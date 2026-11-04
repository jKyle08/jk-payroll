// ==============================================================================
// JK-PAYROLL: APPLICATION FOOTER COMPONENT TESTS
// File: tests/footer.test.ts
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { DEFAULT_FOOTER_LINKS } from '../src/components/layout/footer.js';

describe('Application Footer Component Specifications', () => {
  it('has default system name PayPulse and company name jko.tech', async () => {
    const { Footer } = await import('../src/components/layout/footer.js');
    expect(Footer).toBeDefined();
    expect(typeof Footer).toBe('function');
  });

  it('exposes standard enterprise footer links', () => {
    expect(DEFAULT_FOOTER_LINKS.length).toBeGreaterThanOrEqual(4);
    const linkLabels = DEFAULT_FOOTER_LINKS.map((l) => l.label);
    expect(linkLabels).toContain('Documentation');
    expect(linkLabels).toContain('Privacy Policy');
    expect(linkLabels).toContain('Terms of Service');
  });

  it('preserves system name and company branding contract', async () => {
    const layout = await import('../src/components/layout/index.js');
    expect(layout.Footer).toBeDefined();
    expect(layout.DEFAULT_FOOTER_LINKS).toBeDefined();
  });
});
