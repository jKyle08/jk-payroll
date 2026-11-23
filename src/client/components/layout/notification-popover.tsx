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
  triggerRef?: React.RefObject<HTMLElement | null>;
  id?: string;
}

const NotificationActorAvatar: React.FC<{
  actor: { name: string; avatarUrl?: string; initials: string };
}> = ({ actor }) => {
  const [imageError, setImageError] = useState(false);

  if (actor.avatarUrl && !imageError) {
    return (
      <img
        src={actor.avatarUrl}
        alt={actor.name}
        onError={() => setImageError(true)}
        className="w-full h-full rounded-full object-cover"
      />
    );
  }

  return (
    <span className="font-semibold text-xs text-slate-900 dark:text-[#CBD5E1]">
      {actor.initials}
    </span>
  );
};

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onItemClick,
  triggerRef,
  id = 'topbar-notifications-popover',
}) => {
  const [filter, setFilter] = useState<'All' | 'Unread'>('All');
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

  const getEventIcon = (type: NotificationType, className = 'w-4 h-4 text-slate-600 dark:text-slate-300') => {
    switch (type) {
      case 'leave_request':
        return <CalendarDays className={className} />;
      case 'approval':
        return <FileCheck2 className={className} />;
      case 'payroll_run':
        return <DollarSign className={className} />;
      default:
        return <AlertCircle className={className} />;
    }
  };

  return (
    <div
      ref={popoverRef}
      id={id}
      className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-[#181D2A] border border-slate-200 dark:border-white/12 shadow-2xl dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.75)] overflow-hidden z-40 animate-in fade-in zoom-in-95 duration-150 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent"
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-white/10 bg-white dark:bg-[#141924]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-base text-slate-900 dark:text-[#F8FAFC] tracking-tight">
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
      <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-white/10">
        {displayedNotifications.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400 dark:text-[#64748B]">
            <Inbox className="w-10 h-10 mb-2 stroke-[1.5]" />
            <p className="text-sm font-medium text-slate-900 dark:text-[#F8FAFC]">
              No {filter === 'Unread' ? 'unread ' : ''}notifications
            </p>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">You are all caught up with your payroll events!</p>
          </div>
        ) : (
          displayedNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                onItemClick?.(item);
                onClose();
              }}
              className={`p-3.5 flex items-start space-x-3 hover:bg-slate-50 dark:hover:bg-white/[0.04] cursor-pointer transition-colors relative ${
                !item.isRead ? 'bg-slate-50/60 dark:bg-white/[0.02]' : ''
              }`}
            >
              {/* Actor Avatar / Category Icon */}
              <div className="relative flex-shrink-0">
                {item.actor ? (
                  <>
                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-[#121620] flex items-center justify-center border border-slate-200 dark:border-white/10 overflow-hidden">
                      <NotificationActorAvatar actor={item.actor} />
                    </div>
                    {/* Small secondary event-type badge (only when an actor exists) */}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-[#181D2A] border border-slate-200 dark:border-white/10 shadow-xs flex items-center justify-center">
                      {getEventIcon(item.type, 'w-2.5 h-2.5 text-slate-600 dark:text-slate-300')}
                    </div>
                  </>
                ) : (
                  /* When no actor exists: display event icon in main circle without duplicate secondary badge */
                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-[#121620] flex items-center justify-center border border-slate-200 dark:border-white/10">
                    {getEventIcon(item.type, 'w-4 h-4 text-slate-600 dark:text-slate-300')}
                  </div>
                )}
              </div>

              {/* Text Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <p className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] line-clamp-1">
                    {item.title}
                  </p>
                  {!item.isRead && (
                    <span className="w-2 h-2 rounded-full bg-[#0F172A] dark:bg-[#CBD5E1] flex-shrink-0 mt-1" />
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] line-clamp-2 mt-0.5">
                  {item.description}
                </p>
                <div className="flex items-center space-x-2 mt-1.5">
                  {getStatusBadge(item.status)}
                  <span className="text-[11px] text-slate-400 dark:text-[#64748B] font-mono">
                    {item.timestamp}
                  </span>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-[#64748B] self-center flex-shrink-0" />
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2 bg-slate-50/80 dark:bg-[#141924] border-t border-slate-100 dark:border-white/10">
        <Button
          variant="ghost"
          size="sm"
          fullWidth
          onClick={onClose}
          className="text-xs text-slate-600 dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]"
        >
          Close Notifications
        </Button>
      </div>
    </div>
  );
};

export default NotificationPopover;
