// ==============================================================================
// JK-PAYROLL: APPLICATION TOPBAR COMPONENT
// Design System: Balanced Glossy Graphite (Compact Global Action Topbar)
// File: src/client/components/layout/AppTopbar.tsx
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Bell,
  Sun,
  Moon,
  Activity,
} from 'lucide-react';
import { useSidebar } from './SidebarContext.js';
import { NotificationPopover, NotificationItem } from './notification-popover.js';
import { UserProfilePopover, UserProfileData } from './user-profile-popover.js';
import { SystemStatusPopover } from './SystemStatusPopover.js';
import { CommandPaletteModal } from './CommandPaletteModal.js';
import { toast } from '../ui/index.js';

export interface TopbarProps {
  user?: UserProfileData;
  tenantCode?: string;
  notifications?: NotificationItem[];
  onSearch?: (query: string) => void;
  onOpenCommandPalette?: () => void;
  onSignOut?: () => void;
  onNotificationClick?: (item: NotificationItem) => void;
  onMarkAllAsRead?: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onProfileClick?: () => void;
  onSwitchDepartment?: () => void;
  onToggleTheme?: (theme: 'light' | 'dark') => void;
  currentTheme?: 'light' | 'dark';
  onNavigate?: (path: string) => void;
  onSwitchOrganization?: () => void;
  isSuperAdmin?: boolean;
  canEditOrganization?: boolean;
  onEditOrganization?: () => void;
}

export type AppTopbarProps = TopbarProps;

const DEFAULT_USER: UserProfileData = {
  id: 'usr-default',
  fullName: 'Alexander Wright',
  email: 'a.wright@apexcorp.internal',
  initials: 'AW',
  isActive: true,
  tenantId: 'tnt-default',
  tenantName: 'Apex Health Systems',
  tenantCode: 'APEX-HLTH',
  departmentName: 'Human Resources',
  subDepartmentName: 'Payroll Division',
  role: 'Super Admin',
};

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    type: 'leave_request',
    title: 'Sarah Jenkins submitted a Leave Request',
    description: 'Vacation Leave: Nov 12 - Nov 16 (5 days). Awaiting review.',
    timestamp: '10m ago',
    isRead: false,
    status: 'Pending',
    actor: { name: 'Sarah Jenkins', initials: 'SJ' },
  },
  {
    id: 'n-2',
    type: 'payroll_run',
    title: 'October Payroll Batch #2026-10 Approved',
    description: 'Direct deposits dispatched to 142 employees.',
    timestamp: '2h ago',
    isRead: true,
    status: 'Approved',
    actor: { name: 'Finance Automation', initials: 'FA' },
  },
];

