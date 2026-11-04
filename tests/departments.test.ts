// ==============================================================================
// JK-PAYROLL: DEPARTMENT CRUD & HIERARCHY SPECIFICATIONS
// Test Suite: Migration schema adherence, repository CRUD, tree path computation,
// cycle detection, ON DELETE RESTRICT on sub-departments, and client exports.
// File: tests/departments.test.ts
// ==============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../src/db/repository.js';
import { departmentService } from '../src/features/departments/department.service.js';
import {
  DepartmentMain,
  DepartmentFormPage,
  DepartmentTable,
  DepartmentTableRow,
  DepartmentToolbar,
  DepartmentTree,
  useDepartments,
  useDepartmentMutations,
  fetchDepartments,
  fetchDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  fetchDepartmentTree,
  DEFAULT_DEPARTMENT_ORGANIZATIONS,
} from '../src/features/departments/index.js';

describe('Department SQL Migration & Schema Adherence', () => {
  it('verifies SQL migration file exists with requested fields and constraints', () => {
    const migrationPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20261104000003_departments_hierarchy_v2.sql'
    );
    expect(fs.existsSync(migrationPath)).toBe(true);

    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

    // Required fields:
    expect(sqlContent).toContain('description TEXT');
    expect(sqlContent).toContain('head_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL');
    expect(sqlContent).toContain('depth INTEGER NOT NULL DEFAULT 0');
    expect(sqlContent).toContain('tree_path TEXT');
    expect(sqlContent).toContain('uq_departments_organization_code');

    // Sample seeds:
    expect(sqlContent).toContain("'OPG'");
    expect(sqlContent).toContain("'Office of the Provincial Governor'");
    expect(sqlContent).toContain("'OPG-ITD'");
    expect(sqlContent).toContain("'IT Division'");
    expect(sqlContent).toContain("'OPG-PIO'");
  });
});

