// ==============================================================================
// JK-PAYROLL: USER PROFILE POPOVER COMPONENT (SAAS USER MENU)
// File: src/client/components/layout/user-profile-popover.tsx
// ==============================================================================

import React, { useRef, useEffect } from 'react';
import {
  User,
  Building2,
  LogOut,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';

export interface UserProfileData {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  initials: string;
  isActive: boolean;
  tenantId: string;
  tenantName: string;
  tenantCode: string; // e.g. "APEX-HLTH"
  departmentName: string;
  subDepartmentName?: string;
  role?: string;
}

export interface UserProfilePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfileData;
  canEditOrganization?: boolean;
  onEditOrganization?: () => void;
  onSignOut?: () => void;
  onProfileClick?: () => void;
  onSwitchDepartment?: () => void;
  onToggleTheme?: (theme: 'light' | 'dark') => void;
  currentTheme?: 'light' | 'dark';
  triggerRef?: React.RefObject<HTMLElement | null>;
  id?: string;
}

export const UserProfilePopover: React.FC<UserProfilePopoverProps> = ({
  isOpen,
  onClose,
  user,
  canEditOrganization = false,
  onEditOrganization,
  onSignOut,
  onProfileClick,
  onSwitchDepartment,
  onToggleTheme,
  currentTheme = 'light',
  triggerRef,
  id = 'topbar-user-profile-popover',
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      // Do nothing if clicking inside the popover itself
      if (popoverRef.current && popoverRef.current.contains(target)) {
        return;
      }
      // Do nothing if clicking the trigger button (the trigger's own onClick toggles it)
      if (triggerRef?.current && triggerRef.current.contains(target)) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      id={id}
      className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-[#181D2A] border border-slate-200 dark:border-white/12 shadow-2xl dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.75)] overflow-hidden z-40 animate-in fade-in zoom-in-95 duration-150 select-none before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent"
      role="dialog"
      aria-label="User Account Menu"
    >
      {/* 1. User Identity Header */}
      <div className="p-4 bg-gradient-to-b from-slate-50/70 to-white dark:from-[#141924] dark:to-[#181D2A] border-b border-slate-100 dark:border-white/10">
        <div className="flex items-center space-x-3">
          {/* Avatar with Status Dot */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-[#0F172A] text-white dark:bg-[#121620] dark:text-[#CBD5E1] font-bold flex items-center justify-center text-base border border-slate-200 dark:border-white/10">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                user.initials || user.fullName?.slice(0, 2).toUpperCase() || 'U'
              )}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-[#181D2A] ${
                user.isActive ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
          </div>

          {/* User Details */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-[#F8FAFC] truncate">
              {user.fullName}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate">{user.email}</p>
            {user.role && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-[#202637] text-slate-700 dark:text-[#94A3B8] border border-slate-200 dark:border-white/10">
                {user.role}
              </span>
            )}
          </div>
        </div>

        {/* Organization & Department Context */}
        <div className="mt-3.5 p-2.5 rounded-lg bg-slate-50 dark:bg-[#121620] border border-slate-200 dark:border-white/10 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-[#64748B]">Organization:</span>
            <span className="font-semibold text-slate-900 dark:text-[#F8FAFC] font-mono text-[11px] truncate max-w-[160px]">
              [{user.tenantCode}] {user.tenantName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-[#64748B]">Department:</span>
            <span className="font-semibold text-slate-900 dark:text-[#F8FAFC] truncate max-w-[160px]">
              {user.departmentName}
              {user.subDepartmentName ? ` > ${user.subDepartmentName}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Action Menu Items */}
      <div className="p-2 space-y-1">
        {/* Edit Organization (Visible only to authorized organization managers) */}
        {canEditOrganization && (
          <button
            type="button"
            onClick={() => {
              onEditOrganization?.();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors group cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#141924] dark:border dark:border-white/5 flex items-center justify-center text-slate-600 dark:text-[#94A3B8] group-hover:bg-amber-50 dark:group-hover:bg-amber-950/40 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-900 dark:text-[#F8FAFC]">Edit Organization</p>
                <p className="text-[11px] text-slate-400 dark:text-[#64748B]">Workspace identity, tax & payroll</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-[#64748B] group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* Profile Settings (Edit Profile) */}
        <button
          type="button"
          onClick={() => {
            onProfileClick?.();
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors group cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#141924] dark:border dark:border-white/5 flex items-center justify-center text-slate-600 dark:text-[#94A3B8] group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              <User className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="font-medium text-slate-800 dark:text-[#F8FAFC]">Profile Settings</p>
              <p className="text-[11px] text-slate-400 dark:text-[#64748B]">View personal details & account</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-[#64748B] group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Switch Department */}
        <button
          type="button"
          onClick={() => {
            onSwitchDepartment?.();
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors group cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#141924] dark:border dark:border-white/5 flex items-center justify-center text-slate-600 dark:text-[#94A3B8] group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="font-medium text-slate-800 dark:text-[#F8FAFC]">Switch Department</p>
              <p className="text-[11px] text-slate-400 dark:text-[#64748B]">Change operational division</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-[#64748B] group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <div className="border-t border-slate-100 dark:border-white/10 mx-2" />

      {/* 3. Sign Out Button */}
      <div className="p-2">
        <button
          type="button"
          onClick={() => {
            onSignOut?.();
            onClose();
          }}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/60 dark:border dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
            <LogOut className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p>Sign Out</p>
            <p className="text-[10px] text-rose-400 font-normal">Terminate active session safely</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default UserProfilePopover;
