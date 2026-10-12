'use client';

import { cx } from '@/theme/tokens';
import { TIMELINE_TEXT } from '../constants/leave.constants';
import type { Timeline } from '../types/leave.model';
import { dateTimeText } from '../utils/format';

const DOT: Record<string, string> = {
  approved: 'bg-[var(--tt-success)]', rejected: 'bg-[var(--tt-danger)]', withdrawn: 'bg-fg-subtle', sent_back: 'bg-amber-500',
};

/** Each thing that happened to the request, then, while it waits, who it waits on. */
export function LeaveTimeline({ timeline }: { timeline: Timeline }) {
  return (
    <ol className="relative space-y-4 border-l border-line pl-5">
      {timeline.entries.map((e, i) => (
        <li key={`${e.kind}-${e.at}-${i}`} className="relative">
          <span aria-hidden className={cx('absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-surface', DOT[e.kind] ?? 'bg-[var(--tt-primary)]')} />
          <p className="text-sm font-semibold text-fg">{TIMELINE_TEXT[e.kind] ?? e.kind}{e.actor ? <span className="font-normal text-fg-muted"> by {e.actor}</span> : null}</p>
          <p className="text-xs text-fg-muted">{dateTimeText(e.at)}{e.step ? ` · ${e.step}` : ''}</p>
          {e.note && <p className="mt-1 rounded-md bg-bg-subtle px-2.5 py-1.5 text-xs text-fg">{e.note}</p>}
        </li>
      ))}
      {timeline.waiting && (
        <li className="relative">
          <span aria-hidden className="absolute -left-[25px] top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500 ring-4 ring-surface" />
          <p className="text-sm font-semibold text-fg">Waiting{timeline.waiting.step ? ` at ${timeline.waiting.step}` : ''}</p>
          <p className="text-xs text-fg-muted">
            {timeline.waiting.approvers.length ? timeline.waiting.approvers.join(', ') : 'Any approver'}
            {timeline.waiting.approvers.length && timeline.waiting.openToRole ? ' or an approver' : ''}
            {timeline.waiting.since ? ` · since ${dateTimeText(timeline.waiting.since)}` : ''}
          </p>
        </li>
      )}
    </ol>
  );
}
