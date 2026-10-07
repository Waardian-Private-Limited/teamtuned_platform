'use client';

import { CalendarDays, ClipboardList, Moon } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { daysText, minutesText, timeText } from '../../utils/format';
import type { AttendanceRow } from '../../types/detailed.model';
import { Avatar, IconButton, Skeleton } from './controls';
import { StatusBadge } from './StatusBadge';

interface RowProps {
  rows: AttendanceRow[];
  onDay: (row: AttendanceRow) => void;
  onMonth: (row: AttendanceRow) => void;
  busy: boolean;
}

const subline = (r: AttendanceRow) => [r.code, r.department, r.role].filter(Boolean).join(' · ');

/** Where and when they checked in, or what is notable about the day: one line. */
function whenAndWhere(r: AttendanceRow) {
  const hasIn = !!r.inAt;
  const times = hasIn ? `${timeText(r.inAt)}${r.outAt ? ` – ${timeText(r.outAt)}` : ''}` : '';
  return { times, site: r.site };
}

function StatusCell({ row }: { row: AttendanceRow }) {
  const { times, site } = whenAndWhere(row);
  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <StatusBadge badge={row.badge} />
      {(times || site) && (
        <p className="max-w-full truncate text-xs text-fg-muted tabular-nums">
          {times}{times && site ? ' · ' : ''}
          {site && <span className={cx(row.offSite && 'font-semibold text-[var(--tt-warning)]')}>{site}{row.offSite ? ' (outside)' : ''}</span>}
        </p>
      )}
      {row.badge.note && <p className="max-w-full truncate text-xs font-medium text-fg">{row.badge.note}</p>}
      {row.nightOtYesterdayMinutes > 0 && (
        <p className="inline-flex max-w-full items-center gap-1 truncate text-xs text-fg-muted">
          <Moon aria-hidden className="h-3 w-3 shrink-0" /> Night OT last night, {minutesText(row.nightOtYesterdayMinutes)}
        </p>
      )}
    </div>
  );
}

/** The month so far in one figure and one line: payable days, then only the things that cost something. */
function MonthCell({ row }: { row: AttendanceRow }) {
  const parts = [
    row.month.absent ? `${row.month.absent} absent` : null,
    row.month.leaveDays ? `${row.month.leaveDays} leave` : null,
    row.month.lateMarks ? `${row.month.lateMarks} late` : null,
  ].filter(Boolean);
  return (
    <div className="min-w-0">
      <p className="text-sm font-bold tabular-nums text-fg">{daysText(row.month.payableDays)} <span className="text-xs font-medium text-fg-muted">payable days</span></p>
      <p className="truncate text-xs text-fg-muted">{parts.length ? parts.join(' · ') : 'No absences'}</p>
    </div>
  );
}

function Actions({ row, onDay, onMonth }: { row: AttendanceRow; onDay: (r: AttendanceRow) => void; onMonth: (r: AttendanceRow) => void }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <IconButton label="Attendance for this day" onClick={() => onDay(row)}><ClipboardList className="h-4 w-4" /></IconButton>
      <IconButton label="Monthly attendance" onClick={() => onMonth(row)}><CalendarDays className="h-4 w-4" /></IconButton>
    </div>
  );
}

export function EmployeeTable({ rows, onDay, onMonth, busy }: RowProps) {
  const head = 'px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted';
  return (
    <div className={cx('hidden overflow-x-auto md:block transition-opacity', busy && 'opacity-60')}>
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-line bg-bg-subtle/60">
            <th className={head}>Employee</th><th className={head}>Day</th><th className={head}>This month</th><th className={cx(head, 'text-right')}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.employeeId} className="align-top transition-colors hover:bg-bg-subtle/50">
              <td className="px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={r.name} />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-fg">{r.name}</p>
                    <p className="truncate text-xs text-fg-muted">{subline(r) || '—'}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3"><StatusCell row={r} /></td>
              <td className="px-4 py-3"><MonthCell row={r} /></td>
              <td className="px-4 py-3"><Actions row={r} onDay={onDay} onMonth={onMonth} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmployeeCards({ rows, onDay, onMonth, busy }: RowProps) {
  return (
    <ul className={cx('space-y-2.5 p-3 md:hidden transition-opacity', busy && 'opacity-60')}>
      {rows.map((r) => (
        <li key={r.employeeId} className="rounded-xl border border-line bg-surface p-3.5">
          <div className="flex items-start gap-3">
            <Avatar name={r.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-fg">{r.name}</p>
              <p className="truncate text-xs text-fg-muted">{subline(r) || '—'}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
            <StatusCell row={r} />
            <MonthCell row={r} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onDay(r)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line text-xs font-bold text-fg hover:bg-bg-subtle"><ClipboardList className="h-4 w-4" /> This day</button>
            <button type="button" onClick={() => onMonth(r)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line text-xs font-bold text-fg hover:bg-bg-subtle"><CalendarDays className="h-4 w-4" /> This month</button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading employees">
      <div className="hidden divide-y divide-line md:block">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[2fr_2fr_1.4fr_auto] items-center gap-4 px-4 py-3.5">
            <div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><div className="space-y-1.5"><Skeleton className="h-3.5 w-36" /><Skeleton className="h-3 w-48" /></div></div>
            <div className="space-y-1.5"><Skeleton className="h-5 w-20" /><Skeleton className="h-3 w-40" /></div>
            <div className="space-y-1.5"><Skeleton className="h-3.5 w-24" /><Skeleton className="h-3 w-28" /></div>
            <div className="flex gap-1.5"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div>
          </div>
        ))}
      </div>
      <div className="space-y-2.5 p-3 md:hidden">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}</div>
    </div>
  );
}