export const AppTopbar: React.FC<AppTopbarProps> = ({
  user = DEFAULT_USER,
  tenantCode,
  notifications = DEFAULT_NOTIFICATIONS,
  onSearch,
  onOpenCommandPalette,
  onSignOut,
  onNotificationClick,
  onMarkAllAsRead,
  onToggleSidebar,
  isSidebarCollapsed,
  onProfileClick,
  onSwitchDepartment,
  onToggleTheme,
  currentTheme = 'light',
  onNavigate,
  onSwitchOrganization,
  isSuperAdmin = false,
  canEditOrganization = false,
  onEditOrganization,
}) => {
  const sidebarContext = useSidebar();
  const isCollapsed = isSidebarCollapsed !== undefined ? isSidebarCollapsed : sidebarContext.isCollapsed;
  const handleToggleSidebar = onToggleSidebar || sidebarContext.toggleSidebar;

  // Modals & Popovers state (exclusive opening)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [notifItems, setNotifItems] = useState(notifications);

  // Trigger refs for popovers to prevent click/mousedown race conditions
  const statusTriggerRef = React.useRef<HTMLButtonElement>(null);
  const bellTriggerRef = React.useRef<HTMLButtonElement>(null);
  const profileTriggerRef = React.useRef<HTMLButtonElement>(null);

  // Platform detection for keyboard shortcut indicator (⌘K or Ctrl+K)
  const [isApple, setIsApple] = useState(false);
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsApple(/Mac|iPod|iPhone|iPad/.test(navigator.userAgent));
    }
  }, []);

  // Update notifications state if prop changes
  useEffect(() => {
    setNotifItems(notifications);
  }, [notifications]);

  const unreadCount = notifItems.filter((n) => !n.isRead).length;

  // Global Command Palette shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        setIsNotificationOpen(false);
        setIsProfileOpen(false);
        setIsStatusOpen(false);
        onOpenCommandPalette?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenCommandPalette]);

  const handleOpenSearch = () => {
    setIsCommandPaletteOpen(true);
    setIsNotificationOpen(false);
    setIsProfileOpen(false);
    setIsStatusOpen(false);
    onOpenCommandPalette?.();
  };

  const handleToggleNotifications = () => {
    setIsNotificationOpen((prev) => !prev);
    setIsProfileOpen(false);
    setIsStatusOpen(false);
  };

  const handleToggleProfile = () => {
    setIsProfileOpen((prev) => !prev);
    setIsNotificationOpen(false);
    setIsStatusOpen(false);
  };

  const handleToggleStatus = () => {
    setIsStatusOpen((prev) => !prev);
    setIsNotificationOpen(false);
    setIsProfileOpen(false);
  };

  const handleMarkAllRead = () => {
    setNotifItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    toast.info('system.notifications_read');
    onMarkAllAsRead?.();
  };

  return (
    <>
      <header id="app-topbar" data-app-topbar="true" className="sticky top-0 left-0 right-0 h-14 w-full bg-white/90 dark:bg-[#121620]/80 backdrop-blur-md border-b border-[#E5E7EB] dark:border-white/10 z-30 select-none transition-colors">
        <div className="h-full px-3 sm:px-4 flex items-center justify-between gap-3 max-w-full">
          
          {/* ==================================================================== */}
          {/* 1. LEFT SECTION: SIDEBAR TOGGLE ONLY (BRAND OWNED BY SIDEBAR)        */}
          {/* ==================================================================== */}
          <div className="flex items-center flex-shrink-0">
            <button
              id="topbar-sidebar-toggle"
              type="button"
              onClick={handleToggleSidebar}
              title={isCollapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!isCollapsed}
              className="p-1.5 rounded-lg text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-slate-700 dark:text-[#CBD5E1]" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-slate-700 dark:text-[#CBD5E1]" />
              )}
            </button>
          </div>

          {/* ==================================================================== */}
          {/* 2. CENTER SECTION: GLOBAL COMMAND / SEARCH INPUT PILL                */}
          {/* ==================================================================== */}
          <div className="flex-1 max-w-md mx-2 sm:mx-4 min-w-0">
            <button
              type="button"
              onClick={handleOpenSearch}
              className="relative flex items-center justify-between w-full h-9 px-3 rounded-full bg-slate-50 dark:bg-[#181D2A] hover:bg-white dark:hover:bg-[#202637] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all cursor-pointer group text-left shadow-2xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
              aria-label="Search actions, employees, modules"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-[#64748B] group-hover:text-slate-700 dark:group-hover:text-[#F8FAFC] transition-colors flex-shrink-0" />
                <span className="text-xs text-slate-500 dark:text-[#94A3B8] truncate">
                  Search actions, employees, modules...
                </span>
              </div>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500 dark:text-[#94A3B8] bg-slate-200/60 dark:bg-white/[0.08] rounded border border-slate-300 dark:border-white/10 pointer-events-none flex-shrink-0">
                {isApple ? '⌘K' : 'Ctrl+K'}
              </kbd>
            </button>
          </div>

          {/* ==================================================================== */}
          {/* 3. RIGHT SECTION: THEME, SYSTEM STATUS, NOTIFICATIONS, AVATAR        */}
          {/* ==================================================================== */}
          <div className="flex items-center gap-2 sm:gap-3 relative flex-shrink-0">
            
            {/* Theme Toggle */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={() => onToggleTheme(currentTheme === 'dark' ? 'light' : 'dark')}
                title={`Switch to ${currentTheme === 'dark' ? 'Light' : 'Dark'} mode`}
                aria-label={`Switch to ${currentTheme === 'dark' ? 'Light' : 'Dark'} mode`}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors inline-flex items-center justify-center cursor-pointer"
              >
                {currentTheme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Operational Health / System Status Trigger */}
            <div className="relative">
              <button
                ref={statusTriggerRef}
                id="topbar-system-status"
                type="button"
                onClick={handleToggleStatus}
                title="System Operational Status"
                aria-label="System Operational Status"
                aria-expanded={isStatusOpen}
                aria-controls="topbar-system-status-popover"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors inline-flex items-center justify-center cursor-pointer relative"
              >
                <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 dark:shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              </button>

              {/* Floating System Status Popover */}
              <SystemStatusPopover
                id="topbar-system-status-popover"
                isOpen={isStatusOpen}
                onClose={() => setIsStatusOpen(false)}
                version="v2.4.0"
                triggerRef={statusTriggerRef}
              />
            </div>

            {/* Notification Bell Button */}
            <div className="relative">
              <button
                ref={bellTriggerRef}
                id="topbar-notifications-bell"
                type="button"
                onClick={handleToggleNotifications}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors relative cursor-pointer ${
                  isNotificationOpen
                    ? 'bg-slate-900 text-white dark:bg-[#CBD5E1] dark:text-[#0F172A]'
                    : 'text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                }`}
                aria-label="Notifications"
                aria-expanded={isNotificationOpen}
                aria-controls="topbar-notifications-popover"
              >
                <Bell className="w-4 h-4" />

                {/* Unread counter badge */}
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-slate-900 dark:bg-[#CBD5E1] text-white dark:text-[#0F172A] font-bold text-[9px] flex items-center justify-center border-2 border-white dark:border-[#121620] pointer-events-none select-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Floating Notification Popover */}
              <NotificationPopover
                id="topbar-notifications-popover"
                isOpen={isNotificationOpen}
                onClose={() => setIsNotificationOpen(false)}
                notifications={notifItems}
                onMarkAllAsRead={handleMarkAllRead}
                onItemClick={onNotificationClick}
                triggerRef={bellTriggerRef}
              />
            </div>

            {/* User Profile Avatar with Presence Dot */}
            <div className="relative">
              <button
                ref={profileTriggerRef}
                id="topbar-user-avatar"
                type="button"
                onClick={handleToggleProfile}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all relative focus:outline-none cursor-pointer ring-2 ${
                  isProfileOpen
                    ? 'ring-slate-900 dark:ring-white/40'
                    : 'ring-transparent hover:ring-slate-200 dark:hover:ring-white/20'
                }`}
                aria-label="User Account Menu"
                aria-expanded={isProfileOpen}
                aria-controls="topbar-user-profile-popover"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#0F172A] dark:bg-[#181D2A] dark:border dark:border-white/15 text-white font-bold text-xs flex items-center justify-center tracking-wide">
                    {user.initials || user.fullName?.slice(0, 2).toUpperCase() || 'U'}
                  </div>
                )}

                {/* Presence indicator dot */}
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-[#121620] ${
                    user.isActive ? 'bg-[#22A06B]' : 'bg-[#DC6262]'
                  }`}
                />
              </button>

              {/* Floating User Profile Popover */}
              <UserProfilePopover
                id="topbar-user-profile-popover"
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                user={user}
                canEditOrganization={canEditOrganization}
                onEditOrganization={onEditOrganization}
                onSignOut={onSignOut}
                onProfileClick={onProfileClick}
                onSwitchDepartment={onSwitchDepartment}
                onToggleTheme={onToggleTheme}
                currentTheme={currentTheme}
                triggerRef={profileTriggerRef}
              />
            </div>

          </div>

        </div>
      </header>

      {/* Global Command Palette Modal Overlay */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={onNavigate}
        onToggleTheme={onToggleTheme}
        currentTheme={currentTheme}
        onSignOut={onSignOut}
        onProfileClick={onProfileClick}
        onSwitchOrganization={onSwitchOrganization}
        isSuperAdmin={isSuperAdmin}
      />
    </>
  );
};

export const Topbar = AppTopbar;
export default AppTopbar;
