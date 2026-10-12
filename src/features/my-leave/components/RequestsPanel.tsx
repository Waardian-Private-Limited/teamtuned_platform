'use client';

import { Paperclip, RotateCcw } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { controlClass } from '@/features/detailed-attendance/components/components/controls';
import { STATUS, STATUS_ORDER } from '../constants/leave.constants';
import type { LeaveRequest, LeaveStatus, LeaveType } from '../types/leave.model';
import type { useLeaveRequests } from '../hooks/useLeaveRequests';
import { dateTimeText } from '../utils/format';
import { datesText, daysLine, RowsSkeleton, SectionCard, StatusBadge, TypeDot } from './LeaveParts';

type List = ReturnType<typeof useLeaveRequests>;

const head = 'px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted border-b border-line bg-bg-subtle';
const cell = 'border-b border-line/60 px-4 py-3 align-top';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</span>
      {children}
    </label>
  );
}

function Empty({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/vectors/leaves.svg" alt="" className="mb-4 h-auto w-32 select-none object-contain sm:w-40" />
      <h3 className="text-sm font-bold text-fg sm:text-base">{filtered ? 'Nothing matches these filters' : 'No leave requests yet'}</h3>
      <p className="mt-1 max-w-sm text-xs text-fg-muted sm:text-sm">{filtered ? 'Try another status, leave type or dates.' : 'Your requests and where they stand show up here.'}</p>
      {filtered && (
        <button type="button" onClick={onClear} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3.5 text-sm font-semibold text-fg hover:bg-bg-subtle">
          <RotateCcw className="h-4 w-4" /> Clear filters
        </button>
      )}
    </div>
  );
}

/** The employee's own requests: status counts, filters, a table from tablet up and cards on a phone. */
export function RequestsPanel({ list, types, onOpen }: { list: List; types: LeaveType[]; onOpen: (r: LeaveRequest) => void }) {
  const { filters, update, data } = list;
  const total = Object.values(data?.counts ?? {}).reduce((s, n) => s + (n ?? 0), 0);
  return (
    <SectionCard title="My requests">
      <div className="space-y-3 border-b border-line p-4">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => update('status', null)}
            className={cx('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold', filters.status === null ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/10 text-fg' : 'border-line text-fg-muted hover:bg-bg-subtle')}>
            All<span className="tabular-nums">{total}</span>
          </button>
          {STATUS_ORDER.filter((s) => s !== 'expired' || data?.counts.expired).map((s: LeaveStatus) => (
            <button key={s} type="button" onClick={() => update('status', s)}
              className={cx('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold', filters.status === s ? STATUS[s].className : 'border-line text-fg-muted hover:bg-bg-subtle')}>
              {STATUS[s].label}<span className="tabular-nums">{data?.counts[s] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:flex lg:flex-wrap lg:items-end">
          <Field label="Leave type">
            <select className={`${controlClass} lg:w-48`} value={filters.typeId ?? ''} onChange={(e) => update('typeId', e.target.value ? Number(e.target.value) : null)}>
              <option value="">All types</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={`${controlClass} lg:w-40`} value={filters.status ?? ''} onChange={(e) => update('status', (e.target.value || null) as LeaveStatus | null)}>
              <option value="">All statuses</option>
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
            </select>
          </Field>
          <Field label="From">
            <input type="date" className={`${controlClass} lg:w-40`} value={filters.from} max={filters.to || undefined} onChange={(e) => update('from', e.target.value)} />
          </Field>
          <Field label="To">
            <input type="date" className={`${controlClass} lg:w-40`} value={filters.to} min={filters.from || undefined} onChange={(e) => update('to', e.target.value)} />
          </Field>
          {list.filtered && (
            <button type="button" onClick={list.clear} className="col-span-2 inline-flex h-9 items-center justify-center gap-1.5 self-end rounded-lg border border-line px-3 text-xs font-semibold text-fg-muted hover:bg-bg-subtle hover:text-fg sm:col-span-1">
              <RotateCcw className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {list.error && <div className="border-b border-line p-3"><Alert message={list.error} /></div>}
      {list.loading ? <RowsSkeleton /> : !data || data.rows.length === 0 ? <Empty filtered={list.filtered} onClear={list.clear} /> : (
        <div className={cx('transition-opacity duration-200', list.fetching ? 'opacity-70' : 'opacity-100')}>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr><th className={head}>Leave</th><th className={head}>Dates</th><th className={head}>Days</th><th className={head}>Reason</th><th className={head}>Applied</th><th className={head}>Status</th></tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id} onClick={() => onOpen(r)} className="cursor-pointer transition-colors hover:bg-bg-subtle/60">
                    <td className={cell}><span className="flex items-center gap-2 font-semibold text-fg"><TypeDot color={r.type.color} />{r.type.name}</span></td>
                    <td className={cx(cell, 'whitespace-nowrap text-fg')}>{datesText(r)}</td>
                    <td className={cx(cell, 'whitespace-nowrap tabular-nums text-fg')}>{daysLine(r)}</td>
                    <td className={cx(cell, 'max-w-[18rem]')}>
                      <span className="flex items-center gap-1.5 text-xs text-fg-muted">{r.attachmentUrl && <Paperclip aria-label="Document attached" className="h-3.5 w-3.5 shrink-0" />}<span className="line-clamp-2">{r.reason || '—'}</span></span>
                    </td>
                    <td className={cx(cell, 'whitespace-nowrap text-xs text-fg-muted')}>{dateTimeText(r.createdAt)}</td>
                    <td className={cell}><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-line md:hidden">
            {data.rows.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => onOpen(r)} className="flex w-full flex-col gap-1.5 p-4 text-left hover:bg-bg-subtle/60">
                  <span className="flex items-start justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-fg"><TypeDot color={r.type.color} /><span className="truncate">{r.type.name}</span></span>
                    <StatusBadge status={r.status} />
                  </span>
                  <span className="text-sm text-fg">{datesText(r)}</span>
                  <span className="text-xs tabular-nums text-fg-muted">{daysLine(r)} · applied {dateTimeText(r.createdAt)}</span>
                  {r.reason && <span className="line-clamp-2 text-xs text-fg-muted">{r.reason}</span>}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-4 py-2.5">
            <Pagination currentPage={list.page} totalPages={data.pages} totalItems={data.total} pageSize={list.pageSize} onPageChange={list.setPage} onPageSizeChange={list.setPageSize} />
          </div>
        </div>
      )}
    </SectionCard>
  );
}
