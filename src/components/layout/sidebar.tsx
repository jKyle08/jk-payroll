// ==============================================================================
// JK-PAYROLL: REFACTORED B2B ENTERPRISE SIDEBAR
// Design System: "Midnight & Champagne Steel" (Ramp / Linear / Stripe Aesthetic)
// File: src/components/layout/sidebar.tsx
// ==============================================================================

import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  FileSpreadsheet,
  Coins,
  Building,
  Users2,
  ShieldCheck,
  Globe2,
  Briefcase,
  Sliders,
  FileCheck2,
  ChevronDown,
  ChevronsUpDown,
  Building2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Layers,
  Folder,
  Search,
  SearchX,
} from 'lucide-react';
import { usePermission } from '../../features/access-control/hooks/use-permission.js';
import { PERMISSIONS } from '../../lib/constants/permissions.js';

export type OperationalScope = 'Tenant' | 'EntireDepartment' | 'SubDepartment' | 'Self';

export interface NavItem {
  id: string;
  label: string;
  path?: string;
  icon?: React.ComponentType<{ className?: string }>;
  requiredPermission?: string;
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
}

export interface SidebarProps {
  userPermissions?: string[];
  activePath?: string;
  onNavigate?: (path: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  tenantCode?: string;
  organization?: OrganizationContext;
  onSwitchOrganization?: () => void;
  activeScope?: OperationalScope;
  onScopeChange?: (scope: OperationalScope) => void;
  moduleSearchQuery?: string;
  onModuleSearch?: (query: string) => void;
  roleName?: string;
}

const DEFAULT_ORGANIZATION: OrganizationContext = {
  id: 'org-apex',
  name: 'Apex Health Systems',
  code: 'APEX-HLTH',
  slug: 'org_apex',
  domain: 'apexhealth.internal',
};

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
        id: 'tenants',
        label: 'Organizations',
        path: '/admin/tenants',
        requiredPermission: PERMISSIONS.TENANT.VIEW,
        icon: Globe2,
      },
      {
        id: 'departments',
        label: 'Departments',
        path: '/admin/departments',
        requiredPermission: PERMISSIONS.DEPARTMENT.VIEW,
        icon: Building,
      },
      {
        id: 'employee-profiles',
        label: 'Staff Profiles',
        path: '/admin/profiles',
        requiredPermission: PERMISSIONS.PROFILE.VIEW,
        icon: Users2,
      },
      {
        id: 'employee-roles',
        label: 'Role Assignments',
        path: '/admin/roles',
        requiredPermission: PERMISSIONS.USER_ROLE.VIEW,
        icon: Briefcase,
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
        icon: ShieldCheck,
      },
      {
        id: 'user-permission-overrides',
        label: 'User Overrides',
        path: '/admin/security/user-overrides',
        requiredPermission: PERMISSIONS.USER_PERMISSION.VIEW,
        icon: Sliders,
      },
      {
        id: 'effective-rights-audit',
        label: 'Audit Logs',
        path: '/admin/security/audit',
        requiredPermission: PERMISSIONS.USER_PERMISSION.VIEW,
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
        icon: Coins,
        badge: 'Monthly',
      },
      {
        id: 'request-for-leave',
        label: 'Leave Requests Queue',
        path: '/leaves/requests',
        requiredPermission: PERMISSIONS.REQUEST_FOR_LEAVE.VIEW,
        icon: FileSpreadsheet,
      },
      {
        id: 'type-of-leave',
        label: 'Leave Policies',
        path: '/leaves/types',
        requiredPermission: PERMISSIONS.TYPE_OF_LEAVE.VIEW,
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
        id: 'tenants',
        label: 'Organizations',
        path: '/admin/tenants',
        requiredPermission: PERMISSIONS.TENANT.VIEW,
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
            id: 'employee-roles',
            label: 'User Role Assignments',
            path: '/admin/roles',
            requiredPermission: PERMISSIONS.USER_ROLE.VIEW,
            icon: Briefcase,
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

export const Sidebar: React.FC<SidebarProps> = ({
  userPermissions = [],
  activePath = '/dashboard',
  onNavigate,
  collapsed: controlledCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  tenantCode,
  organization = DEFAULT_ORGANIZATION,
  onSwitchOrganization,
  activeScope = 'Tenant',
  onScopeChange,
  moduleSearchQuery,
  onModuleSearch,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const [searchQuery, setSearchQuery] = useState(moduleSearchQuery || '');

  const { hasPermission } = usePermission(userPermissions);

  const activeOrg = {
    ...organization,
    code: tenantCode || organization.code,
  };

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  };

  const handleLinkClick = (path?: string) => {
    if (path && onNavigate) {
      onNavigate(path);
      if (onCloseMobile) onCloseMobile();
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    onModuleSearch?.(query);
  };

  // Filter flattened sections by user permissions and module search query
  const visibleSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FLATTENED_NAV_SECTIONS.map((section) => {
      const filteredItems = section.items.filter((item) => {
        const hasPerm = !item.requiredPermission || hasPermission(item.requiredPermission);
        if (!hasPerm) return false;
        if (!q) return true;
        return item.label.toLowerCase().includes(q);
      });
      return {
        ...section,
        items: filteredItems,
      };
    }).filter((section) => section.items.length > 0);
  }, [userPermissions, hasPermission, searchQuery]);

  return (
    <>
      {/* Mobile Backdrop Overlay (< lg) */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        aria-label="Application Navigation"
        className={`fixed top-14 bottom-0 left-0 bg-[#FBFBFC] border-r border-[#E5E7EB] z-40 flex flex-col transition-all duration-200 select-none ${
          isCollapsed ? 'w-16' : 'w-64'
        } ${
          isMobileOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* ================================================================== */}
        {/* 1. SIDEBAR HEADER: PROMOTED ORGANIZATION SWITCHER & SCOPE SELECTOR */}
        {/* ================================================================== */}
        <div className="p-3 border-b border-[#E5E7EB] bg-white space-y-2">
          {!isCollapsed ? (
            <>
              {/* Interactive Organization Switcher */}
              <button
                type="button"
                onClick={onSwitchOrganization}
                title="Switch active organization workspace"
                className="w-full flex items-center justify-between p-2 rounded-lg border border-[#E5E7EB] bg-[#FBFBFC] hover:bg-[#F1F5F9] text-left transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-md bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 tracking-wider">
                    {activeOrg.code.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-[#111827] truncate leading-tight group-hover:text-[#0F172A]">
                      {activeOrg.name}
                    </div>
                    <div className="text-[10px] font-mono text-[#6B7280] truncate leading-tight mt-0.5">
                      {activeOrg.slug}
                    </div>
                  </div>
                </div>
                <ChevronsUpDown className="w-3.5 h-3.5 text-[#6B7280] group-hover:text-[#111827] transition-colors flex-shrink-0 ml-1" />
              </button>

              {/* Search Modules Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search modules..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-[#E5E7EB] bg-[#FBFBFC] text-xs text-[#111827] placeholder-[#6B7280] focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition-all font-sans"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#6B7280] hover:text-[#111827] rounded transition-colors"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Collapsed Organization Icon Trigger */
            <div className="flex justify-center py-1">
              <button
                type="button"
                onClick={onSwitchOrganization}
                title={`${activeOrg.name} (${activeOrg.slug})`}
                className="w-9 h-9 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shadow-sm hover:scale-105 transition-transform"
              >
                {activeOrg.code.slice(0, 2)}
              </button>
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* 2. NAVIGATION LINKS: FLATTENED UNDER STRUCTURED SECTION HEADERS     */}
        {/* ================================================================== */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar text-xs">
          {visibleSections.length === 0 ? (
            <div className="text-center py-8 px-3">
              <SearchX className="w-6 h-6 text-[#9CA3AF] mx-auto mb-2 stroke-[1.5]" />
              <p className="text-xs font-medium text-[#475569]">No modules found</p>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">Try a different search term</p>
            </div>
          ) : (
            visibleSections.map((section) => (
            <div key={section.id} className="space-y-0.5">
              {/* Section Header */}
              {!isCollapsed ? (
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6B7280] font-mono select-none">
                  {section.title}
                </div>
              ) : (
                <div className="w-full flex justify-center py-1.5">
                  <div className="w-4 h-0.5 bg-[#E5E7EB] rounded" />
                </div>
              )}

              {/* Section Links */}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon || Layers;
                  const isActive = activePath === item.path;

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleLinkClick(item.path)}
                        title={isCollapsed ? item.label : undefined}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all group relative ${
                          isActive
                            ? 'bg-[#0F172A]/5 text-[#0F172A] font-semibold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-[#0F172A] before:rounded-r'
                            : 'text-[#475569] hover:text-[#111827] hover:bg-[#F1F5F9]/70 font-medium'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 transition-colors ${
                            isActive
                              ? 'text-[#0F172A]'
                              : 'text-[#6B7280] group-hover:text-[#111827]'
                          }`}
                        />

                        {!isCollapsed && (
                          <span className="truncate flex-1 text-left">{item.label}</span>
                        )}

                        {!isCollapsed && item.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider font-mono ${
                              isActive
                                ? 'bg-[#0F172A] text-white'
                                : 'bg-[#F1F5F9] text-[#475569] border border-[#E5E7EB]'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}

                        {/* Collapsed Tooltip */}
                        {isCollapsed && (
                          <div className="absolute left-full ml-2 px-2.5 py-1 bg-[#111827] text-white text-xs rounded-md whitespace-nowrap shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                            {item.label}
                            {item.badge && ` (${item.badge})`}
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )))}
        </div>

        {/* ================================================================== */}
        {/* 3. SIDEBAR FOOTER: VERSION STAMP, LIVE PILL & COLLAPSE TOGGLE       */}
        {/* ================================================================== */}
        <div className="p-3 border-t border-[#E5E7EB] bg-white flex items-center justify-between">
          {!isCollapsed ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-medium text-[#6B7280]">v2.4.0</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#047857]" />
                <span>LIVE</span>
              </span>
            </div>
          ) : (
            <span className="w-2 h-2 rounded-full bg-[#047857] mx-auto" title="System LIVE" />
          )}

          <button
            type="button"
            onClick={handleToggle}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`p-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:bg-[#F8FAFC] transition-colors ${
              isCollapsed ? 'hidden lg:flex' : ''
            }`}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
