// ==============================================================================
// JK-PAYROLL: REUSABLE APP LAYOUT WITH FIXED COLLAPSIBLE SIDEBAR
// Design System: Balanced Glossy Graphite
// File: src/client/layouts/AppLayout.tsx
// ==============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SidebarProvider, useSidebar } from '../components/layout/SidebarContext.js';
import { AppSidebar } from '../components/layout/AppSidebar.js';
import { AppTopbar } from '../components/layout/AppTopbar.js';
import { AppFooter } from '../components/layout/AppFooter.js';
import { UserProfileData } from '../components/layout/user-profile-popover.js';
import { NotificationItem } from '../components/layout/notification-popover.js';
import { OrganizationSwitcherModal } from '../components/layout/OrganizationSwitcherModal.js';
import { Organization } from '../../features/organizations/types.js';
import { OrganizationContext } from '../components/layout/sidebar.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { toast } from '../components/ui/index.js';
import { useTheme } from '../core/theme/ThemeContext.js';

export interface AppLayoutProps {
  children?: React.ReactNode;
  initialUser?: UserProfileData;
  initialPermissions?: string[];
  initialTenantCode?: string;
  initialPath?: string;
  defaultCollapsed?: boolean;
}

const DEFAULT_SESSION_USER: UserProfileData = {
  id: 'usr-apex-admin-01',
  fullName: 'Alexander Wright',
  email: 'a.wright@apexcorp.internal',
  initials: 'AW',
  isActive: true,
  tenantId: 'tnt-apex-health-01',
  tenantName: 'Apex Health Systems',
  tenantCode: 'APEX-HLTH',
  departmentName: 'Human Resources',
  subDepartmentName: 'Payroll Division',
  role: 'Tenant Admin',
};

const DEFAULT_USER_PERMISSIONS: string[] = [
  PERMISSIONS.TYPE_OF_LEAVE.VIEW,
  PERMISSIONS.TYPE_OF_LEAVE.ADD,
  PERMISSIONS.REQUEST_FOR_LEAVE.VIEW,
  PERMISSIONS.REQUEST_FOR_LEAVE.APPROVAL_CREATE,
  PERMISSIONS.PAYROLL_COMPUTATION.VIEW,
];

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'leave_request',
    title: 'Sarah Jenkins submitted a Leave Request',
    description: 'Vacation Leave: Nov 12 - Nov 16 (5 days). Department: Clinical Care.',
    timestamp: '8m ago',
    isRead: false,
    status: 'Pending',
    actor: { name: 'Sarah Jenkins', initials: 'SJ' },
  },
  {
    id: 'notif-2',
    type: 'approval',
    title: 'Payroll run #PR-2026-11 requires final audit approval',
    description: '142 active employee disbursements totaling $482,910.00 ready.',
    timestamp: '1h ago',
    isRead: false,
    status: 'Pending',
  },
  {
    id: 'notif-3',
    type: 'system',
    title: 'RBAC Policy Update Applied',
    description: 'Tier-2 Department module inheritance synced successfully across all units.',
    timestamp: 'Yesterday',
    isRead: true,
  },
];

