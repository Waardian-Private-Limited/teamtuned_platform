'use client';

import { Paperclip } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { dateTimeText, dayText } from '@/features/detailed-attendance/utils/format';
import { since } from '../utils/since';
import { KIND_TEXT } from '@/features/my-attendance/constants/regularization.constants';
import { PUNCH_ISSUE_TEXT, ROW_STATUS } from '../constants/review.constants';
import type { Place, RequestRow, RequestType } from '../types/review.model';

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

/** Which step a waiting request is at, who holds it, and for how long: what HR chases. */
function WaitingOn({ row }: { row: RequestRow }) {
  const w = row.waitingOn;
  if (!w) return <span className="text-fg-subtle">—</span>;
  const who = w.approvers.length ? w.approvers.join(', ') : 'Any approver';
  return (
    <span className="flex flex-col gap-0.5 text-xs">
      <span className="font-semibold text-fg">{who}{w.approvers.length && w.openToRole ? ' or an approver' : ''}</span>
      {w.step && <span className="text-fg-muted">{w.step}</span>}
      {w.since && <span className="text-fg-subtle">{since(w.since)}</span>}
    </span>
  );
}

function PlaceTag({ place }: { place: Place | null }) {
  if (!place || (!place.name && !place.outside)) return null;
  const text = place.outside ? `${place.name ?? 'Unknown place'} · outside${place.distanceM !== null ? `, ${place.distanceM} m` : ''}` : place.name;
  return <span className={cx('block text-[11px]', place.outside ? 'font-semibold text-amber-700 dark:text-amber-400' : 'text-fg-muted')}>{text}</span>;
}

/** Each fixed time: what was recorded (and where), struck through, then what is asked for. */
function Times({ row }: { row: RequestRow }) {
  if (!row.inTime && !row.outTime) return <span className="text-fg-subtle">—</span>;
  const was = (v: string | null) => <span className="text-fg-subtle line-through">{v ?? '--:--'}</span>;
  return (
    <span className="flex flex-col gap-1 text-xs tabular-nums">
      {row.inTime && <span>In {was(row.recordedInTime)} <span className="font-semibold text-fg">{row.inTime}</span><PlaceTag place={row.recordedInPlace} /></span>}
      {row.outTime && <span>Out {was(row.recordedOutTime)} <span className="font-semibold text-fg">{row.outTime}</span><PlaceTag place={row.recordedOutPlace} /></span>}
    </span>
  );
}

/** Each punch sent for review: when, where, what needed a look and how it was settled. */
function Punches({ row }: { row: RequestRow }) {
  if (!row.punches.length) return <span className="text-fg-subtle">—</span>;
  return (
    <span className="flex flex-col gap-1.5 text-xs">
      {row.punches.map((p, i) => (
        <span key={`${p.direction}-${p.time}-${i}`} className="flex flex-col gap-0.5">
          <span className="tabular-nums">
            {p.direction === 'in' ? 'In' : 'Out'} <span className="font-semibold text-fg">{p.time}</span>
            {p.reviewState === 'rejected' && <span className="ml-1.5 text-[11px] font-semibold text-[var(--tt-danger)]">not accepted</span>}
          </span>
          <PlaceTag place={{ name: p.place, outside: p.outside, distanceM: p.distanceM }} />
          {p.issues.filter((k) => k !== 'location').map((k) => <span key={k} className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">{PUNCH_ISSUE_TEXT[k] ?? k}</span>)}
        </span>
      ))}
    </span>
  );
}

/** The reasons the employee gave: the request's, or each reviewed punch's. */
const reasonOf = (row: RequestRow) => row.reason || [...new Set(row.punches.map((p) => p.reason).filter(Boolean))].join(' · ') || null;

function Kinds({ row }: { row: RequestRow }) {
  return (
    <span className="flex flex-wrap gap-1">
      {row.kinds.map((k) => <span key={k} className="rounded-md border border-line bg-bg-subtle px-1.5 py-0.5 text-[11px] font-medium text-fg">{KIND_TEXT[k]}</span>)}
      {row.hasAttachment && <Paperclip aria-label="Proof attached" className="h-3.5 w-3.5 self-center text-fg-muted" />}
    </span>
  );
}

/**
 * A table from tablet up and cards on a phone; a row opens its approval, when it went to one. A
 * regularization shows what is asked for and the times; an attendance review shows its punches.
 */
export function RequestTable({ type, rows, onOpen }: { type: RequestType; rows: RequestRow[]; onOpen: (row: RequestRow) => void }) {
  const regularize = type === 'regularize';
  return (
    <>
      <div className="hidden h-full overflow-auto tt-scroll-hidden md:block">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={head}>Employee</th>
              <th className={head}>Attendance date</th>
              {regularize ? <><th className={head}>Asking for</th><th className={head}>Times</th></> : <th className={head}>Punches</th>}
              <th className={head}>Reason</th>
              <th className={head}>Sent</th>
              <th className={head}>Status</th>
              <th className={head}>Waiting on</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} onClick={r.approvalId ? () => onOpen(r) : undefined} className={cx('transition-colors', !!r.approvalId && 'cursor-pointer hover:bg-bg-subtle/60', r.waitingForMe && 'bg-[var(--tt-primary)]/[0.03]')}>
                <td className={cell}>
                  <p className="font-semibold text-fg">{r.employee.name}</p>
                  <p className="text-xs text-fg-muted">{[r.employee.code, r.employee.department, r.employee.role].filter(Boolean).join(' · ')}</p>
                </td>
                <td className={cx(cell, 'whitespace-nowrap font-medium text-fg')}>{dayText(r.date)}</td>
                {regularize ? <><td className={cell}><Kinds row={r} /></td><td className={cell}><Times row={r} /></td></> : <td className={cell}><Punches row={r} /></td>}
                <td className={cx(cell, 'max-w-[16rem]')}>
                  <p className="line-clamp-2 text-xs text-fg-muted">{reasonOf(r) || '—'}</p>
                </td>
                <td className={cx(cell, 'whitespace-nowrap text-xs text-fg-muted')}>{r.submittedAt ? dateTimeText(r.submittedAt) : '—'}</td>
                <td className={cell}><Status row={r} /></td>
                <td className={cell}><WaitingOn row={r} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto tt-scroll-hidden md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <button type="button" disabled={!r.approvalId} onClick={() => onOpen(r)} className="flex w-full flex-col gap-2 p-3.5 text-left hover:bg-bg-subtle/60 disabled:hover:bg-transparent">
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-fg">{r.employee.name}</span>
                  <span className="block text-sm text-fg">{dayText(r.date)}</span>
                </span>
                <Status row={r} />
              </span>
              {regularize ? <><Kinds row={r} /><Times row={r} /></> : <Punches row={r} />}
              {r.waitingOn && <WaitingOn row={r} />}
              {reasonOf(r) && <span className="line-clamp-2 text-xs text-fg-muted">{reasonOf(r)}</span>}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
