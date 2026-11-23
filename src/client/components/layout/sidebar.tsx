// ==============================================================================
// JK-PAYROLL: REFACTORED B2B ENTERPRISE SIDEBAR
// Design System: Balanced Glossy Graphite (Ramp / Linear / Stripe Aesthetic)
// File: src/client/components/layout/sidebar.tsx
// ==============================================================================

import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  FileSpreadsheet,
  Coins,
  Building,
  Users2,
  ShieldCheck,
  Shield,
  Globe2,
  Briefcase,
  Sliders,
  FileCheck2,
  Folder,
} from 'lucide-react';
import { PERMISSIONS } from '../../../shared/constants/permissions.js';
import { AppSidebar, AppSidebarProps } from './AppSidebar.js';

export type OperationalScope = 'Tenant' | 'EntireDepartment' | 'SubDepartment' | 'Self';

export interface NavItem {
  id: string;
  label: string;
  path?: string;
  icon?: React.ComponentType<{ className?: string }>;
  requiredPermission?: string;
  moduleCode?: string;
  badge?: string;
  badgeColor?: string;
  category?: string;
  children?: NavItem[];
}

export interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

export interface NavCategoryGroup {
  id: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  defaultOpen?: boolean;
}

export interface OrganizationContext {
  id: string;
  name: string;
  code: string;
  slug: string;
  domain?: string;
  modules?: string[];
  tier?: string;
  sector?: string;
  status?: string;
}

export interface SidebarProps extends AppSidebarProps {}

/**
 * Clean Flattened B2B Navigation Schema (Linear / Ramp / Stripe Style)
 * 4 Structured Sections: OVERVIEW, ADMINISTRATION, ACCESS & SECURITY, TRANSACTIONS & PAYROLL
 */
export const FLATTENED_NAV_SECTIONS: NavSection[] = [
  {
    id: 'overview-sec',
    title: 'OVERVIEW',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 'admin-sec',
    title: 'ADMINISTRATION',
    items: [
      {
        id: 'organizations',
        label: 'Organizations',
        path: '/organizations',
        requiredPermission: PERMISSIONS.ORGANIZATION.VIEW,
        moduleCode: 'Organization',
        icon: Globe2,
      },
      {
        id: 'departments',
        label: 'Departments',
        path: '/admin/departments',
        requiredPermission: PERMISSIONS.DEPARTMENT.VIEW,
        moduleCode: 'Department',
        icon: Building,
      },
      {
        id: 'employee-profiles',
        label: 'Staff Profiles',
        path: '/admin/profiles',
        requiredPermission: PERMISSIONS.PROFILE.VIEW,
        moduleCode: 'EmployeeProfile',
        icon: Users2,
      },
      {
        id: 'roles-directory',
        label: 'Role',
        path: '/admin/roles',
        requiredPermission: PERMISSIONS.ROLE.VIEW,
        moduleCode: 'RolePermission',
        icon: Shield,
      },
    ],
  },
  {
    id: 'security-sec',
    title: 'ACCESS & SECURITY',
    items: [
      {
        id: 'access-control',
        label: 'Role Permission Matrix',
        path: '/admin/permissions',
        requiredPermission: PERMISSIONS.ROLE_PERMISSION.VIEW,
        moduleCode: 'RolePermission',
        icon: ShieldCheck,
      },
      {
        id: 'user-permission-overrides',
        label: 'User Overrides',
        path: '/admin/security/user-overrides',
        requiredPermission: PERMISSIONS.USER_PERMISSION.VIEW,
        moduleCode: 'RolePermission',
        icon: Sliders,
      },
      {
        id: 'effective-rights-audit',
        label: 'Audit Logs',
        path: '/admin/security/audit',
        requiredPermission: PERMISSIONS.USER_PERMISSION.VIEW,
        moduleCode: 'RolePermission',
        icon: FileCheck2,
      },
    ],
  },
  {
    id: 'transactions-sec',
    title: 'TRANSACTIONS & PAYROLL',
    items: [
      {
        id: 'payroll-computation',
        label: 'Payroll Processing',
        path: '/payroll/compute',
        requiredPermission: PERMISSIONS.PAYROLL_COMPUTATION.VIEW,
        moduleCode: 'PayrollProcessing',
        icon: Coins,
        badge: 'Monthly',
      },
      {
        id: 'request-for-leave',
        label: 'Leave Requests Queue',
        path: '/leaves/requests',
        requiredPermission: PERMISSIONS.REQUEST_FOR_LEAVE.VIEW,
        moduleCode: 'RequestForLeave',
        icon: FileSpreadsheet,
      },
      {
        id: 'type-of-leave',
        label: 'Leave Policies',
        path: '/leaves/types',
        requiredPermission: PERMISSIONS.TYPE_OF_LEAVE.VIEW,
        moduleCode: 'TypeOfLeave',
        icon: CalendarCheck,
      },
    ],
  },
];

