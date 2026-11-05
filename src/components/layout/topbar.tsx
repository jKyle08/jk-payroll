// ==============================================================================
// JK-PAYROLL: REFACTORED TOPBAR COMPONENT
// Design System: "Midnight & Champagne Steel" (Ramp / Linear / Stripe Aesthetic)
// File: src/components/layout/topbar.tsx
// ==============================================================================

import React, { useState } from 'react';
import { PanelLeft, Search, Bell, Activity, Sun, Moon } from 'lucide-react';
import { NotificationPopover, NotificationItem } from './notification-popover.js';
import { UserProfilePopover, UserProfileData } from './user-profile-popover.js';

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
}

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

export const Topbar: React.FC<TopbarProps> = ({
  user = DEFAULT_USER,
  tenantCode,
  notifications = DEFAULT_NOTIFICATIONS,
  onSearch,
  onOpenCommandPalette,
  onSignOut,
  onNotificationClick,
  onMarkAllAsRead,
  onToggleSidebar,
  isSidebarCollapsed = false,
  onProfileClick,
  onSwitchDepartment,
  onToggleTheme,
  currentTheme = 'light',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifItems, setNotifItems] = useState(notifications);

  const unreadCount = notifItems.filter((n) => !n.isRead).length;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleSearchClick = () => {
    if (onOpenCommandPalette) {
      onOpenCommandPalette();
    }
  };

  const handleToggleNotifications = () => {
    setIsNotificationOpen((prev) => !prev);
    setIsProfileOpen(false);
  };

  const handleToggleProfile = () => {
    setIsProfileOpen((prev) => !prev);
    setIsNotificationOpen(false);
  };

  const handleMarkAllRead = () => {
    setNotifItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    onMarkAllAsRead?.();
  };

  return (
    <header className="sticky top-0 left-0 right-0 h-14 bg-white border-b border-[#E5E7EB] z-40 select-none">
      <div className="h-full px-3 sm:px-4 flex items-center justify-between gap-2">
        
        {/* ==================================================================== */}
        {/* 1. LEFT SECTION: SIDEBAR TOGGLE & BRAND IDENTIFIER                  */}
        {/* ==================================================================== */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Panel Toggle Button (PanelLeft icon) */}
          <button
            type="button"
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
            aria-label="Toggle navigation sidebar"
            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-[#F1F5F9] border border-transparent hover:border-[#E5E7EB] transition-colors focus:outline-none focus:ring-1 focus:ring-[#0F172A]"
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          {/* Brand Mark & App Name */}
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={onProfileClick}
            title="PayPulse HR & Payroll"
          >
            <div className="w-7 h-7 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-sm transition-transform group-hover:scale-105">
              JK
            </div>
            <span className="font-bold text-sm sm:text-base tracking-tight text-[#111827] flex items-center gap-1">
              <span>PayPulse</span>
              <span className="text-[10px] font-mono text-[#6B7280] font-normal hidden sm:inline">RBAC</span>
            </span>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 2. CENTER SECTION: UNIFIED ⌘K COMMAND PALETTE / SEARCH PILL         */}
        {/* ==================================================================== */}
        <div className="flex-1 max-w-md mx-2 sm:mx-4">
          <div
            onClick={handleSearchClick}
            className="relative flex items-center justify-between w-full h-8 sm:h-9 px-3 rounded-full bg-[#FBFBFC] hover:bg-white border border-[#E5E7EB] hover:border-[#CBD5E1] transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Search className="w-3.5 h-3.5 text-[#6B7280] group-hover:text-[#111827] transition-colors flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search actions, employees, modules..."
                className="w-full text-xs bg-transparent text-[#111827] placeholder-[#6B7280] outline-none border-none p-0 focus:ring-0 truncate"
              />
            </div>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-[#6B7280] bg-[#F1F5F9] border border-[#E5E7EB] rounded pointer-events-none flex-shrink-0">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 3. RIGHT SECTION: NOTIFICATION BELL & USER PROFILE POPOVER          */}
        {/* ==================================================================== */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 relative flex-shrink-0">
          
          {/* Theme Toggle */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={() => onToggleTheme(currentTheme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${currentTheme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label={`Switch to ${currentTheme === 'dark' ? 'Light' : 'Dark'} mode`}
              className="w-9 h-9 rounded-full bg-[#F1F5F9] dark:bg-slate-800 text-[#475569] dark:text-slate-300 hover:bg-[#E2E8F0] dark:hover:bg-slate-700 hover:text-[#111827] dark:hover:text-white transition-colors inline-flex items-center justify-center cursor-pointer"
            >
              {currentTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Target 1: Notification Bell Button */}
          <div className="relative">
            <button
              id="topbar-notifications-bell"
              type="button"
              onClick={handleToggleNotifications}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors relative focus:outline-none focus:ring-1 focus:ring-[#0F172A] ${
                isNotificationOpen
                  ? 'bg-[#0F172A] text-white'
                  : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] hover:text-[#111827]'
              }`}
              aria-label="Notifications"
              aria-expanded={isNotificationOpen}
            >
              <Bell className="w-4 h-4" />

              {/* Unread counter badge pill in midnight slate */}
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#0F172A] text-white font-bold text-[10px] flex items-center justify-center border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover */}
            <NotificationPopover
              isOpen={isNotificationOpen}
              onClose={() => setIsNotificationOpen(false)}
              notifications={notifItems}
              onMarkAllAsRead={handleMarkAllRead}
              onItemClick={onNotificationClick}
            />
          </div>

          {/* Target 2: User Profile Avatar with Presence Indicator */}
          <div className="relative">
            <button
              id="topbar-user-avatar"
              type="button"
              onClick={handleToggleProfile}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all relative focus:outline-none cursor-pointer ring-2 ${
                isProfileOpen
                  ? 'ring-[#0F172A]'
                  : 'ring-transparent hover:ring-[#E5E7EB]'
              }`}
              aria-label="Account menu"
              aria-expanded={isProfileOpen}
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#0F172A] text-white font-bold text-xs flex items-center justify-center tracking-wide">
                  {user.initials}
                </div>
              )}

              {/* Presence indicator dot */}
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                  user.isActive ? 'bg-[#047857]' : 'bg-[#9CA3AF]'
                }`}
              />
            </button>

            {/* User Profile Popover (Single source of truth for user profile & sign out) */}
            <UserProfilePopover
              isOpen={isProfileOpen}
              onClose={() => setIsProfileOpen(false)}
              user={user}
              onSignOut={onSignOut}
              onProfileClick={onProfileClick}
              onSwitchDepartment={onSwitchDepartment}
              onToggleTheme={onToggleTheme}
              currentTheme={currentTheme}
            />
          </div>

        </div>

      </div>
    </header>
  );
};

export default Topbar;
