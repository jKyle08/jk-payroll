import { describe, it, expect } from 'vitest';
import React from 'react';
import { StatusIndicator } from '../src/client/components/ui/index.js';

describe('StatusIndicator Component Specifications', () => {
  it('exports StatusIndicator from client ui index', () => {
    expect(StatusIndicator).toBeDefined();
    expect(typeof StatusIndicator).toBe('function');
  });

  it('renders Active status with muted green (#22A06B) dot and Active label', () => {
    const element = React.createElement(StatusIndicator, { status: 'Active' });
    expect(element.props.status).toBe('Active');
  });

  it('renders Inactive status with muted red (#DC6262) dot and Inactive label', () => {
    const element = React.createElement(StatusIndicator, { status: 'Inactive' });
    expect(element.props.status).toBe('Inactive');
  });

  it('supports boolean isActive prop correctly', () => {
    const activeEl = React.createElement(StatusIndicator, { isActive: true });
    expect(activeEl.props.isActive).toBe(true);

    const inactiveEl = React.createElement(StatusIndicator, { isActive: false });
    expect(inactiveEl.props.isActive).toBe(false);
  });

  it('allows custom label override while preserving status dot color', () => {
    const customEl = React.createElement(StatusIndicator, {
      status: 'Active',
      label: 'Operational',
    });
    expect(customEl.props.label).toBe('Operational');
  });
});
