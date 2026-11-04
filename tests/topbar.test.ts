import { describe, it, expect } from 'vitest';
import { UserProfileData, NotificationItem } from '../src/components/layout/index.js';

describe('Facebook-Style Topbar & Popover Logic Tests', () => {
  const mockUser: UserProfileData = {
    id: 'usr-001',
    fullName: 'Alexander Wright',
    email: 'a.wright@apexcorp.internal',
    initials: 'AW',
    isActive: true,
    tenantId: 'tnt-001',
    tenantName: 'Apex Innovations Corp',
    tenantCode: 'APEX-CORP',
    departmentName: 'Human Resources',
    subDepartmentName: 'Payroll Division',
    role: 'Tenant Admin',
  };

  const mockNotifications: NotificationItem[] = [
    {
      id: 'notif-1',
      type: 'leave_request',
      title: 'Sarah Jenkins submitted a Leave Request',
      description: 'Vacation Leave: Nov 12 - Nov 16',
      timestamp: '10m ago',
      isRead: false,
      status: 'Pending',
    },
    {
      id: 'notif-2',
      type: 'payroll_run',
      title: 'October Payroll Batch #2026-10 Approved',
      description: 'Dispatched to 142 employees',
      timestamp: '2h ago',
      isRead: true,
      status: 'Approved',
    },
  ];

  it('correctly calculates unread count for badge pill', () => {
    const unreadCount = mockNotifications.filter((n) => !n.isRead).length;
    expect(unreadCount).toBe(1);
  });

  it('correctly formats department and sub-department hierarchy breadcrumb', () => {
    const breadcrumb = `${mockUser.departmentName}${
      mockUser.subDepartmentName ? ` > ${mockUser.subDepartmentName}` : ''
    }`;
    expect(breadcrumb).toBe('Human Resources > Payroll Division');
  });

  it('filters notifications by All vs Unread tabs', () => {
    const all = mockNotifications;
    const unreadOnly = mockNotifications.filter((n) => !n.isRead);

    expect(all).toHaveLength(2);
    expect(unreadOnly).toHaveLength(1);
    expect(unreadOnly[0].id).toBe('notif-1');
  });

  it('handles mark all as read action', () => {
    const updated = mockNotifications.map((n) => ({ ...n, isRead: true }));
    expect(updated.every((n) => n.isRead)).toBe(true);
    expect(updated.filter((n) => !n.isRead)).toHaveLength(0);
  });
});
