// ==============================================================================
// JK-PAYROLL: SUPER ADMIN ORGANIZATION SWITCHER MODAL
// Design System: Balanced Glossy Graphite
// File: src/components/layout/OrganizationSwitcherModal.tsx
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Search,
  Check,
  X,
  RotateCcw,
  Layers,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { fetchOrganizations } from '../../../features/organizations/services/client.js';
import { Organization } from '../../../features/organizations/types.js';
import { Button, Badge, StatusIndicator, Input } from '../ui/index.js';

export interface OrganizationSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOrgId: string;
  onSelectOrg: (org: Organization) => void;
  onResetOrg?: () => void;
  isSwapped?: boolean;
}

// Fallback seed organizations for isolated test environments or SSR
const FALLBACK_ORGANIZATIONS: Organization[] = [
  {
    id: 'tnt-apex-health-01',
    code: 'APEX-HLTH',
    slug: 'org_apex',
    name: 'Apex Health Systems',
    industry: 'Healthcare & Clinical Services',
    sector: 'Private',
    tier: 'Enterprise',
    status: 'Active',
    startDate: '2026-01-01',
    currency: 'PHP',
    timezone: 'Asia/Manila',
    countryCode: 'PH',
    defaultPayFrequency: 'Semi-Monthly',
    supportedWorkModes: ['OnSite', 'Hybrid'],
    statutoryIds: { tin: '123-456-789-000' },
    modules: ['Department', 'EmployeeProfile', 'RolePermission', 'PayrollProcessing', 'TypeOfLeave', 'RequestForLeave'],
    settings: {
      payroll: {
        standardDailyHours: 8,
        standardWorkingDaysPerYear: 261,
        prorationMethod: 'WorkingDays',
        statutoryDeductionSplit: 'SplitEqually',
      },
      timeAndAttendance: {
        gracePeriodMinutes: 15,
        overtimeMinimumMinutes: 60,
        allowWebClockIn: true,
        requireGeofence: false,
        geofenceRadiusMeters: 100,
      },
      leaves: {
        allowNegativeBalance: false,
        requireApprovalLevels: 1,
        carryOverLimitDays: 5,
      },
      security: {
        enforce2FA: false,
        protectPayslipWithPassword: true,
        payslipPasswordFormat: 'BIRTHDATE_YYYYMMDD',
      },
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'tnt-stellar-tech-02',
    code: 'STEL-TECH',
    slug: 'org_stellar',
    name: 'Stellar Tech Innovations',
    industry: 'Cloud Software & AI',
    sector: 'Private',
    tier: 'Standard',
    status: 'Active',
    startDate: '2026-02-01',
    currency: 'USD',
    timezone: 'America/New_York',
    countryCode: 'US',
    defaultPayFrequency: 'Bi-Weekly',
    supportedWorkModes: ['Remote', 'Hybrid'],
    statutoryIds: { ein: '98-7654321' },
    modules: ['Department', 'EmployeeProfile', 'RolePermission', 'TypeOfLeave'],
    settings: {
      payroll: {
        standardDailyHours: 8,
        standardWorkingDaysPerYear: 260,
        prorationMethod: 'WorkingDays',
        statutoryDeductionSplit: 'FirstPeriodOnly',
      },
      timeAndAttendance: {
        gracePeriodMinutes: 10,
        overtimeMinimumMinutes: 30,
        allowWebClockIn: true,
        requireGeofence: false,
        geofenceRadiusMeters: 50,
      },
      leaves: {
        allowNegativeBalance: true,
        requireApprovalLevels: 2,
        carryOverLimitDays: 10,
      },
      security: {
        enforce2FA: true,
        protectPayslipWithPassword: true,
        payslipPasswordFormat: 'EMPLOYEE_ID_LAST4',
      },
    },
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'tnt-green-earth-03',
    code: 'GREE-NGO',
    slug: 'org_greenearth',
    name: 'Green Earth Conservation Alliance',
    industry: 'Environmental Non-Profit',
    sector: 'NonProfit',
    tier: 'Starter',
    status: 'Active',
    startDate: '2026-03-01',
    currency: 'EUR',
    timezone: 'Europe/Paris',
    countryCode: 'FR',
    defaultPayFrequency: 'Monthly',
    supportedWorkModes: ['Remote'],
    statutoryIds: { siren: '123456789' },
    modules: ['Department', 'EmployeeProfile', 'RolePermission'],
    settings: {
      payroll: {
        standardDailyHours: 7,
        standardWorkingDaysPerYear: 220,
        prorationMethod: 'CalendarDays',
        statutoryDeductionSplit: 'SplitEqually',
      },
      timeAndAttendance: {
        gracePeriodMinutes: 20,
        overtimeMinimumMinutes: 45,
        allowWebClockIn: true,
        requireGeofence: false,
        geofenceRadiusMeters: 200,
      },
      leaves: {
        allowNegativeBalance: false,
        requireApprovalLevels: 1,
        carryOverLimitDays: 0,
      },
      security: {
        enforce2FA: false,
        protectPayslipWithPassword: false,
        payslipPasswordFormat: 'DEFAULT',
      },
    },
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
];

export const OrganizationSwitcherModal: React.FC<OrganizationSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentOrgId,
  onSelectOrg,
  onResetOrg,
  isSwapped = false,
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>(FALLBACK_ORGANIZATIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadOrganizations = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchOrganizations({ limit: 100 });
        if (isMounted && response?.items && response.items.length > 0) {
          setOrganizations(response.items);
        }
      } catch (err: any) {
        console.warn('Failed to fetch remote organizations, using fallback list:', err?.message);
        // Fallback list is already in state
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadOrganizations();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handle keyboard ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter organizations by search term (name, code, slug, sector, tier)
  const filteredOrgs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return organizations;

    return organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(q) ||
        org.code.toLowerCase().includes(q) ||
        org.slug.toLowerCase().includes(q) ||
        org.sector.toLowerCase().includes(q) ||
        org.tier.toLowerCase().includes(q) ||
        (org.industry && org.industry.toLowerCase().includes(q))
    );
  }, [organizations, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="switcher-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0E14]/75 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-[#181D2A] border border-slate-200 dark:border-white/12 rounded-2xl shadow-2xl dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.75)] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 relative before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent">
        {/* ================================================================== */}
        {/* 1. MODAL HEADER: TITLES, SUPER ADMIN BADGE, CLOSE BUTTON           */}
        {/* ================================================================== */}
        <div className="p-5 border-b border-slate-100 dark:border-white/10 bg-[#FBFBFC] dark:bg-[#141924] flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="warning" size="sm">
                <ShieldAlert className="w-3 h-3 mr-1 text-amber-500" />
                Super Admin Impersonation
              </Badge>
              {isSwapped && (
                <Badge variant="neutral" size="sm">
                  <Sparkles className="w-3 h-3 mr-1 text-slate-500 dark:text-[#94A3B8]" />
                  Currently Swapped
                </Badge>
              )}
            </div>
            <h2 id="switcher-modal-title" className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
              Switch Active Organization Workspace
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Select an organization to navigate their live transactions, departmental tree, and allocated modules.
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X className="w-4 h-4 text-slate-500 dark:text-[#94A3B8]" />
          </Button>
        </div>

        {/* ================================================================== */}
        {/* 2. SEARCH BAR                                                      */}
        {/* ================================================================== */}
        <div className="p-4 border-b border-slate-100 dark:border-white/10 bg-white dark:bg-[#141924]">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by organization name, code, slug, sector, or tier..."
            leftIcon={<Search className="w-4 h-4" />}
            autoFocus
            rightElement={
              searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#F8FAFC] transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : undefined
            }
          />
        </div>

        {/* ================================================================== */}
        {/* 3. ORGANIZATION LIST                                               */}
        {/* ================================================================== */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar min-h-[220px]">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 dark:text-[#94A3B8]">
              <Loader2 className="w-6 h-6 animate-spin text-slate-600 dark:text-[#CBD5E1] mb-2" />
              <p className="text-xs font-medium">Loading organization directory...</p>
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-[#64748B]">
              <Building2 className="w-8 h-8 text-slate-400 dark:text-[#64748B] mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium text-slate-700 dark:text-[#94A3B8]">No organizations found</p>
              <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-0.5">Try searching with a different keyword</p>
            </div>
          ) : (
            filteredOrgs.map((org) => {
              const isActive = org.id === currentOrgId;
              const moduleCount = org.modules ? org.modules.length : 0;

              return (
                <div
                  key={org.id}
                  onClick={() => {
                    if (!isActive) {
                      onSelectOrg(org);
                      onClose();
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all select-none flex items-center justify-between gap-3 ${
                    isActive
                      ? 'border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/25 cursor-default'
                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#141924] hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#202637] cursor-pointer shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Organization Code Avatar */}
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs tracking-wider flex-shrink-0 ${
                        isActive
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#0F172A] text-white dark:bg-[#121620] dark:border dark:border-white/10 dark:text-[#CBD5E1] shadow-xs'
                      }`}
                    >
                      {org.code.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Organization Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] truncate">
                          {org.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#181D2A] text-slate-600 dark:text-[#CBD5E1] border border-transparent dark:border-white/5">
                          {org.code}
                        </span>
                        <Badge variant="neutral" size="sm">
                          {org.tier}
                        </Badge>
                        <StatusIndicator status={org.status} />
                      </div>

                      {/* Subtitle: Sector, Industry & Modules */}
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-[#94A3B8] flex-wrap">
                        <span>{org.industry || org.sector}</span>
                        <span className="dark:text-white/10">•</span>
                        <span className="inline-flex items-center gap-1 font-mono text-[10px]">
                          <Layers className="w-3 h-3 text-slate-400 dark:text-[#64748B]" />
                          {moduleCount} modules
                        </span>
                        {org.modules && org.modules.length > 0 && (
                          <span className="text-[10px] text-slate-400 dark:text-[#64748B] truncate max-w-xs">
                            ({org.modules.join(', ')})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Status / Action Trigger */}
                  <div className="flex-shrink-0">
                    {isActive ? (
                      <Badge variant="neutral" dot size="sm">
                        Active Workspace
                      </Badge>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectOrg(org);
                          onClose();
                        }}
                      >
                        Switch
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ================================================================== */}
        {/* 4. MODAL FOOTER                                                    */}
        {/* ================================================================== */}
        <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-[#FBFBFC] dark:bg-[#141924] flex items-center justify-between gap-3">
          <div>
            {isSwapped && onResetOrg && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onResetOrg();
                  onClose();
                }}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset to Default Organization
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSwitcherModal;

