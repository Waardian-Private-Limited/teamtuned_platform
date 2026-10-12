'use client';

import { Paperclip } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { dateTimeText, dayText } from '@/features/detailed-attendance/utils/format';
import { since } from '../utils/since';
import { EARNED_REASON } from '@/features/my-leave/constants/leave.constants';
import { daysText, minutesText } from '@/features/my-leave/utils/format';
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

const HALF: Record<string, string> = { first_half: '1st half', second_half: '2nd half' };

/** The leave asked for, with its type's colour. */
function LeaveKind({ row }: { row: RequestRow }) {
  const l = row.leave;
  if (!l) return <span className="text-fg-subtle">—</span>;
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-fg">
      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: l.type.color || 'var(--tt-primary)' }} />
      {l.type.name}
      {row.hasAttachment && <Paperclip aria-label="Document attached" className="h-3.5 w-3.5 text-fg-muted" />}
    </span>
  );
}

/** The days a leave covers, with half days and hours. */
function LeaveDates({ row }: { row: RequestRow }) {
  const l = row.leave;
  if (!l) return <>{dayText(row.date)}</>;
  if (l.unit === 'hour') return <>{dayText(row.date)} · {l.hours ?? 0}h</>;
  const one = row.date === l.endDate;
  const first = HALF[l.startSession];
  const last = HALF[l.endSession];
  return (
    <span className="flex flex-col">
      <span>{dayText(row.date)}{one ? '' : ` – ${dayText(l.endDate)}`}</span>
      {(first || (!one && last)) && <span className="text-[11px] font-normal text-fg-muted">{one ? first : [first && `starts ${first}`, last && `ends ${last}`].filter(Boolean).join(' · ')}</span>}
    </span>
  );
}

function LeaveDays({ row }: { row: RequestRow }) {
  const l = row.leave;
  if (!l) return <span className="text-fg-subtle">—</span>;
  return (
    <span className="flex flex-col text-xs tabular-nums">
      <span className="font-semibold text-fg">{l.unit === 'hour' ? `${l.hours ?? 0}h` : `${l.days} ${l.days === 1 ? 'day' : 'days'}`}</span>
      {l.lopDays > 0 && <span className="font-semibold text-[var(--tt-danger)]">{l.lopDays} unpaid</span>}
    </span>
  );
}

/** What the extra work was, and whether it earns comp-off leave or pay. */
function CompOffKind({ row }: { row: RequestRow }) {
  const c = row.compoff;
  if (!c) return <span className="text-fg-subtle">—</span>;
  return (
    <span className="flex flex-col text-xs">
      <span className="font-semibold text-fg">{EARNED_REASON[c.reason] ?? 'Extra work'}</span>
      <span className="text-fg-muted">{c.kind === 'paid' ? 'Paid in salary' : 'Comp-off leave'}</span>
    </span>
  );
}

/** What it earns: days of comp-off, or the paid time. */
function CompOffAmount({ row }: { row: RequestRow }) {
  const c = row.compoff;
  if (!c) return <span className="text-fg-subtle">—</span>;
  const amount = c.kind === 'paid' && c.minutes ? minutesText(c.minutes) : c.units ? daysText(c.units) : c.minutes ? minutesText(c.minutes) : '–';
  return (
    <span className="flex flex-col text-xs tabular-nums">
      <span className="font-semibold text-fg">{amount}</span>
      {c.kind === 'comp_off' && c.expiresOn && <span className="text-fg-muted">expires {dayText(c.expiresOn)}</span>}
    </span>
  );
}

/** The balance an absence is paid from, with its colour. */
function CoverFrom({ row }: { row: RequestRow }) {
  const c = row.absenceCover;
  if (!c) return <span className="text-fg-subtle">—</span>;
  return (
    <span className="flex flex-col text-xs">
      <span className="flex items-center gap-1.5 font-semibold text-fg">
        <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.type.color || 'var(--tt-primary)' }} />
        {c.type.name}
      </span>
      <span className="text-fg-muted">{c.isPenalty ? 'Late / early-exit penalty' : 'Otherwise unpaid'}</span>
    </span>
  );
}

function CoverDays({ row }: { row: RequestRow }) {
  const c = row.absenceCover;
  return <span className="text-xs font-semibold tabular-nums text-fg">{c ? daysText(c.days) : '—'}</span>;
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
 * regularization shows what is asked for and the times; an attendance review shows its punches; a
 * leave shows its type, dates and days; comp-off shows the extra work and what it earns.
 */
export function RequestTable({ type, rows, onOpen }: { type: RequestType; rows: RequestRow[]; onOpen: (row: RequestRow) => void }) {
  const regularize = type === 'regularize';
  const leave = type === 'leave';
  const compoff = type === 'compoff';
  const cover = type === 'absence_cover';
  const columns = regularize ? ['Asking for', 'Times'] : leave ? ['Leave', 'Days'] : compoff ? ['Extra work', 'Earns'] : cover ? ['Covered from', 'Days'] : ['Punches'];
  const cells = (r: RequestRow) => (regularize
    ? [<Kinds key="k" row={r} />, <Times key="t" row={r} />]
    : leave ? [<LeaveKind key="k" row={r} />, <LeaveDays key="d" row={r} />]
      : compoff ? [<CompOffKind key="k" row={r} />, <CompOffAmount key="a" row={r} />]
        : cover ? [<CoverFrom key="k" row={r} />, <CoverDays key="d" row={r} />]
          : [<Punches key="p" row={r} />]);
  return (
    <>
      <div className="hidden h-full overflow-auto tt-scroll-hidden md:block">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={head}>Employee</th>
              <th className={head}>{leave ? 'Dates' : compoff ? 'Worked on' : cover ? 'Absent on' : 'Attendance date'}</th>
              {columns.map((c) => <th key={c} className={head}>{c}</th>)}
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
                <td className={cx(cell, 'whitespace-nowrap font-medium text-fg')}><LeaveDates row={r} /></td>
                {cells(r).map((c, i) => <td key={i} className={cell}>{c}</td>)}
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
                  <span className="block text-sm text-fg"><LeaveDates row={r} /></span>
                </span>
                <Status row={r} />
              </span>
              {cells(r)}
              {r.waitingOn && <WaitingOn row={r} />}
              {reasonOf(r) && <span className="line-clamp-2 text-xs text-fg-muted">{reasonOf(r)}</span>}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
