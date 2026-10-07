'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { cx } from '@/theme/tokens';
import { messageOf } from '@/lib/api/errors';
import { getDays } from '../api/tracking.api';
import { todayInput } from '../constants/tracking.constants';
import type { DayRowDto, TrackingFilters as Filters } from '../types/tracking.dto';
import { DaySummariesToolbar } from './components/DaySummariesToolbar';
import { DaySummariesTable } from './components/DaySummariesTable';
import { DaySummariesCardList } from './components/DaySummariesCardList';
import { DaySummariesSkeleton } from './components/DaySummariesSkeleton';
import { DaySummariesEmptyState } from './components/DaySummariesEmptyState';

export function DaySummariesPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [date, setDate] = useState(todayInput());
  const [searchValue, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [rows, setRows] = useState<DayRowDto[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isToday = date === todayInput();
  const isFiltered =
    Boolean(searchValue.trim()) ||
    Boolean(filters.subOrgId) ||
    Boolean(filters.departmentId) ||
    Boolean(filters.roleId) ||
    Boolean(filters.siteId) ||
    Boolean(filters.policyId);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    getDays(date, filters, page, pageSize, controller.signal)
      .then((r) => {
        setRows(r.days);
        setTotal(r.total);
        setError(null);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(messageOf(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [date, filters, page, pageSize]);

  // Client-side quick filter for the search input
  const displayedRows = useMemo(() => {
    if (!searchValue.trim()) return rows;
    const q = searchValue.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.employee_code?.toLowerCase().includes(q)
    );
  }, [rows, searchValue]);

  const clearFilters = () => {
    setFilters({});
    setSearchValue('');
    setPage(1);
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Modern Toolbar matching Roles UI */}
      <DaySummariesToolbar
        total={total}
        date={date}
        onDateChange={handleDateChange}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        filters={filters}
        onFiltersChange={(f) => {
          setFilters(f);
          setPage(1);
        }}
      />

      {/* Main Content Card with Table & Pagination */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {error && (
          <div className="border-b border-line p-3">
            <Alert message={error} tone="error" />
          </div>
        )}

        {loading ? (
          <div className="flex-1 overflow-hidden">
            <DaySummariesSkeleton rows={Math.min(pageSize, 8)} />
          </div>
        ) : displayedRows.length === 0 ? (
          <div className="flex flex-1 flex-col">
            <DaySummariesEmptyState
              isFiltered={isFiltered}
              isToday={isToday}
              onClear={clearFilters}
              onToday={() => handleDateChange(todayInput())}
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= md) */}
            <div className={cx('hidden min-h-0 flex-1 overflow-hidden md:block')}>
              <DaySummariesTable rows={displayedRows} date={date} />
            </div>

            {/* Mobile Card List View (< md) */}
            <div className={cx('min-h-0 flex-1 overflow-y-auto tt-scrollbar md:hidden')}>
              <DaySummariesCardList rows={displayedRows} date={date} />
            </div>

            {/* Pagination Controls */}
            {total > 0 && (
              <div className="border-t border-line bg-surface px-4 py-2.5">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={total}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setPage(1);
                  }}
                  pageSizeOptions={[10, 25, 50, 100]}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
