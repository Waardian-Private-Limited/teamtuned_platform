'use client';

import { PencilLine } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { TONE, WEEKDAYS } from '../../constants/detailed.constants';
import type { MonthCell } from '../../types/detailed.model';
import { dayText, timeText } from '../../utils/format';

const OPENABLE = new Set(['upcoming']);

function times(c: MonthCell) {
  if (!c.inAt) return null;
  return `${timeText(c.inAt)}${c.outAt ? ` – ${timeText(c.outAt)}` : ''}`;
}

function Cell({ c, today, onOpen }: { c: MonthCell; today: string; onOpen: (date: string) => void }) {
  const tone = TONE[c.badge.tone];
  const disabled = OPENABLE.has(c.badge.key);
  const t = times(c);
  const shown = c.badge.key !== 'upcoming';
  return (
    <button type="button" disabled={disabled} onClick={() => onOpen(c.date)} aria-label={`${dayText(c.date)}: ${c.badge.label}${c.badge.note ? `, ${c.badge.note}` : ''}`}
      className={cx('group relative flex h-full min-h-[92px] min-w-0 flex-col items-stretch overflow-hidden rounded-lg border bg-surface p-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[var(--tt-primary)]',
        c.date === today ? 'border-[var(--tt-primary)]' : 'border-line', disabled ? 'cursor-default opacity-50' : 'hover:bg-bg-subtle')}>
      {shown && <span aria-hidden className={cx('absolute inset-y-0 left-0 w-1', tone.bar)} />}
      <span className="flex items-center justify-between pl-1">
        <span className={cx('text-sm font-bold tabular-nums', c.date === today ? 'text-fg' : 'text-fg-muted')}>{c.day}</span>
        {c.badge.overridden && <span title="Set by HR" className="inline-flex"><PencilLine aria-hidden className="h-3 w-3 text-fg-muted" /></span>}
      </span>
      {shown && (
        <span className="mt-1 flex min-w-0 flex-1 flex-col gap-0.5 pl-1">
          <span className={cx('truncate text-xs font-bold', tone.text)}>{c.badge.label}</span>
          {t && <span className="truncate text-[11px] tabular-nums text-fg-muted">{t}</span>}
          {c.badge.note && <span className="truncate text-[11px] text-fg-muted">{c.badge.note}</span>}
        </span>
      )}
    </button>
  );
}

/** A grid from tablet up, a plain list of days on a phone: either way, one tap opens the day. */
export function MonthCalendar({ cells, today, onOpen }: { cells: MonthCell[]; today: string; onOpen: (date: string) => void }) {
  const lead = cells.length ? (cells[0].weekday + 6) % 7 : 0;
  return (
    <>
      <div className="hidden sm:block">
        <div className="mb-1.5 grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((w) => <p key={w} className="text-center text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{w}</p>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: lead }).map((_, i) => <div key={`pad${i}`} aria-hidden />)}
          {cells.map((c) => <Cell key={c.date} c={c} today={today} onOpen={onOpen} />)}
        </div>
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line sm:hidden">
        {cells.filter((c) => c.badge.key !== 'upcoming').map((c) => {
          const tone = TONE[c.badge.tone];
          return (
            <li key={c.date}>
              <button type="button" onClick={() => onOpen(c.date)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-bg-subtle">
                <span aria-hidden className={cx('h-8 w-1 shrink-0 rounded-full', tone.bar)} />
                <span className="w-14 shrink-0 text-sm font-bold text-fg">{dayText(c.date)}</span>
                <span className="min-w-0 flex-1">
                  <span className={cx('flex items-center gap-1 text-sm font-bold', tone.text)}>{c.badge.label}{c.badge.overridden && <PencilLine aria-label="Set by HR" className="h-3 w-3" />}</span>
                  {(times(c) || c.badge.note) && <span className="block truncate text-xs text-fg-muted">{[times(c), c.badge.note].filter(Boolean).join(' · ')}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
