'use client';

import { cx } from '@/theme/tokens';
import { WEEKDAYS } from '../../../constants/roster.constants';
import type { ShiftInfo, Violation } from '../../../types/roster.types';
import { isWeekend } from '../../../utils/rosterBoard';
import { formatRange, weekdayIndex } from '../../../utils/rosterTime';
import { toneOf, TONE_CLASS } from '../../../utils/shiftTone';

interface Props {
  dates: string[];
  shifts: ShiftInfo[];
  counts: Map<string, number>;
  understaffed: Map<string, Violation>;
}

export function CoverageView({ dates, shifts, counts, understaffed }: Props) {
  if (!shifts.length) return <p className="px-4 py-10 text-center text-sm text-fg-muted">No shifts to show coverage for.</p>;
  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-line bg-surface">
      <table className="border-separate border-spacing-0 text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-30 border-b border-r border-line bg-surface px-3 py-2 text-left font-semibold text-fg-muted" style={{ minWidth: 180 }}>Shift</th>
            {dates.map((d) => (
              <th key={d} className={cx('sticky top-0 z-20 min-w-11 border-b border-line px-1 py-1.5 text-center font-medium', isWeekend(d) ? 'bg-bg-subtle' : 'bg-surface')}>
                <span className="block text-[10px] text-fg-muted">{WEEKDAYS[weekdayIndex(d)]}</span>
                <span className="block font-bold text-fg">{Number(d.slice(8))}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shifts.map((s) => (
            <tr key={s.id}>
              <th className="sticky left-0 z-10 border-b border-r border-line bg-surface px-3 py-2 text-left font-normal">
                <span className="flex items-center gap-2">
                  <span className={cx('inline-flex h-6 min-w-8 items-center justify-center rounded-md px-1 text-[11px] font-bold', TONE_CLASS[toneOf(s)])}>{s.code}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-fg">{s.name}</span>
                    <span className="block text-[10px] text-fg-muted">{formatRange(s.start_min, s.duration_min)}</span>
                  </span>
                </span>
              </th>
              {dates.map((d) => {
                const n = counts.get(`${s.id}:${d}`) ?? 0;
                const v = understaffed.get(`${s.id}:${d}`);
                return (
                  <td key={d} className={cx('border-b border-line p-0.5 text-center', isWeekend(d) && 'bg-bg-subtle')} title={v ? `${v.slots ?? 1} more needed` : undefined}>
                    <div
                      className={cx('flex h-8 flex-col items-center justify-center rounded-md text-xs font-bold', v ? 'text-[var(--tt-danger)]' : n ? 'text-fg' : 'text-fg-subtle')}
                      style={v ? { outline: '2px solid var(--tt-danger)', outlineOffset: '-1px' } : undefined}
                    >
                      {n}
                      {v?.slots ? <span className="text-[8px] font-semibold leading-none">-{v.slots}</span> : null}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