describe('Department Repository & Tree Path Architecture', () => {
  beforeEach(() => {
    db.resetTestData();
  });

  it('computes depth 0 and materialized path for top-level head department', () => {
    const orgId = '00000000-0000-0000-0000-000000000001';
    const dept = db.createDepartment({
      organizationId: orgId,
      code: 'TEST-OPG',
      name: 'Test Provincial Governor Office',
      description: 'Head executive office',
    });

    expect(dept.id).toBeDefined();
    expect(dept.depth).toBe(0);
    expect(dept.treePath).toBe('test-opg');
    expect(dept.parentDepartmentId).toBeNull();
  });

  it('computes depth 1 and materialized child path for sub-department', () => {
    const orgId = '00000000-0000-0000-0000-000000000001';
    const parent = db.createDepartment({
      organizationId: orgId,
      code: 'GOV',
      name: 'Governor Office',
    });

    const child = db.createDepartment({
      organizationId: orgId,
      parentDepartmentId: parent.id,
      code: 'GOV-IT',
      name: 'IT Division',
    });

    expect(child.depth).toBe(1);
    expect(child.treePath).toBe('gov/gov-it');
    expect(child.parentDepartmentId).toBe(parent.id);

    const grandChild = db.createDepartment({
      organizationId: orgId,
      parentDepartmentId: child.id,
      code: 'GOV-IT-NET',
      name: 'Network Infrastructure Unit',
    });

    expect(grandChild.depth).toBe(2);
    expect(grandChild.treePath).toBe('gov/gov-it/gov-it-net');
  });

  it('cascades depth and tree path changes down to all descendants on reparenting', () => {
    const orgId = '00000000-0000-0000-0000-000000000001';
    const deptA = db.createDepartment({ organizationId: orgId, code: 'DEPT-A', name: 'Dept A' });
    const deptB = db.createDepartment({ organizationId: orgId, code: 'DEPT-B', name: 'Dept B' });

    // Child under Dept A: depth 1, 'dept-a/sub-1'
    const child = db.createDepartment({
      organizationId: orgId,
      parentDepartmentId: deptA.id,
      code: 'SUB-1',
      name: 'Sub One',
    });
    expect(child.depth).toBe(1);
    expect(child.treePath).toBe('dept-a/sub-1');

    // Grandchild under Child: depth 2, 'dept-a/sub-1/unit-1'
    const grandChild = db.createDepartment({
      organizationId: orgId,
      parentDepartmentId: child.id,
      code: 'UNIT-1',
      name: 'Unit One',
    });
    expect(grandChild.depth).toBe(2);
    expect(grandChild.treePath).toBe('dept-a/sub-1/unit-1');

    // Reparent child to Dept B
    db.updateDepartment(child.id, { parentDepartmentId: deptB.id });

    const updatedChild = db.getDepartmentById(child.id);
    expect(updatedChild?.depth).toBe(1);
    expect(updatedChild?.treePath).toBe('dept-b/sub-1');

    const updatedGrandChild = db.getDepartmentById(grandChild.id);
    expect(updatedGrandChild?.depth).toBe(2);
    expect(updatedGrandChild?.treePath).toBe('dept-b/sub-1/unit-1');
  });

  it('prevents cyclic hierarchy (cannot set a descendant as parent or self as parent)', () => {
    const orgId = '00000000-0000-0000-0000-000000000001';
    const parent = db.createDepartment({ organizationId: orgId, code: 'P1', name: 'Parent One' });
    const child = db.createDepartment({ organizationId: orgId, parentDepartmentId: parent.id, code: 'C1', name: 'Child One' });

    // Self-parent attempt
    expect(() => {
      db.updateDepartment(parent.id, { parentDepartmentId: parent.id });
    }).toThrow('A department cannot be its own parent');

    // Cycle attempt: set parent's parent to child
    expect(() => {
      db.updateDepartment(parent.id, { parentDepartmentId: child.id });
    }).toThrow('Cannot set a descendant department as the parent');
  });

  it('enforces ON DELETE RESTRICT when department has sub-departments', () => {
    const orgId = '00000000-0000-0000-0000-000000000001';
    const parent = db.createDepartment({ organizationId: orgId, code: 'HEAD-DEPT', name: 'Head Dept' });
    db.createDepartment({ organizationId: orgId, parentDepartmentId: parent.id, code: 'SUB-DEPT', name: 'Sub Dept' });

    expect(() => {
      db.deleteDepartment(parent.id);
    }).toThrow(/Cannot delete department.*active sub-departments/i);
  });
});

describe('Department Service CRUD Lifecycle & KPI Metrics', () => {
  beforeEach(() => {
    db.resetTestData();
  });

  it('lists enriched departments with KPI metrics (total, active, root, sub)', () => {
    const orgId = '00000000-0000-0000-0000-000000000001';
    const result = departmentService.listDepartments({ organizationId: orgId });

    expect(result.items.length).toBeGreaterThanOrEqual(1);
    expect(result.total).toBe(result.items.length);
    expect(result.activeCount).toBeGreaterThanOrEqual(1);
    expect(result.rootCount).toBeGreaterThanOrEqual(1);

    // Verify enrichment has depthLabel and organizationName
    const first = result.items[0];
    expect(first.organizationName).toBeDefined();
    expect(first.depthLabel).toBeDefined();
    expect(first.treePath).toBeDefined();
  });

  it('executes full CRUD lifecycle on Department', () => {
    const orgId = '00000000-0000-0000-0000-000000000001';

    // 1. Create
    const created = departmentService.createDepartment({
      organizationId: orgId,
      code: 'PIO-DEV',
      name: 'Public Information Dev Division',
      description: 'Communications & digital outreach',
      isActive: true,
    });

    expect(created.id).toBeDefined();
    expect(created.code).toBe('PIO-DEV');
    expect(created.depth).toBe(0);

    // 2. Read by ID
    const fetched = departmentService.getDepartmentById(created.id);
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe('Public Information Dev Division');

    // 3. Update
    const updated = departmentService.updateDepartment(created.id, {
      name: 'Public Information and Press Division',
      description: 'Updated operational description',
    });

    expect(updated.name).toBe('Public Information and Press Division');
    expect(updated.description).toBe('Updated operational description');

    // 4. Delete
    const deleted = departmentService.deleteDepartment(created.id);
    expect(deleted).toBe(true);

    const fetchDeleted = departmentService.getDepartmentById(created.id);
    expect(fetchDeleted).toBeUndefined();
  });
});

