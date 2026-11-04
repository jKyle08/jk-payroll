// ==============================================================================
// JK-PAYROLL: DASHBOARD SHELL LAYOUT
// File: src/app/(dashboard)/layout.tsx
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Topbar, TopbarProps } from '../../components/layout/topbar.js';
import { Sidebar } from '../../components/layout/sidebar.js';
import { Footer } from '../../components/layout/footer.js';
import { UserProfileData } from '../../components/layout/user-profile-popover.js';
import { NotificationItem } from '../../components/layout/notification-popover.js';
import { PERMISSIONS } from '../../lib/constants/permissions.js';

export interface DashboardLayoutProps {
  children?: React.ReactNode;
  initialUser?: UserProfileData;
  initialPermissions?: string[];
  initialTenantCode?: string;
  initialPath?: string;
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
    title: 'Dr. Michael Chang approved Emergency Leave',
    description: 'Dr. Chang authorized 2 days emergency leave for Nurse Robinson.',
    timestamp: '45m ago',
    isRead: false,
    status: 'Approved',
    actor: { name: 'Michael Chang', initials: 'MC' },
  },
  {
    id: 'notif-3',
    type: 'payroll_run',
    title: 'Bi-Monthly Payroll Batch #2026-10 Ready',
    description: 'Direct deposits calculated for 248 active employees. Awaiting release.',
    timestamp: '3h ago',
    isRead: true,
    status: 'Pending',
    actor: { name: 'Finance Automation', initials: 'FA' },
  },
];

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  initialUser = DEFAULT_SESSION_USER,
  initialPermissions = DEFAULT_USER_PERMISSIONS,
  initialTenantCode = 'APEX-HLTH',
  initialPath = '/dashboard',
}) => {
  const [currentUser, setCurrentUser] = useState<UserProfileData>(initialUser);
  const [userPermissions, setUserPermissions] = useState<string[]>(initialPermissions);
  const [tenantCode, setTenantCode] = useState<string>(initialTenantCode);
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);
  const [activePath, setActivePath] = useState<string>(initialPath);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Handle theme changes on HTML document element
  const handleToggleTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    if (typeof document !== 'undefined') {
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const handleNavigate = (path: string) => {
    setActivePath(path);
  };

  const handleNotificationClick = (item: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased ${theme === 'dark' ? 'dark' : ''}`}>
      {/* 1. Minimalist 56px Topbar */}
      <Topbar
        user={currentUser}
        tenantCode={tenantCode}
        notifications={notifications}
        onSearch={(query) => console.log('Search query:', query)}
        onSignOut={handleSignOut}
        onNotificationClick={handleNotificationClick}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        onProfileClick={() => setActivePath('/profile')}
        onSwitchDepartment={() => console.log('Open Department Switcher Modal')}
        onToggleTheme={handleToggleTheme}
        currentTheme={theme}
      />

      {/* 2. Workspace Layout Body (Sidebar + Content Area) */}
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-3.5rem)]">
        {/* Left Navigation Drawer */}
        <Sidebar
          userPermissions={userPermissions}
          activePath={activePath}
          onNavigate={handleNavigate}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          tenantCode={tenantCode}
          roleName={currentUser.role || 'Administrator'}
        />

        {/* Dynamic Main Workspace Canvas with Natural Sticky Footer */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950/60 custom-scrollbar flex flex-col justify-between min-h-full">
          <div className="max-w-7xl mx-auto space-y-6 flex-1 w-full">
            {children}
          </div>
          <Footer className="max-w-7xl mx-auto w-full" />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
