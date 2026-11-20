// ==============================================================================
// JK-PAYROLL: TABLE ACTION MENU UNIT TESTS
// File: tests/table-action-menu.test.ts
// ==============================================================================

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { TableActionMenu } from '../src/client/components/ui/index.js';

describe('TableActionMenu Component Specifications', () => {
  it('exports TableActionMenu from client ui index', () => {
    expect(TableActionMenu).toBeDefined();
    expect(typeof TableActionMenu).toBe('function');
  });

  it('renders TableActionMenu with default props and actions array', () => {
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    const element = React.createElement(TableActionMenu, {
      title: 'Item Actions',
      actions: [
        {
          label: 'Edit Item',
          onClick: handleEdit,
        },
        {
          label: 'Delete Item',
          variant: 'danger',
          divider: true,
          onClick: handleDelete,
        },
      ],
    });

    expect(element).toBeDefined();
    expect(element.props.title).toBe('Item Actions');
    expect(element.props.actions).toHaveLength(2);
    expect(element.props.actions[0].label).toBe('Edit Item');
    expect(element.props.actions[1].variant).toBe('danger');
    expect(element.props.actions[1].divider).toBe(true);
  });

  it('supports alignment override and custom classes', () => {
    const element = React.createElement(TableActionMenu, {
      align: 'left',
      className: 'custom-menu-class',
      actions: [{ label: 'Action 1', onClick: vi.fn() }],
    });

    expect(element.props.align).toBe('left');
    expect(element.props.className).toBe('custom-menu-class');
  });

  it('handles empty actions or hidden actions gracefully', () => {
    const element = React.createElement(TableActionMenu, {
      actions: [
        { label: 'Hidden 1', onClick: vi.fn(), hidden: true },
        { label: 'Hidden 2', onClick: vi.fn(), hidden: true },
      ],
    });

    expect(element.props.actions).toHaveLength(2);
  });
});
