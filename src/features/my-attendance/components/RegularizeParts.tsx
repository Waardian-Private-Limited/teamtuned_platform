'use client';

import { Info } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { dateTimeText, longDayText } from '@/features/detailed-attendance/utils/format';
import { BLOCKED_TEXT, DAY_TYPE_TEXT, KIND_TEXT, STATUS_TEXT, STATUS_TONE } from '../constants/regularization.constants';
import type { RegularizationOptions, RegularizationRequest } from '../types/regularization.model';

const card = 'rounded-xl border border-line bg-bg-subtle/40 p-3.5';
const hhmm = (v: string | null) => v ?? 'Not recorded';

/** What was recorded for the day: its kind and the two punches. */
export function RecordedCard({ options }: { options: RegularizationOptions }) {
  const { day } = options;
  const kind = day.holiday ? `Holiday: ${day.holiday.name}` : DAY_TYPE_TEXT[day.dayType] ?? day.dayType;
  return (
    <div className={card}>
      <p className="text-xs text-fg-muted">{longDayText(options.date)} · {kind}</p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div><p className="text-xs text-fg-muted">Check-in</p><p className={cx('text-lg font-bold tabular-nums', !day.recordedIn && 'text-fg-muted')}>{hhmm(day.recordedIn)}</p></div>
        <div><p className="text-xs text-fg-muted">Check-out</p><p className={cx('text-lg font-bold tabular-nums', !day.recordedOut && 'text-fg-muted')}>{hhmm(day.recordedOut)}</p></div>
      </div>
    </div>
  );
}

/** The policy in one quiet line: until when, how many are left, and what happens after sending. */
export function PolicyLine({ options }: { options: RegularizationOptions }) {
  const p = options.policy;
  if (!p.allowed) return null;
  const parts = [
    options.deadlineAt ? `Raise by ${dateTimeText(options.deadlineAt, options.timezone)}` : null,
    `${p.remaining} of ${p.perMonth} left this month`,
    p.needsApproval ? 'Needs approval' : 'Applies instantly',
  ].filter(Boolean);
  return <p className="flex items-start gap-1.5 text-xs text-fg-muted"><Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{parts.join(' · ')}</span></p>;
}

/** One of several answers where exactly one is picked; picking the picked one clears it. */
export function ChoiceTile({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onClick}
      className={cx('flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors', selected ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 font-semibold text-fg' : 'border-line bg-surface text-fg hover:bg-bg-subtle')}>
      <span aria-hidden className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', selected ? 'border-[var(--tt-primary)]' : 'border-line-strong')}>
        {selected && <span className="h-2 w-2 rounded-full bg-[var(--tt-primary)]" />}
      </span>
      {label}
    </button>
  );
}

/** A request already made: where it stands, what was asked, and the reviewer's note. */
export function RequestCard({ request }: { request: RegularizationRequest }) {
  const asked = request.kinds.map((k) => KIND_TEXT[k]).join(', ');
  const times = request.inTime || request.outTime ? `${request.inTime ?? request.recordedInTime ?? '--:--'}  →  ${request.outTime ?? request.recordedOutTime ?? '--:--'}` : null;
  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-2">
        <p className={cx('text-sm font-bold', STATUS_TONE[request.status])}>{STATUS_TEXT[request.status]}</p>
        {request.submittedAt && <p className="text-xs text-fg-muted">Sent {dateTimeText(request.submittedAt)}</p>}
      </div>
      <p className="mt-1.5 text-sm text-fg">You asked for: {asked}</p>
      {times && <p className="mt-1 text-sm font-semibold tabular-nums text-fg">{times}</p>}
      {request.reason && <p className="mt-1 text-xs text-fg-muted">{request.reason}</p>}
      {request.reviewNote && <p className="mt-1 text-sm text-fg">Note from the reviewer: {request.reviewNote}</p>}
    </div>
  );
}

export function BlockedNote({ code }: { code: string | null }) {
  const text = (code && BLOCKED_TEXT[code]) || 'A request cannot be raised for this day.';
  return <p className="flex items-center gap-2 rounded-xl border border-line bg-bg-subtle/60 p-3.5 text-sm text-fg"><Info aria-hidden className="h-4 w-4 shrink-0 text-fg-muted" />{text}</p>;
}