/**
 * Backward Compatibility Schema for Existing Unit Tests (tests/sidebar.test.ts)
 */
export const MULTI_LEVEL_NAV_GROUPS: NavCategoryGroup[] = [
  {
    id: 'core-overview',
    title: 'Overview & Insights',
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      {
        id: 'dashboard',
        label: 'Executive Dashboard',
        path: '/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 'administration-cat',
    title: 'Administration',
    icon: Building,
    defaultOpen: true,
    items: [
      {
        id: 'organizations',
        label: 'Organizations',
        path: '/organizations',
        requiredPermission: PERMISSIONS.ORGANIZATION.VIEW,
        moduleCode: 'Organization',
        icon: Globe2,
      },
      {
        id: 'departments-group',
        label: 'Department Hierarchy',
        icon: Building,
        children: [
          {
            id: 'departments',
            label: 'Department Tree',
            path: '/admin/departments',
            requiredPermission: PERMISSIONS.DEPARTMENT.VIEW,
            icon: Folder,
          },
          {
            id: 'dept-module-allocation',
            label: 'Dept Module Allocation',
            path: '/admin/departments/modules',
            requiredPermission: PERMISSIONS.DEPARTMENT_MODULE.VIEW,
            icon: Sliders,
          },
        ],
      },
      {
        id: 'staff-profiles-group',
        label: 'Staff & Personnel',
        icon: Users2,
        children: [
          {
            id: 'employee-profiles',
            label: 'Employee Directory',
            path: '/admin/profiles',
            requiredPermission: PERMISSIONS.PROFILE.VIEW,
            icon: Users2,
          },
          {
            id: 'roles-directory',
            label: 'Role',
            path: '/admin/roles',
            requiredPermission: PERMISSIONS.ROLE.VIEW,
            icon: Shield,
          },
        ],
      },
    ],
  },
  {
    id: 'access-control-cat',
    title: 'Access & Security',
    icon: ShieldCheck,
    defaultOpen: true,
    items: [
      {
        id: 'roles-security-group',
        label: 'Role Policies',
        children: [
          {
            id: 'access-control',
            label: 'Role Permission Matrix',
            path: '/admin/permissions',
            requiredPermission: PERMISSIONS.ROLE_PERMISSION.VIEW,
            icon: ShieldCheck,
          },
        ],
      },
    ],
  },
  {
    id: 'transactions-cat',
    title: 'Transactions & Leaves',
    icon: Coins,
    defaultOpen: true,
    items: [
      {
        id: 'leave-management-group',
        label: 'Leave Management',
        children: [
          {
            id: 'request-for-leave',
            label: 'Leave Requests & Approvals',
            path: '/leaves/requests',
            requiredPermission: PERMISSIONS.REQUEST_FOR_LEAVE.VIEW,
            icon: FileSpreadsheet,
          },
          {
            id: 'type-of-leave',
            label: 'Leave Types & Policies',
            path: '/leaves/types',
            requiredPermission: PERMISSIONS.TYPE_OF_LEAVE.VIEW,
            icon: CalendarCheck,
          },
        ],
      },
      {
        id: 'payroll-group',
        label: 'Payroll Operations',
        children: [
          {
            id: 'payroll-computation',
            label: 'Payroll Computation',
            path: '/payroll/compute',
            requiredPermission: PERMISSIONS.PAYROLL_COMPUTATION.VIEW,
            icon: Coins,
          },
        ],
      },
    ],
  },
];

export const DEFAULT_NAV_ITEMS = FLATTENED_NAV_SECTIONS.flatMap((s) => s.items);

export const Sidebar: React.FC<SidebarProps> = (props) => {
  return <AppSidebar {...props} />;
};

export { AppSidebar };
export default Sidebar;
