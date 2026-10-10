'use client';

import { Paperclip } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { dateTimeText, dayText } from '@/features/detailed-attendance/utils/format';
import { KIND_TEXT } from '@/features/my-attendance/constants/regularization.constants';
import { ROW_STATUS } from '../constants/review.constants';
import type { RequestRow } from '../types/review.model';

const head = 'px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted border-b border-line bg-bg-subtle select-none';
const cell = 'border-b border-line/60 px-4 py-3 align-top';

function Status({ row }: { row: RequestRow }) {
  const s = ROW_STATUS[row.status];
  return (
    <span className="flex flex-col items-start gap-1">
      <span className={cx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', s.className)}>{s.label}</span>
      {row.waitingForMe && <span className="text-[11px] font-semibold text-[var(--tt-primary)]">Waiting for you</span>}
    </span>
  );
}

function Times({ row }: { row: RequestRow }) {
  if (!row.inTime && !row.outTime) return <span className="text-fg-subtle">—</span>;
  const was = (v: string | null) => <span className="text-fg-subtle line-through">{v ?? '--:--'}</span>;
  return (
    <span className="flex flex-col gap-0.5 text-xs tabular-nums">
      {row.inTime && <span>In {was(row.recordedInTime)} <span className="font-semibold text-fg">{row.inTime}</span></span>}
      {row.outTime && <span>Out {was(row.recordedOutTime)} <span className="font-semibold text-fg">{row.outTime}</span></span>}
    </span>
  );
}

function Kinds({ row }: { row: RequestRow }) {
  return (
    <span className="flex flex-wrap gap-1">
      {row.kinds.map((k) => <span key={k} className="rounded-md border border-line bg-bg-subtle px-1.5 py-0.5 text-[11px] font-medium text-fg">{KIND_TEXT[k]}</span>)}
      {row.hasAttachment && <Paperclip aria-label="Proof attached" className="h-3.5 w-3.5 self-center text-fg-muted" />}
    </span>
  );
}

/** A table from tablet up and cards on a phone; a row opens its approval. */
export function RequestTable({ rows, onOpen }: { rows: RequestRow[]; onOpen: (row: RequestRow) => void }) {
    return (
    <>
      <div className="hidden h-full overflow-auto tt-scroll-hidden md:block">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={head}>Employee</th>
              <th className={head}>Attendance date</th>
              <th className={head}>Asking for</th>
              <th className={head}>Times</th>
              <th className={head}>Reason</th>
              <th className={head}>Sent</th>
              <th className={head}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} onClick={() => onOpen(r)} className={cx('cursor-pointer transition-colors hover:bg-bg-subtle/60', r.waitingForMe && 'bg-[var(--tt-primary)]/[0.03]')}>
                <td className={cell}>
                  <p className="font-semibold text-fg">{r.employee.name}</p>
                  <p className="text-xs text-fg-muted">{[r.employee.code, r.employee.department, r.employee.role].filter(Boolean).join(' · ')}</p>
                </td>
                <td className={cx(cell, 'whitespace-nowrap font-medium text-fg')}>{dayText(r.date)}</td>
                <td className={cell}><Kinds row={r} /></td>
                <td className={cell}><Times row={r} /></td>
                <td className={cx(cell, 'max-w-[16rem]')}>
                  <p className="line-clamp-2 text-xs text-fg-muted">{r.reason || '—'}</p>
                </td>
                <td className={cx(cell, 'whitespace-nowrap text-xs text-fg-muted')}>{r.submittedAt ? dateTimeText(r.submittedAt) : '—'}</td>
                <td className={cell}><Status row={r} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto tt-scroll-hidden md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => onOpen(r)} className="flex w-full flex-col gap-2 p-3.5 text-left hover:bg-bg-subtle/60">
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-fg">{r.employee.name}</span>
                  <span className="block text-sm text-fg">{dayText(r.date)}</span>
                </span>
                <Status row={r} />
              </span>
              <Kinds row={r} />
              <Times row={r} />
              {r.reason && <span className="line-clamp-2 text-xs text-fg-muted">{r.reason}</span>}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
