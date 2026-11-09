// ==============================================================================
// JK-PAYROLL: PAGINATION + usePagination HOOK
// Design System: "Midnight & Champagne Steel" (Based on index.html specification)
// File: src/components/ui/Pagination.tsx
// ==============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CustomSelect } from './CustomSelect.js';

export const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

/** Client + Server pagination state. Resets to a valid page when data shrinks and exposes `isPaging` for table loading indicators. */
export function usePagination<T>(items: T[] = [], initialPageSize = 10, serverTotalCount?: number) {
  const safeItems = Array.isArray(items) ? items : [];
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [isPaging, setIsPaging] = useState(false);

  const effectiveTotal = serverTotalCount !== undefined ? serverTotalCount : safeItems.length;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / pageSize));

  useEffect(() => {
    if (page > totalPages) setPageState(totalPages);
  }, [page, totalPages]);

  const triggerPagingIndicator = () => {
    setIsPaging(true);
    setTimeout(() => {
      setIsPaging(false);
    }, 350);
  };

  const setPage = (nextPage: number) => {
    triggerPagingIndicator();
    setPageState(nextPage);
  };

  const setPageSize = (size: number) => {
    triggerPagingIndicator();
    setPageSizeState(size);
    setPageState(1);
  };

  const pageItems = useMemo(() => {
    // If serverTotalCount is provided and the array is already a server-sliced page, return safeItems directly
    if (serverTotalCount !== undefined && safeItems.length <= pageSize) {
      return safeItems;
    }
    return safeItems.slice((page - 1) * pageSize, page * pageSize);
  }, [safeItems, page, pageSize, serverTotalCount]);

  return {
    page,
    currentPage: page,
    pageSize,
    totalPages,
    total: effectiveTotal,
    totalItems: effectiveTotal,
    startIndex: (page - 1) * pageSize,
    pageItems,
    paginatedItems: pageItems,
    isPaging,
    setPage,
    setCurrentPage: setPage,
    setPageSize,
    resetPage: () => setPageState(1),
  };
}

function buildPageList(page: number, totalPages: number): (number | 'ellipsis-l' | 'ellipsis-r')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: (number | 'ellipsis-l' | 'ellipsis-r')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) pages.push('ellipsis-l');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push('ellipsis-r');
  pages.push(totalPages);
  return pages;
}

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  itemLabel = 'items',
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className={`px-5 py-3 rounded-b-2xl border-t border-[#E5E7EB] dark:border-slate-800 bg-[#FBFBFC] dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 ${className}`}
    >
      {/* Left: "Show [10] items per page | Showing 1 to 10 of 12 items" */}
      <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
        {onPageSizeChange && (
          <>
            <div className="flex items-center gap-1.5">
              <span>Show</span>
              <CustomSelect
                size="sm"
                dropUp
                className="w-[72px]"
                value={String(pageSize)}
                onChange={(v) => onPageSizeChange(Number(v))}
                options={pageSizeOptions.map((n) => ({
                  value: String(n),
                  label: String(n),
                }))}
              />
              <span>items per page</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">|</span>
          </>
        )}

        <span className="font-medium text-slate-600 dark:text-slate-300">
          Showing{' '}
          <span className="font-semibold text-[#111827] dark:text-white font-mono tabular-nums">
            {from}
          </span>{' '}
          to{' '}
          <span className="font-semibold text-[#111827] dark:text-white font-mono tabular-nums">
            {to}
          </span>{' '}
          of{' '}
          <span className="font-semibold text-[#111827] dark:text-white font-mono tabular-nums">
            {total}
          </span>{' '}
          {itemLabel}
        </span>
      </div>

      {/* Bottom Right: Previous button, page pills, and Next button */}
      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          title="Previous Page"
          aria-label="Previous page"
          className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-medium transition-colors text-xs cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center gap-1">
          {buildPageList(page, totalPages).map((p) =>
            typeof p === 'number' ? (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`h-8 min-w-8 px-2.5 rounded-lg border text-xs font-semibold font-mono tabular-nums flex items-center justify-center transition-colors cursor-pointer ${
                  p === page
                    ? 'bg-[#0F172A] text-white border-[#0F172A] dark:bg-blue-600 dark:border-blue-600 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {p}
              </button>
            ) : (
              <span key={p} className="px-1 text-slate-400">
                …
              </span>
            )
          )}
        </div>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          title="Next Page"
          aria-label="Next page"
          className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-medium transition-colors text-xs cursor-pointer"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
