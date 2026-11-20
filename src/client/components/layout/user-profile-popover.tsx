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
  onSignOut?: () => void;
  onProfileClick?: () => void;
  onSwitchDepartment?: () => void;
  onToggleTheme?: (theme: 'light' | 'dark') => void;
  currentTheme?: 'light' | 'dark';
}

export const UserProfilePopover: React.FC<UserProfilePopoverProps> = ({
  isOpen,
  onClose,
  user,
  onSignOut,
  onProfileClick,
  onSwitchDepartment,
  onToggleTheme,
  currentTheme = 'light',
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-14 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 select-none"
      role="dialog"
      aria-label="User Account Menu"
    >
      {/* 1. User Identity Header */}
      <div className="p-4 bg-gradient-to-b from-slate-50/70 to-white dark:from-slate-800/40 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          {/* Avatar with Status Dot */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-[#0F172A] text-white font-bold flex items-center justify-center text-base border border-[#E5E7EB] dark:border-slate-700">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                user.initials
              )}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                user.isActive ? 'bg-[#22A06B]' : 'bg-[#DC6262]'
              }`}
            />
          </div>

          {/* User Details */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-[#111827] dark:text-white truncate">
              {user.fullName}
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-slate-400 truncate">{user.email}</p>
            {user.role && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F1F5F9] dark:bg-slate-800 text-[#475569] dark:text-slate-300 border border-[#E5E7EB] dark:border-slate-700">
                {user.role}
              </span>
            )}
          </div>
        </div>

        {/* Organization & Department Context */}
        <div className="mt-3.5 p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E5E7EB] dark:border-slate-800 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#6B7280] dark:text-slate-400">Organization:</span>
            <span className="font-semibold text-[#0F172A] dark:text-slate-200 font-mono text-[11px] truncate max-w-[160px]">
              [{user.tenantCode}] {user.tenantName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6B7280] dark:text-slate-400">Department:</span>
            <span className="font-semibold text-[#111827] dark:text-white truncate max-w-[160px]">
              {user.departmentName}
              {user.subDepartmentName ? ` > ${user.subDepartmentName}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Action Menu Items */}
      <div className="p-2 space-y-1">
        {/* Profile Settings */}
        <button
          type="button"
          onClick={() => {
            onProfileClick?.();
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/60 group-hover:text-blue-600 transition-colors">
              <User className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="font-medium text-slate-800 dark:text-slate-200">Profile Settings</p>
              <p className="text-[11px] text-slate-400">View personal details & account</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Switch Department */}
        <button
          type="button"
          onClick={() => {
            onSwitchDepartment?.();
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/60 group-hover:text-blue-600 transition-colors">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="font-medium text-slate-800 dark:text-slate-200">Switch Department</p>
              <p className="text-[11px] text-slate-400">Change operational division</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 mx-2" />

      {/* 3. Sign Out Button */}
      <div className="p-2">
        <button
          type="button"
          onClick={() => {
            onSignOut?.();
            onClose();
          }}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
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
