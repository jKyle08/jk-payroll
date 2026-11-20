// ==============================================================================
// JK-PAYROLL: PROFESSIONAL FIXED COLLAPSIBLE SIDEBAR
// Design System: "Midnight & Champagne Steel" (SaaS Dashboard Aesthetic)
// File: src/client/components/layout/AppSidebar.tsx
// ==============================================================================

import React, { useState, useMemo } from 'react';
import {
  ChevronsUpDown,
  Search,
  SearchX,
  X,
  Layers,
} from 'lucide-react';
import { useSidebar } from './SidebarContext.js';
import { UserProfileData } from './user-profile-popover.js';
import { usePermission } from '../../../features/access-control/hooks/use-permission.js';
import {
  FLATTENED_NAV_SECTIONS,
  OrganizationContext,
  OperationalScope,
} from './sidebar.js';

export interface AppSidebarProps {
  user?: UserProfileData;
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
  isSuperAdmin?: boolean;
}

const DEFAULT_ORGANIZATION: OrganizationContext = {
  id: 'org-apex',
  name: 'Apex Health Systems',
  code: 'APEX-HLTH',
  slug: 'org_apex',
  domain: 'apexhealth.internal',
};

export const AppSidebar: React.FC<AppSidebarProps> = ({
  user,
  userPermissions = [],
  activePath = '/dashboard',
  onNavigate,
  collapsed: propCollapsed,
  onToggleCollapse: propToggleCollapse,
  isMobileOpen: propMobileOpen,
  onCloseMobile: propCloseMobile,
  tenantCode,
  organization = DEFAULT_ORGANIZATION,
  onSwitchOrganization,
  moduleSearchQuery,
  onModuleSearch,
  roleName,
  isSuperAdmin = false,
}) => {
  const sidebarContext = useSidebar();

  const isCollapsed = propCollapsed !== undefined ? propCollapsed : sidebarContext.isCollapsed;
  const isMobileOpen = propMobileOpen !== undefined ? propMobileOpen : sidebarContext.isMobileOpen;
  const handleCloseMobile = propCloseMobile || sidebarContext.closeMobile;

  const [searchQuery, setSearchQuery] = useState(moduleSearchQuery || '');

  const { hasPermission } = usePermission(userPermissions);

  const activeOrg = {
    ...organization,
    code: tenantCode || organization.code,
  };

  const handleLinkClick = (path?: string) => {
    if (path && onNavigate) {
      onNavigate(path);
      handleCloseMobile();
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    onModuleSearch?.(query);
  };

  // Super admin can see all modules without individual permission grants
  const isSuper = Boolean(
    isSuperAdmin ||
    roleName?.toLowerCase().includes('super') ||
    userPermissions?.includes('*') ||
    userPermissions?.includes('SUPER_ADMIN')
  );

  // Filter flattened sections by user permissions, organization allocated modules, and module search query
  const visibleSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FLATTENED_NAV_SECTIONS.map((section) => {
      const filteredItems = section.items.filter((item) => {
        // Module Allocation Check: If activeOrg has an allocated module list, respect tenant's active modules
        if (item.moduleCode && activeOrg.modules && activeOrg.modules.length > 0) {
          const hasModule =
            activeOrg.modules.includes(item.moduleCode) ||
            ((item.moduleCode === 'Role' || item.moduleCode === 'UserRole') &&
              activeOrg.modules.includes('RolePermission'));
          if (!hasModule) return false;
        }

        // Permission Check: Super Admins bypass individual permission gates, regular users require explicit permissions
        const hasPerm = isSuper || !item.requiredPermission || hasPermission(item.requiredPermission);
        if (!hasPerm) return false;

        // Search Query Filter
        if (!q) return true;
        return item.label.toLowerCase().includes(q);
      });
      return {
        ...section,
        items: filteredItems,
      };
    }).filter((section) => section.items.length > 0);
  }, [userPermissions, hasPermission, searchQuery, isSuper, activeOrg.modules]);

  return (
    <>
      {/* 1. Mobile Backdrop Overlay (< lg) */}
      {isMobileOpen && (
        <div
          onClick={handleCloseMobile}
          className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* 2. Main Sidebar Shell (Fixed position on desktop & mobile drawer) */}
      <aside
        id="app-sidebar"
        aria-label="Application Navigation"
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-[#FBFBFC] dark:bg-slate-900 border-r border-[#E5E7EB] dark:border-slate-800 transition-all duration-300 ease-in-out select-none overflow-hidden ${
          isMobileOpen
            ? 'translate-x-0 w-[260px] shadow-2xl z-50'
            : isCollapsed
            ? '-translate-x-full lg:-translate-x-full w-0 lg:w-0 border-r-0 pointer-events-none'
            : '-translate-x-full lg:translate-x-0 lg:w-[260px]'
        }`}
      >
        {/* Fixed Width Inner Wrapper to prevent contents squishing during transition */}
        <div className="w-[260px] min-w-[260px] h-full flex flex-col">
          {/* ================================================================== */}
          {/* A. BRAND HEADER: APPLICATION LOGO & CLOSE BUTTON (MOBILE)          */}
          {/* ================================================================== */}
          <div className="h-14 px-3 flex items-center justify-between border-b border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-sm flex-shrink-0">
                JK
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 leading-tight">
                  <span className="font-bold text-sm tracking-tight text-[#111827] dark:text-white">
                    PayPulse
                  </span>
                  <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#F1F5F9] dark:bg-slate-800 text-[#475569] dark:text-slate-400 border border-[#E5E7EB] dark:border-slate-700">
                    RBAC
                  </span>
                </div>
                <span className="text-[10px] text-[#6B7280] dark:text-slate-400 truncate mt-0.5 font-medium">
                  Enterprise Payroll
                </span>
              </div>
            </div>

            {/* Mobile Drawer Close Button */}
            <button
              type="button"
              onClick={handleCloseMobile}
              title="Close navigation drawer"
              aria-label="Close navigation drawer"
              className="p-1 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-[#F1F5F9] dark:hover:bg-slate-800 dark:hover:text-white transition-colors lg:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ================================================================== */}
          {/* B. WORKSPACE / ORGANIZATION SWITCHER & MODULE SEARCH               */}
          {/* ================================================================== */}
          <div className="p-3 border-b border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 flex-shrink-0">
            {/* Interactive Organization Switcher (Super Admin) vs Static Badge */}
            {isSuper ? (
              <button
                type="button"
                onClick={onSwitchOrganization}
                title="Switch active organization workspace"
                data-testid="sidebar-org-switcher-button"
                className="w-full flex items-center justify-between p-2 rounded-lg border border-[#E5E7EB] dark:border-slate-800 bg-[#FBFBFC] dark:bg-slate-800/60 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 text-left transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-md bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 tracking-wider">
                    {activeOrg.code.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-[#111827] dark:text-white truncate leading-tight group-hover:text-[#0F172A]">
                      {activeOrg.name}
                    </div>
                    <div className="text-[10px] font-mono text-[#6B7280] dark:text-slate-400 truncate leading-tight mt-0.5">
                      {activeOrg.slug}
                    </div>
                  </div>
                </div>
                <ChevronsUpDown className="w-3.5 h-3.5 text-[#6B7280] dark:text-slate-400 group-hover:text-[#111827] dark:group-hover:text-white transition-colors flex-shrink-0 ml-1" />
              </button>
            ) : (
              <div
                title={`${activeOrg.name} (${activeOrg.slug})`}
                data-testid="sidebar-org-static-badge"
                className="w-full flex items-center justify-between p-2 rounded-lg border border-[#E5E7EB] dark:border-slate-800 bg-[#FBFBFC] dark:bg-slate-800/60 text-left select-none cursor-default"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-md bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 tracking-wider">
                    {activeOrg.code.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-[#111827] dark:text-white truncate leading-tight">
                      {activeOrg.name}
                    </div>
                    <div className="text-[10px] font-mono text-[#6B7280] dark:text-slate-400 truncate leading-tight mt-0.5">
                      {activeOrg.slug}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search Modules Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#6B7280] dark:text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search modules..."
                className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-800 bg-[#FBFBFC] dark:bg-slate-800/50 text-xs text-[#111827] dark:text-white placeholder-[#6B7280] dark:placeholder-slate-400 focus:outline-none focus:border-[#0F172A] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#0F172A] dark:focus:ring-blue-500 transition-all font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#6B7280] hover:text-[#111827] dark:text-slate-400 dark:hover:text-white rounded transition-colors"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* ================================================================== */}
          {/* C. NAVIGATION LINKS: STRUCTURED SECTIONS                           */}
          {/* ================================================================== */}
          <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar text-xs">
            {visibleSections.length === 0 ? (
              <div className="text-center py-8 px-3">
                <SearchX className="w-6 h-6 text-[#9CA3AF] mx-auto mb-2 stroke-[1.5]" />
                <p className="text-xs font-medium text-[#475569] dark:text-slate-300">No modules found</p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">Try a different search term</p>
              </div>
            ) : (
              visibleSections.map((section) => (
                <div key={section.id} className="space-y-0.5">
                  {/* Section Title */}
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-slate-400 font-mono select-none">
                    {section.title}
                  </div>

                  {/* Section Items */}
                  <ul className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon || Layers;
                      const isActive = activePath === item.path;

                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => handleLinkClick(item.path)}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all group relative cursor-pointer ${
                              isActive
                                ? 'bg-[#0F172A]/5 dark:bg-blue-500/15 text-[#0F172A] dark:text-blue-400 font-semibold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-[#0F172A] dark:before:bg-blue-500 before:rounded-r'
                                : 'text-[#475569] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white hover:bg-[#F1F5F9]/70 dark:hover:bg-slate-800/70 font-medium'
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 flex-shrink-0 transition-colors ${
                                isActive
                                  ? 'text-[#0F172A] dark:text-blue-400'
                                  : 'text-[#6B7280] dark:text-slate-400 group-hover:text-[#111827] dark:group-hover:text-white'
                              }`}
                            />

                            <span className="truncate flex-1 text-left">{item.label}</span>

                            {item.badge && (
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider font-mono ${
                                  isActive
                                    ? 'bg-[#0F172A] text-white dark:bg-blue-600'
                                    : 'bg-[#F1F5F9] dark:bg-slate-800 text-[#475569] dark:text-slate-300 border border-[#E5E7EB] dark:border-slate-700'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>

          {/* ================================================================== */}
          {/* D. SIDEBAR FOOTER: USER PROFILE CARD & SYSTEM VERSION               */}
          {/* ================================================================== */}
          <div className="p-3 border-t border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 flex-shrink-0">
            {/* User Profile Mini Badge (if user supplied) */}
            {user && (
              <div className="flex items-center gap-2.5 p-1.5 rounded-lg bg-[#FBFBFC] dark:bg-slate-800/50 border border-[#E5E7EB] dark:border-slate-800">
                <div className="relative flex-shrink-0">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#0F172A] text-white font-bold text-xs flex items-center justify-center tracking-wide">
                      {user.initials}
                    </div>
                  )}
                  <span
                    className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-1 ring-white ${
                      user.isActive ? 'bg-[#22A06B]' : 'bg-[#DC6262]'
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-[#111827] dark:text-white truncate leading-tight">
                    {user.fullName}
                  </div>
                  <div className="text-[10px] text-[#6B7280] dark:text-slate-400 truncate leading-tight mt-0.5">
                    {user.role || user.departmentName || user.email}
                  </div>
                </div>
              </div>
            )}

            {/* Version & Status Pill */}
            <div className="flex items-center justify-between text-[11px] text-[#6B7280] dark:text-slate-400">
              <span className="font-mono font-medium">v2.4.0</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-[#047857] bg-[#ECFDF5] dark:bg-emerald-950/60 dark:text-emerald-400 border border-[#A7F3D0] dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-[#047857] dark:bg-emerald-400" />
                <span>LIVE</span>
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
