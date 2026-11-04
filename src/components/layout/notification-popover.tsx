// ==============================================================================
// JK-PAYROLL: NOTIFICATION POPOVER COMPONENT
// File: src/components/layout/notification-popover.tsx
// ==============================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  CalendarDays,
  FileCheck2,
  DollarSign,
  AlertCircle,
  Inbox,
  ChevronRight,
} from 'lucide-react';

export type NotificationType = 'leave_request' | 'payroll_run' | 'approval' | 'system';
export type NotificationStatus = 'Pending' | 'Approved' | 'Rejected' | 'Info';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  status?: NotificationStatus;
  actionUrl?: string;
  actor?: {
    name: string;
    avatarUrl?: string;
    initials: string;
  };
}

export interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead?: () => void;
  onItemClick?: (item: NotificationItem) => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onItemClick,
}) => {
  const [filter, setFilter] = useState<'All' | 'Unread'>('All');
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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const displayedNotifications = notifications.filter((n) => {
    if (filter === 'Unread') return !n.isRead;
    return true;
  });

  const getStatusBadge = (status?: NotificationStatus) => {
    if (!status) return null;
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800">
            Pending Approval
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
            Approved
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  const getEventIcon = (type: NotificationType) => {
    switch (type) {
      case 'leave_request':
        return <CalendarDays className="w-4 h-4 text-blue-500" />;
      case 'approval':
        return <FileCheck2 className="w-4 h-4 text-emerald-500" />;
      case 'payroll_run':
        return <DollarSign className="w-4 h-4 text-amber-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-14 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-base text-slate-900 dark:text-white tracking-tight">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500 text-white">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && onMarkAllAsRead && (
            <button
              onClick={onMarkAllAsRead}
              className="text-xs text-[#0F172A] hover:underline font-medium inline-flex items-center space-x-1 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('All')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === 'All'
                ? 'bg-[#0F172A] text-white'
                : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('Unread')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === 'Unread'
                ? 'bg-[#0F172A] text-white'
                : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-[#E5E7EB]">
        {displayedNotifications.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center text-[#9CA3AF]">
            <Inbox className="w-10 h-10 mb-2 stroke-[1.5]" />
            <p className="text-sm font-medium text-[#111827]">
              No {filter === 'Unread' ? 'unread ' : ''}notifications
            </p>
            <p className="text-xs text-[#6B7280] mt-1">You are all caught up with your payroll events!</p>
          </div>
        ) : (
          displayedNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                onItemClick?.(item);
                onClose();
              }}
              className={`p-3.5 flex items-start space-x-3 hover:bg-[#F8FAFC] cursor-pointer transition-colors relative ${
                !item.isRead ? 'bg-[#F8FAFC]' : ''
              }`}
            >
              {/* Actor Avatar / Category Icon */}
              <div className="relative flex-shrink-0">
                {item.actor ? (
                  <div className="w-9 h-9 rounded-full bg-[#F1F5F9] text-[#0F172A] font-semibold flex items-center justify-center text-xs border border-[#E5E7EB]">
                    {item.actor.initials}
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#F1F5F9] flex items-center justify-center border border-[#E5E7EB]">
                    {getEventIcon(item.type)}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border border-[#E5E7EB] shadow-sm flex items-center justify-center">
                  {getEventIcon(item.type)}
                </div>
              </div>

              {/* Text Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <p className="text-xs font-semibold text-[#111827] line-clamp-1">
                    {item.title}
                  </p>
                  {!item.isRead && (
                    <span className="w-2 h-2 rounded-full bg-[#0F172A] flex-shrink-0 mt-1" />
                  )}
                </div>
                <p className="text-xs text-[#6B7280] line-clamp-2 mt-0.5">
                  {item.description}
                </p>
                <div className="flex items-center space-x-2 mt-1.5">
                  {getStatusBadge(item.status)}
                  <span className="text-[11px] text-[#6B7280] font-mono">
                    {item.timestamp}
                  </span>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-[#9CA3AF] self-center flex-shrink-0" />
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 text-center">
        <button
          onClick={onClose}
          className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          Close Notifications
        </button>
      </div>
    </div>
  );
};

export default NotificationPopover;
