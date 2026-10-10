'use client';

import React from 'react';
import { ListChecks, MapPinCheck, Plane } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { RequestDrawer } from '@/features/approvals/components/RequestDrawer';
import { DelegationPanel } from '@/features/approvals/components/DelegationPanel';
import { Skeleton } from '@/features/detailed-attendance/components/components/controls';
import { useFilterOptions } from '../hooks/useFilterOptions';
import { useRequestList } from '../hooks/useRequestList';
import { ApprovalsEmptyState } from './ApprovalsEmptyState';
import { RequestFilters } from './RequestFilters';
import { RequestTable } from './RequestTable';
import { ROW_STATUS } from '../constants/review.constants';
import type { RequestType, ReviewScope, RowStatus } from '../types/review.model';
import type { FilterOptionsDto } from '@/features/attendance-dashboard/types/dashboard.dto';

const SCOPES: ReadonlyArray<{ value: ReviewScope; label: string }> = [
  { value: 'assigned', label: 'Assigned to me' },
  { value: 'all', label: 'All requests' },
];
const COUNTED: RowStatus[] = ['pending', 'approved', 'rejected', 'cancelled'];

/** Request types this page covers, each its own tab. Leave and comp-off join here later. */
const TYPES: ReadonlyArray<{ value: RequestType; label: string; noun: string; icon: typeof ListChecks }> = [
  { value: 'regularize', label: 'Regularization', noun: 'Regularization requests', icon: ListChecks },
  { value: 'verification', label: 'Attendance review', noun: 'Attendance reviews', icon: MapPinCheck },
];

/**
 * Attendance approvals for a reviewer, one tab per request type: the requests assigned to them
 * (waiting, and the ones they decided), and, for org admins, HR mode and holders of that type's
 * permissions, every request in their reach to follow. The server decides who may follow what and who
 * may decide; the filters only narrow it. A row opens the request with its timeline. Used both as the
 * person's own Approvals page and under Attendance.
 */
export function AttendanceApprovalsPage() {
  const [type, setType] = React.useState<RequestType>('regularize');
  const [away, setAway] = React.useState(false);
  const options = useFilterOptions();

  const tabs = (
    <div role="tablist" aria-label="Request type" className="flex gap-1 overflow-x-auto border-b border-line tt-scroll-hidden">
      {TYPES.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={type === t.value} onClick={() => setType(t.value)}
          className={cx('-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold transition-colors', type === t.value ? 'border-[var(--tt-primary)] text-fg' : 'border-transparent text-fg-muted hover:text-fg')}>
          <t.icon className="h-4 w-4" /> {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* Each type keeps its own filters, scope and page; switching starts that list fresh. */}
      <RequestQueue key={type} type={type} noun={TYPES.find((t) => t.value === type)!.noun} options={options} tabs={tabs}
        headerAction={<Btn icon={<Plane className="h-4 w-4" />} onClick={() => setAway(true)}>Out of office</Btn>} />
      <DelegationPanel open={away} onClose={() => setAway(false)} />
    </>
  );
}

interface QueueProps {
  type: RequestType;
  noun: string;
  options: FilterOptionsDto | null;
  tabs: React.ReactNode;
  headerAction: React.ReactNode;
}

function RequestQueue({ type, noun, options, tabs, headerAction }: QueueProps) {
  const [openId, setOpenId] = React.useState<number | null>(null);
  const list = useRequestList(type);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Approvals</h1>
            <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg-muted">{list.total}</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {list.access.canTrack && (
              <div className="w-full sm:w-80"><SegmentedControl options={SCOPES} value={list.scope} onChange={list.setScope} /></div>
            )}
            {headerAction}
          </div>
        </div>

        {tabs}

        {/* Where the requests stand under the current filters; a click narrows to that status. */}
        <div className="flex flex-wrap gap-1.5">
          {COUNTED.map((s) => (
            <button key={s} type="button" onClick={() => list.update('status', s)}
              className={cx('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors', list.filters.status === s ? ROW_STATUS[s].className : 'border-line text-fg-muted hover:bg-bg-subtle')}>
              {ROW_STATUS[s].label}<span className="tabular-nums">{list.counts[s] ?? 0}</span>
            </button>
          ))}
        </div>

        <RequestFilters scope={list.scope} filters={list.filters} update={list.update} searchInput={list.searchInput} onSearch={list.setSearchInput}
          options={options} filtered={list.filtered} onClear={list.clear} />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.error && <div className="border-b border-line p-3"><Alert message={list.error} /></div>}
        {list.loading ? (
          <div className="space-y-2 p-4" aria-busy="true">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : list.rows.length === 0 ? (
          <ApprovalsEmptyState noun={noun} filtered={list.filtered} tracking={list.scope === 'all'} onClear={list.clear} />
        ) : (
          <>
            <div className={cx('flex min-h-0 flex-1 flex-col transition-opacity duration-200', list.fetching ? 'opacity-70' : 'opacity-100')}>
              <RequestTable type={type} rows={list.rows} onOpen={(r) => setOpenId(r.approvalId)} />
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
