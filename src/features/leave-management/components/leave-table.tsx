// ==============================================================================
// JK-PAYROLL: LEAVE TABLE VISUAL COMPONENT
// File: src/features/leave-management/components/leave-table.tsx
// ==============================================================================

import React, { useState } from 'react';
import {
  CalendarDays,
  FileCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Search,
  ChevronRight,
  User,
} from 'lucide-react';
import { LeaveRequest, LeaveStatus } from '../types.js';
import { Pagination, usePagination } from '../../../components/ui/Pagination.js';

export interface LeaveTableProps {
  records: LeaveRequest[];
  canApprove?: boolean;
  onApprove?: (record: LeaveRequest) => void;
  onReject?: (record: LeaveRequest) => void;
  isLoading?: boolean;
}

export const LeaveTable: React.FC<LeaveTableProps> = ({
  records,
  canApprove = false,
  onApprove,
  onReject,
  isLoading = false,
}) => {
  const [statusFilter, setStatusFilter] = useState<'All' | LeaveStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecords = records.filter((r) => {
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchesSearch =
      r.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.typeOfLeaveId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pagination = usePagination(filteredRecords, 10);

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            <span>Approved</span>
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3 h-3" />
            <span>Rejected</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Table Controls */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 w-full md:w-72">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by reason or ID..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-3 text-center w-12 font-mono">#</th>
              <th className="py-3.5 px-4">Applicant / Employee</th>
              <th className="py-3.5 px-4">Duration</th>
              <th className="py-3.5 px-4">Dates</th>
              <th className="py-3.5 px-4">Reason</th>
              <th className="py-3.5 px-4">Status</th>
              {canApprove && <th className="py-3.5 px-4 text-right">Approval Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={canApprove ? 7 : 6} className="py-12 text-center text-slate-400">
                  <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-50 stroke-[1.5]" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">
                    No leave requests found
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    No records match the current status filter
                  </p>
                </td>
              </tr>
            ) : (
              pagination.pageItems.map((item, idx) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-3 text-center font-mono text-[11px] text-slate-400 font-medium">
                    {pagination.startIndex + idx + 1}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs ring-1 ring-blue-500/20">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          Employee #{item.userId.slice(0, 8)}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400">
                          Dept: {item.departmentId.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {item.daysCount} {item.daysCount === 1 ? 'day' : 'days'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="text-slate-600 dark:text-slate-300">
                      {item.startDate} &rarr; {item.endDate}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="text-slate-600 dark:text-slate-300 truncate max-w-xs">
                      {item.reason || 'Personal / General leave'}
                    </p>
                  </td>

                  <td className="py-3.5 px-4">{getStatusBadge(item.status)}</td>

                  {canApprove && (
                    <td className="py-3.5 px-4 text-right">
                      {item.status === 'Pending' ? (
                        <div className="inline-flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => onApprove?.(item)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => onReject?.(item)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Completed</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer: Pagination */}
      <Pagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={pagination.total}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
        itemLabel="leave requests"
      />
    </div>
  );
};

export default LeaveTable;