const AppLayoutContent: React.FC<AppLayoutProps> = ({
  children,
  initialUser = DEFAULT_SESSION_USER,
  initialPermissions = DEFAULT_USER_PERMISSIONS,
  initialTenantCode = 'APEX-HLTH',
  initialPath,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isCollapsed, toggleSidebar } = useSidebar();

  const activePath = initialPath || location.pathname;

  // Topbar Notification State
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);

  // Active User Profile State
  const [currentUser, setCurrentUser] = useState<UserProfileData>(initialUser);
  const [userPermissions, setUserPermissions] = useState<string[]>(initialPermissions);

  // Tenant / Organization Context
  const [activeTenantCode, setActiveTenantCode] = useState(initialTenantCode);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  // Centralized Theme state from ThemeContext
  const { resolvedTheme, toggleTheme } = useTheme();

  // Keep internal state in sync with updated props from session wrapper
  useEffect(() => {
    if (initialUser) {
      setCurrentUser(initialUser);
      if (initialUser.tenantCode) {
        setActiveTenantCode(initialUser.tenantCode);
      }
    }
  }, [initialUser]);

  useEffect(() => {
    if (initialPermissions) {
      setUserPermissions(initialPermissions);
    }
  }, [initialPermissions]);

  useEffect(() => {
    if (initialTenantCode) {
      setActiveTenantCode(initialTenantCode);
    }
  }, [initialTenantCode]);

  // Handlers for Notifications
  const handleMarkAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  // Handlers for Scope / Account Switcher
  const handleSelectScope = useCallback((org: Organization) => {
    setActiveTenantCode(org.code);
    setCurrentUser((prev) => ({
      ...prev,
      tenantId: org.id,
      tenantName: org.name,
      tenantCode: org.code,
    }));
    setIsSwitcherOpen(false);
    toast.info('organization.switched', { name: org.name, code: org.code });
  }, []);

  const handleLogout = useCallback(() => {
    toast.info('auth.logout_success');
    navigate('/login');
  }, [navigate]);

  const isSuperAdmin = Boolean(
    currentUser.role === 'Super Admin' ||
    currentUser.role?.toLowerCase().includes('super') ||
    userPermissions.includes('*') ||
    userPermissions.includes('SUPER_ADMIN')
  );

  const canEditOrganization = Boolean(
    isSuperAdmin ||
    currentUser.role === 'Tenant Admin' ||
    currentUser.role?.toLowerCase().includes('admin') ||
    userPermissions.includes('Organization.Edit') ||
    userPermissions.includes('Tenant.Edit') ||
    userPermissions.includes('*')
  );

  const handleEditOrganization = useCallback(() => {
    if (currentUser.tenantId) {
      navigate(`/organizations/${encodeURIComponent(currentUser.tenantId)}/edit`);
    }
  }, [currentUser.tenantId, navigate]);

  // Convert organization context for Sidebar
  const orgContext: OrganizationContext = useMemo(
    () => ({
      id: currentUser.tenantId,
      code: activeTenantCode,
      name: currentUser.tenantName || 'Apex Health Systems',
      slug: (currentUser.tenantName || 'Apex Health Systems')
        .toLowerCase()
        .replace(/\s+/g, '-'),
      sector: 'Healthcare & Payroll',
      currency: 'USD ($)',
    }),
    [activeTenantCode, currentUser.tenantName, currentUser.tenantId]
  );

  return (
    <div className="min-h-screen w-full min-w-0 bg-[#FBFBFC] dark:bg-[#0B0E14] font-sans text-[#111827] dark:text-[#F8FAFC] antialiased flex relative selection:bg-slate-200 dark:selection:bg-white/20">
      {/* 1. Reserved Sidebar Shell Column (Desktop): Reserves exact width in document flow without margin-calc hacks */}
      <div
        className={`hidden lg:block flex-shrink-0 transition-[width] duration-300 ease-in-out ${
          isCollapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
        aria-hidden="true"
      />

      {/* 2. Fixed Desktop Sidebar / Slide-in Mobile Drawer */}
      <AppSidebar
        user={currentUser}
        activePath={activePath}
        userPermissions={userPermissions}
        isSuperAdmin={isSuperAdmin}
        roleName={currentUser.role}
        organization={orgContext}
        tenantCode={activeTenantCode}
        onNavigate={(path) => navigate(path)}
        onSwitchOrganization={() => setIsSwitcherOpen(true)}
      />

      {/* 3. Main Workspace Column: Automatically fills 100% of the remaining available viewport width */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen max-w-full bg-[#FBFBFC] dark:bg-[#0E121B]">
        {/* Top Header with Accessible Sidebar Toggle Button */}
        <AppTopbar
          notifications={notifications}
          onMarkAllAsRead={handleMarkAllAsRead}
          user={currentUser}
          onSignOut={handleLogout}
          tenantCode={activeTenantCode}
          isSidebarCollapsed={isCollapsed}
          onToggleSidebar={toggleSidebar}
          onToggleTheme={() => toggleTheme()}
          currentTheme={resolvedTheme}
          onNavigate={(path) => navigate(path)}
          onSwitchOrganization={() => setIsSwitcherOpen(true)}
          onProfileClick={() => navigate('/admin/profiles')}
          onSwitchDepartment={() => navigate('/admin/departments')}
          isSuperAdmin={isSuperAdmin}
          canEditOrganization={canEditOrganization}
          onEditOrganization={handleEditOrganization}
        />

        {/* Dynamic Main Content Viewport */}
        <main
          className="flex-1 min-w-0 w-full px-4 py-6 sm:px-6 lg:px-8 focus:outline-none"
          id="main-content"
          role="region"
          aria-label="Main Application Content"
        >
          <div className="mx-auto max-w-7xl w-full min-w-0">{children}</div>
        </main>

        {/* Normal-flow Legal Footer */}
        <AppFooter />
      </div>

      {/* Scope / Account Switcher Modal */}
      <OrganizationSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        currentOrgId={currentUser.tenantId}
        onSelectOrg={handleSelectScope}
      />
    </div>
  );
};

export const AppLayout: React.FC<AppLayoutProps> = (props) => {
  return (
    <SidebarProvider defaultCollapsed={props.defaultCollapsed}>
      <AppLayoutContent {...props} />
    </SidebarProvider>
  );
};

export default AppLayout;
