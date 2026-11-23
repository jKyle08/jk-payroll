// ==============================================================================
// JK-PAYROLL: GLOBAL COMMAND PALETTE MODAL
// Design System: Balanced Glossy Graphite (Centered SaaS Command Overlay)
// File: src/client/components/layout/CommandPaletteModal.tsx
// ==============================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  LayoutDashboard,
  Globe2,
  Building,
  Users2,
  Shield,
  ShieldCheck,
  Sliders,
  FileCheck2,
  Coins,
  FileSpreadsheet,
  CalendarCheck,
  Sun,
  Moon,
  LogOut,
  User,
  Building2,
  CornerDownLeft,
} from 'lucide-react';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  group: 'Navigation' | 'Actions' | 'Preferences';
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string[];
}

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
  onToggleTheme?: (theme: 'light' | 'dark') => void;
  currentTheme?: 'light' | 'dark';
  onSignOut?: () => void;
  onProfileClick?: () => void;
  onSwitchOrganization?: () => void;
  isSuperAdmin?: boolean;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onToggleTheme,
  currentTheme = 'light',
  onSignOut,
  onProfileClick,
  onSwitchOrganization,
  isSuperAdmin = false,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus input whenever opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Construct command items
  const commands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      // Navigation
      {
        id: 'nav-dashboard',
        label: 'Dashboard',
        description: 'View executive payroll and workforce insights',
        group: 'Navigation',
        icon: LayoutDashboard,
        keywords: ['overview', 'home', 'stats', 'analytics'],
        action: () => onNavigate?.('/dashboard'),
      },
      {
        id: 'nav-organizations',
        label: 'Organizations',
        description: 'Manage tenants, companies, and settings',
        group: 'Navigation',
        icon: Globe2,
        keywords: ['tenants', 'companies', 'orgs'],
        action: () => onNavigate?.('/organizations'),
      },
      {
        id: 'nav-departments',
        label: 'Departments',
        description: 'Organizational hierarchy and departmental modules',
        group: 'Navigation',
        icon: Building,
        keywords: ['branches', 'units', 'divisions'],
        action: () => onNavigate?.('/admin/departments'),
      },
      {
        id: 'nav-profiles',
        label: 'Staff Profiles',
        description: 'Employee directory and personal data records',
        group: 'Navigation',
        icon: Users2,
        keywords: ['employees', 'personnel', 'workers', 'staff'],
        action: () => onNavigate?.('/admin/profiles'),
      },
      {
        id: 'nav-roles',
        label: 'Roles & Directory',
        description: 'Manage job roles and tier assignments',
        group: 'Navigation',
        icon: Shield,
        keywords: ['permissions', 'access', 'rbac', 'admin'],
        action: () => onNavigate?.('/admin/roles'),
      },
      {
        id: 'nav-permissions',
        label: 'Role Permission Matrix',
        description: 'Configure module actions across roles',
        group: 'Navigation',
        icon: ShieldCheck,
        keywords: ['matrix', 'security', 'grants', 'rbac'],
        action: () => onNavigate?.('/admin/permissions'),
      },
      {
        id: 'nav-user-overrides',
        label: 'User Permission Overrides',
        description: 'Individual employee permission grants and exceptions',
        group: 'Navigation',
        icon: Sliders,
        keywords: ['exceptions', 'special', 'overrides'],
        action: () => onNavigate?.('/admin/security/user-overrides'),
      },
      {
        id: 'nav-audit',
        label: 'Audit Logs',
        description: 'System-wide immutable security audit trail',
        group: 'Navigation',
        icon: FileCheck2,
        keywords: ['history', 'logs', 'compliance', 'security'],
        action: () => onNavigate?.('/admin/security/audit'),
      },
      {
        id: 'nav-payroll',
        label: 'Payroll Processing',
        description: 'Compute and review monthly employee compensation',
        group: 'Navigation',
        icon: Coins,
        keywords: ['salary', 'pay', 'disbursement', 'compensation'],
        action: () => onNavigate?.('/payroll/compute'),
      },
      {
        id: 'nav-leave-requests',
        label: 'Leave Requests Queue',
        description: 'Review and approve pending employee leave filings',
        group: 'Navigation',
        icon: FileSpreadsheet,
        keywords: ['vacation', 'sick', 'time-off', 'filings'],
        action: () => onNavigate?.('/leaves/requests'),
      },
      {
        id: 'nav-leave-types',
        label: 'Leave Policies',
        description: 'Configure leave categories and entitlement rules',
        group: 'Navigation',
        icon: CalendarCheck,
        keywords: ['policies', 'types', 'benefits'],
        action: () => onNavigate?.('/leaves/types'),
      },
    ];

    // Quick Actions
    if (isSuperAdmin && onSwitchOrganization) {
      list.push({
        id: 'act-switch-org',
        label: 'Switch Organization Workspace',
        description: 'Switch tenant context (Super Admin only)',
        group: 'Actions',
        icon: Building2,
        keywords: ['tenant', 'swap', 'company'],
        action: onSwitchOrganization,
      });
    }

    if (onProfileClick) {
      list.push({
        id: 'act-profile',
        label: 'My Profile & Settings',
        description: 'View account preferences and personal info',
        group: 'Actions',
        icon: User,
        keywords: ['account', 'user', 'settings'],
        action: onProfileClick,
      });
    }

    // Preferences
    if (onToggleTheme) {
      list.push({
        id: 'pref-theme',
        label: currentTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme',
        description: 'Toggle application visual appearance',
        group: 'Preferences',
        icon: currentTheme === 'dark' ? Sun : Moon,
        keywords: ['appearance', 'color', 'mode', 'dark', 'light'],
        action: () => onToggleTheme(currentTheme === 'dark' ? 'light' : 'dark'),
      });
    }

    if (onSignOut) {
      list.push({
        id: 'act-logout',
        label: 'Sign Out',
        description: 'Terminate your active session safely',
        group: 'Preferences',
        icon: LogOut,
        keywords: ['logout', 'exit', 'disconnect'],
        action: onSignOut,
      });
    }

    return list;
  }, [
    onNavigate,
    onToggleTheme,
    currentTheme,
    onSignOut,
    onProfileClick,
    onSwitchOrganization,
    isSuperAdmin,
  ]);

  // Filter commands by query
  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((cmd) => {
      const matchLabel = cmd.label.toLowerCase().includes(q);
      const matchDesc = cmd.description?.toLowerCase().includes(q);
      const matchKeywords = cmd.keywords?.some((k) => k.toLowerCase().includes(q));
      return matchLabel || matchDesc || matchKeywords;
    });
  }, [commands, query]);

  // Reset selected index on filter
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Keyboard navigation & dismissal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? Math.max(0, filteredCommands.length - 1) : prev - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filteredCommands, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-[#0B0E14]/75 backdrop-blur-md select-none animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#181D2A] border border-slate-200 dark:border-white/12 shadow-2xl dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.75)] overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-150 relative before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent"
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#141924]">
          <Search className="w-5 h-5 text-slate-400 dark:text-[#64748B] mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actions, employees, modules..."
            className="w-full text-sm bg-transparent text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] outline-none border-none p-0 focus:ring-0 font-sans"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-[#F8FAFC] transition-colors mr-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium text-slate-500 dark:text-[#94A3B8] bg-slate-200/60 dark:bg-[#202637] rounded border border-slate-300 dark:border-white/10 pointer-events-none">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar text-xs">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-sm font-medium text-slate-600 dark:text-[#94A3B8]">
                No commands or modules found
              </p>
              <p className="text-xs text-slate-400 dark:text-[#64748B] mt-1">
                Try searching for dashboard, payroll, leave, or settings
              </p>
            </div>
          ) : (
            filteredCommands.map((cmd, index) => {
              const Icon = cmd.icon;
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer group ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-[#202637] text-slate-900 dark:text-[#F8FAFC] font-medium'
                      : 'text-slate-600 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[#0F172A] text-white dark:bg-[#CBD5E1] dark:text-[#0F172A]'
                          : 'bg-slate-100 dark:bg-[#121620] text-slate-500 dark:text-[#94A3B8] border border-transparent dark:border-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{cmd.label}</div>
                      {cmd.description && (
                        <div className="text-[11px] text-slate-400 dark:text-[#64748B] truncate mt-0.5">
                          {cmd.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    <span className="text-[10px] font-mono text-slate-400 dark:text-[#64748B] uppercase tracking-wider hidden sm:inline">
                      {cmd.group}
                    </span>
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-slate-400 dark:text-[#94A3B8]" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-[#141924] text-[11px] text-slate-400 dark:text-[#64748B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-slate-200/60 dark:bg-[#202637] border border-slate-300 dark:border-white/10 px-1 py-0.5 rounded text-[10px] text-slate-700 dark:text-[#94A3B8]">
                ↑↓
              </kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="font-mono bg-slate-200/60 dark:bg-[#202637] border border-slate-300 dark:border-white/10 px-1 py-0.5 rounded text-[10px] text-slate-700 dark:text-[#94A3B8]">
                ↵
              </kbd>{' '}
              Select
            </span>
          </div>
          <span>PayPulse Global Command Palette</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPaletteModal;
