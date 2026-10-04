'use client';

import { cx } from '@/theme/tokens';
import type { ScheduleDay } from '../../../types/roster.types';
import { eachDay, formatDay, weekdayIndex } from '../../../utils/rosterTime';
import { DayEntries } from './DayEntries';

interface Props {
  monthFrom: string;
  monthTo: string;
  today: string;
  byDate: Map<string, ScheduleDay[]>;
  holidays: Map<string, string>;
  onSelect: (row: ScheduleDay) => void;
}

export function AgendaList({ monthFrom, monthTo, today, byDate, holidays, onSelect }: Props) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface md:hidden">
      {eachDay(monthFrom, monthTo).map((date) => {
        const rows = byDate.get(date) || [];
        const holiday = holidays.get(date);
        const empty = rows.length === 0 && !holiday;
        return (
          <li key={date} className={cx('flex gap-3 px-3 py-2.5', weekdayIndex(date) >= 5 && 'bg-bg-subtle/60')}>
            <div className="w-12 shrink-0 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">{formatDay(date, { weekday: 'short' })}</div>
              <div
                className={cx(
                  'mx-auto mt-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm font-bold',
                  date === today ? 'bg-fg text-fg-inverted' : 'text-fg'
                )}
              >
                {Number(date.slice(8))}
              </div>
            </div>
            <div className="min-w-0 flex-1 self-center">
              {empty ? <span className="text-xs text-fg-subtle">Nothing planned</span> : <DayEntries rows={rows} holiday={holiday} onSelect={onSelect} compact />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
