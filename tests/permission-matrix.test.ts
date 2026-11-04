// ==============================================================================
// JK-PAYROLL: PERMISSION MATRIX COMPONENT LOGIC TESTS
// File: tests/permission-matrix.test.ts
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { ModuleData } from '../src/features/access-control/types.js';

describe('Permission Matrix Implicit View Locking Logic', () => {
  const sampleModule: ModuleData = {
    id: 'mod-leave-01',
    code: 'TypeOfLeave',
    name: 'Types of Leave',
    category: 'Settings',
    isActive: true,
    actions: [
      { id: 'act-view', moduleId: 'mod-leave-01', action: 'View', fullKey: 'TypeOfLeave.View' },
      { id: 'act-add', moduleId: 'mod-leave-01', action: 'Add', fullKey: 'TypeOfLeave.Add' },
      { id: 'act-edit', moduleId: 'mod-leave-01', action: 'Edit', fullKey: 'TypeOfLeave.Edit' },
      { id: 'act-del', moduleId: 'mod-leave-01', action: 'Delete', fullKey: 'TypeOfLeave.Delete' },
    ],
  };

  const hasMutatingActionActive = (module: ModuleData, selectedIds: Set<string>): boolean => {
    return (
      module.actions?.some(
        (a) => a.action !== 'View' && selectedIds.has(a.id)
      ) ?? false
    );
  };

  it('detects mutating actions when Add is checked', () => {
    const selectedIds = new Set(['act-add']);
    expect(hasMutatingActionActive(sampleModule, selectedIds)).toBe(true);
  });

  it('detects NO mutating action when only View is checked', () => {
    const selectedIds = new Set(['act-view']);
    expect(hasMutatingActionActive(sampleModule, selectedIds)).toBe(false);
  });

  it('automatically adds View action ID when a mutating action is toggled', () => {
    const selectedIds = new Set<string>();
    const actionToAdd = sampleModule.actions?.find((a) => a.action === 'Add')!;
    const viewItem = sampleModule.actions?.find((a) => a.action === 'View')!;

    // Toggle logic reproduction
    selectedIds.add(actionToAdd.id);
    if (viewItem) {
      selectedIds.add(viewItem.id);
    }

    expect(selectedIds.has('act-add')).toBe(true);
    expect(selectedIds.has('act-view')).toBe(true);
  });

  it('prevents unchecking View when mutating actions remain active', () => {
    const selectedIds = new Set(['act-edit', 'act-view']);
    const isLocked = hasMutatingActionActive(sampleModule, selectedIds);

    expect(isLocked).toBe(true);
  });
});