describe('Department Client Exports & UI Components', () => {
  it('exports all department page components, hooks, and services', () => {
    expect(DepartmentMain).toBeDefined();
    expect(DepartmentFormPage).toBeDefined();
    expect(DepartmentTable).toBeDefined();
    expect(DepartmentTableRow).toBeDefined();
    expect(DepartmentToolbar).toBeDefined();
    expect(DepartmentTree).toBeDefined();
    expect(typeof useDepartments).toBe('function');
    expect(typeof useDepartmentMutations).toBe('function');
    expect(typeof fetchDepartments).toBe('function');
    expect(typeof fetchDepartmentById).toBe('function');
    expect(typeof createDepartment).toBe('function');
    expect(typeof updateDepartment).toBe('function');
    expect(typeof deleteDepartment).toBe('function');
    expect(typeof fetchDepartmentTree).toBe('function');
    expect(DEFAULT_DEPARTMENT_ORGANIZATIONS).toBeDefined();
  });

  it('verifies index.html has page-driven Department directory and form', () => {
    const indexHtmlPath = path.resolve(process.cwd(), 'public/index.html');
    expect(fs.existsSync(indexHtmlPath)).toBe(true);

    const html = fs.readFileSync(indexHtmlPath, 'utf-8');

    // Directory View & Form View
    expect(html).toContain('id="view-departments"');
    expect(html).toContain('id="view-department-form"');
    expect(html).toContain('id="department-definition-form"');

    // Controls and KPIs
    expect(html).toContain('id="metric-dept-total"');
    expect(html).toContain('id="metric-dept-active"');
    expect(html).toContain('id="metric-dept-head"');
    expect(html).toContain('id="metric-dept-sub"');

    // Toolbar & Filter inputs
    expect(html).toContain('id="dept-filter-search"');
    expect(html).toContain('id="dept-filter-org"');
    expect(html).toContain('id="dept-filter-depth"');
    expect(html).toContain('id="dept-filter-status"');
    expect(html).toContain('id="btn-dept-view-tree"');
    expect(html).toContain('id="btn-dept-view-table"');

    // Form inputs (internal debug preview card removed)
    expect(html).toContain('id="df-org-select"');
    expect(html).toContain('id="df-parent-select"');
    expect(html).toContain('id="df-code-input"');
    expect(html).toContain('id="df-name-input"');
    expect(html).not.toContain('id="df-preview-depth-badge"');
    expect(html).not.toContain('id="df-preview-tree-path"');
    expect(html).toContain('id="df-head-user-select"');

    // Filter toolbar comments fix (no raw JSX comments rendered)
    expect(html).not.toContain('{/* Search */}');
    expect(html).not.toContain('{/* Right Controls */}');

    // Table pagination toolbar
    expect(html).toContain('id="dept-pagination-bar"');
    expect(html).toContain('id="dept-page-size"');
    expect(html).toContain('id="dept-pagination-info"');
    expect(html).toContain('id="btn-dept-prev"');
    expect(html).toContain('id="dept-page-numbers"');
    expect(html).toContain('id="btn-dept-next"');

    // Pagination JavaScript handlers
    expect(html).toContain('function handleDeptPageChange(');
    expect(html).toContain('function handleDeptPageSizeChange(');
    expect(html).toContain('function goToDeptPage(');

    // 3-dots Actions Menu
    expect(html).toContain('id="department-action-dropdown-menu"');
    expect(html).toContain('function toggleDepartmentActionMenu(');
    expect(html).toContain('function closeDepartmentActionMenu(');
    expect(html).toContain('function executeDepartmentAction(');
    expect(html).toContain('toggleDepartmentActionMenu(event,');
  });
});
