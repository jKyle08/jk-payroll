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
import { Button, Badge } from '../ui/index.js';

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
    return (
      <Badge variant="neutral" size="sm">
        {status === 'Pending' ? 'Pending Approval' : status}
      </Badge>
    );
  };

  const getEventIcon = (type: NotificationType) => {
    switch (type) {
      case 'leave_request':
        return <CalendarDays className="w-4 h-4 text-slate-600 dark:text-slate-300" />;
      case 'approval':
        return <FileCheck2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />;
      case 'payroll_run':
        return <DollarSign className="w-4 h-4 text-slate-600 dark:text-slate-300" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-600 dark:text-slate-300" />;
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
              <Badge variant="neutral" size="sm">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && onMarkAllAsRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllAsRead}
              className="h-7 text-xs"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              <span>Mark all as read</span>
            </Button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex space-x-2">
          <Button
            type="button"
            size="sm"
            variant={filter === 'All' ? 'primary' : 'secondary'}
            onClick={() => setFilter('All')}
          >
            All
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === 'Unread' ? 'primary' : 'secondary'}
            onClick={() => setFilter('Unread')}
          >
            Unread ({unreadCount})
          </Button>
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
      <div className="p-2 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800">
        <Button
          variant="ghost"
          size="sm"
          fullWidth
          onClick={onClose}
          className="text-xs text-slate-600 dark:text-slate-400"
        >
          Close Notifications
        </Button>
      </div>
    </div>
  );
};

export default NotificationPopover;
