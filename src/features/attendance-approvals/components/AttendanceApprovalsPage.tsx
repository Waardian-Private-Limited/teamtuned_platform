'use client';

import React from 'react';
import { ListChecks } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { RequestDrawer } from '@/features/approvals/components/RequestDrawer';
import { Skeleton } from '@/features/detailed-attendance/components/components/controls';
import { useFilterOptions } from '../hooks/useFilterOptions';
import { useRequestList } from '../hooks/useRequestList';
import { ApprovalsEmptyState } from './ApprovalsEmptyState';
import { RequestFilters } from './RequestFilters';
import { RequestTable } from './RequestTable';

/** Request types this page covers. Leave and comp-off join here as their own tabs later. */
const TYPES = [{ value: 'regularize', label: 'Regularization', icon: ListChecks }] as const;
type TypeKey = (typeof TYPES)[number]['value'];

/**
 * Attendance approvals for a reviewer: the requests waiting for them and the ones they decided. Who
 * sees which requests is the approval flows' call on the server; the filters only narrow it. A row
 * opens the request with its timeline and decision. Employees follow their own requests from My Attendance.
 */
export function AttendanceApprovalsPage() {
  const [type, setType] = React.useState<TypeKey>('regularize');
  const [openId, setOpenId] = React.useState<number | null>(null);
  const list = useRequestList();
  const options = useFilterOptions(list.filters.departmentId);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Approvals</h1>
          <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg-muted">{list.total}</span>
        </div>

        <div role="tablist" aria-label="Request type" className="flex gap-1 border-b border-line">
          {TYPES.map((t) => (
            <button key={t.value} type="button" role="tab" aria-selected={type === t.value} onClick={() => setType(t.value)}
              className={cx('-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold transition-colors', type === t.value ? 'border-[var(--tt-primary)] text-fg' : 'border-transparent text-fg-muted hover:text-fg')}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        <RequestFilters filters={list.filters} update={list.update} searchInput={list.searchInput} onSearch={list.setSearchInput}
          options={options} filtered={list.filtered} onClear={list.clear} />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.error && <div className="border-b border-line p-3"><Alert message={list.error} /></div>}
        {list.loading ? (
          <div className="space-y-2 p-4" aria-busy="true">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : list.rows.length === 0 ? (
          <ApprovalsEmptyState filtered={list.filtered} onClear={list.clear} />
        ) : (
          <>
            <div className={cx('flex min-h-0 flex-1 flex-col transition-opacity duration-200', list.fetching ? 'opacity-70' : 'opacity-100')}>
              <RequestTable rows={list.rows} onOpen={(r) => setOpenId(r.approvalId)} />
            </div>
            <div className="border-t border-line bg-surface px-4 py-2.5">
              <Pagination currentPage={list.page} totalPages={list.totalPages} totalItems={list.total} pageSize={list.pageSize} onPageChange={list.setPage} onPageSizeChange={list.setPageSize} />
            </div>
          </>
        )}
      </div>

      <RequestDrawer id={openId} onClose={() => setOpenId(null)} onChanged={list.reload} />
    </div>
  );
}
