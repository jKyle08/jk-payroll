// ==============================================================================
// JK-PAYROLL: DASHBOARD SHELL LAYOUT
// File: src/client/layouts/DashboardLayout.tsx
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, RotateCcw } from 'lucide-react';
import { Topbar, TopbarProps } from '../components/layout/topbar.js';
import { Sidebar, OrganizationContext } from '../components/layout/sidebar.js';
import { Footer } from '../components/layout/footer.js';
import { UserProfileData } from '../components/layout/user-profile-popover.js';
import { NotificationItem } from '../components/layout/notification-popover.js';
import { OrganizationSwitcherModal } from '../components/layout/OrganizationSwitcherModal.js';
import { Organization } from '../../features/organizations/types.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

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

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  initialUser = DEFAULT_SESSION_USER,
  initialPermissions = DEFAULT_USER_PERMISSIONS,
  initialTenantCode = 'APEX-HLTH',
  initialPath,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation state
  const activePath = initialPath || location.pathname;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Topbar Notification State
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);

  // Active User Profile State
  const [currentUser, setCurrentUser] = useState<UserProfileData>(initialUser);
  const [userPermissions, setUserPermissions] = useState<string[]>(initialPermissions);

  // Tenant / Organization Context
  const [activeTenantCode, setActiveTenantCode] = useState(initialTenantCode);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  // Organization List for Switcher Modal
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isOrgsLoading, setIsOrgsLoading] = useState(false);

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

  // Lazy-load organizations list when switcher opens
  useEffect(() => {
    if (!isSwitcherOpen) return;

    let isMounted = true;
    setIsOrgsLoading(true);

    fetch('/api/organizations', {
      headers: {
        'Accept': 'application/json',
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load organizations');
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setOrganizations(Array.isArray(data) ? data : data.organizations || []);
        }
      })
      .catch((err) => {
        console.warn('Could not load organizations for switcher:', err);
      })
      .finally(() => {
        if (isMounted) setIsOrgsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isSwitcherOpen]);

  // Handlers for Notifications
  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // Handlers for Scope / Account Switcher
  const handleSelectScope = (org: Organization) => {
    setActiveTenantCode(org.code);
    setCurrentUser((prev) => ({
      ...prev,
      tenantId: org.id,
      tenantName: org.name,
      tenantCode: org.code,
    }));
    setIsSwitcherOpen(false);
  };

  const handleLogout = () => {
    navigate('/login');
  };

  // Convert organization context for Sidebar
  const orgContext: OrganizationContext = useMemo(
    () => ({
      id: currentUser.tenantId,
      code: activeTenantCode,
      name: currentUser.tenantName || 'Apex Health Systems',
      slug: (currentUser.tenantName || 'Apex Health Systems').toLowerCase().replace(/\s+/g, '-'),
      sector: 'Healthcare & Payroll',
      currency: 'USD ($)',
    }),
    [activeTenantCode, currentUser.tenantName, currentUser.tenantId]
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased">
      {/* 1. Left Primary Navigation Sidebar */}
      <Sidebar
        activePath={activePath}
        userPermissions={userPermissions}
        isSuperAdmin={currentUser.role === 'Super Admin'}
        roleName={currentUser.role}
        organization={orgContext}
        tenantCode={activeTenantCode}
        onNavigate={(path) => navigate(path)}
      />

      {/* 2. Right Vertical Container: Topbar + Dynamic Route Viewport */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Modern Facebook-Style Topbar */}
        <Topbar
          onSearch={setSearchQuery}
          notifications={notifications}
          onMarkAllAsRead={handleMarkAllAsRead}
          user={currentUser}
          onSignOut={handleLogout}
          tenantCode={activeTenantCode}
        />

        {/* 3. Main Workspace Viewport */}
        <main
          className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 focus:outline-none"
          id="main-content"
          role="region"
          aria-label="Main Application Content"
        >
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>

        {/* 4. PayPulse Persistent Footer Component */}
        <Footer />
      </div>

      {/* 5. Organization / Scope Switcher Modal */}
      <OrganizationSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        currentOrgId={currentUser.tenantId}
        onSelectOrg={handleSelectScope}
      />
    </div>
  );
};

export default DashboardLayout;
