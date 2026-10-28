'use client';

import { Check } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { formatDate } from '@/lib/datetime';
import type { ExitCase } from '../types/exits';

/** Where a case stands as a row of steps: derived from the case itself (the employee has no event log). */
export function ExitProgress({ c }: { c: ExitCase }) {
  const decided = !['submitted', 'retention'].includes(c.status);
  const closedOther = ['retained', 'rejected', 'withdrawn'].includes(c.status);
  const steps: { label: string; done: boolean; current: boolean; note?: string }[] = [
    { label: 'Submitted', done: true, current: false, note: formatDate(c.resigned_on || c.created_at.slice(0, 10)) },
    { label: c.status === 'retention' ? 'Counter-offer' : 'Decision', done: decided, current: c.status === 'submitted' || c.status === 'retention' },
  ];
  if (closedOther) {
    steps.push({ label: { retained: 'Retained', rejected: 'Not accepted', withdrawn: 'Withdrawn' }[c.status as 'retained'], done: true, current: false });
  } else {
    steps.push(
      { label: 'Serving notice', done: ['clearance', 'settlement', 'exited'].includes(c.status), current: c.status === 'accepted' || c.status === 'serving_notice' },
      { label: 'Last day', done: c.status === 'exited' || c.status === 'clearance' || c.status === 'settlement', current: false, note: formatDate(c.agreed_lwd) },
      { label: 'Exited', done: c.status === 'exited', current: c.status === 'clearance' || c.status === 'settlement' },
    );
  }
  return (
    <ol className="flex gap-1 overflow-x-auto tt-scroll-hidden sm:gap-2" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={i} className="flex min-w-[5.5rem] flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold',
              s.done ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : s.current ? 'border-[var(--tt-primary)] text-fg' : 'border-line text-fg-subtle')}>
              {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cx('h-px flex-1', s.done ? 'bg-[var(--tt-primary)]' : 'bg-line')} />
          </div>
          <p className={cx('text-xs font-semibold', s.done || s.current ? 'text-fg' : 'text-fg-muted')}>{s.label}</p>
          {s.note && s.note !== '—' && <p className="text-[11px] text-fg-muted">{s.note}</p>}
        </li>
      ))}
    </ol>
  );
}
