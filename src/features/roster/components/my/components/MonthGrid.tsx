'use client';

import { cx } from '@/theme/tokens';
import { WEEKDAYS } from '../../../constants/roster.constants';
import type { ScheduleDay } from '../../../types/roster.types';
import { eachDay, weekdayIndex } from '../../../utils/rosterTime';
import { DayEntries } from './DayEntries';

interface Props {
  from: string;
  to: string;
  monthFrom: string;
  monthTo: string;
  today: string;
  byDate: Map<string, ScheduleDay[]>;
  holidays: Map<string, string>;
  onSelect: (row: ScheduleDay) => void;
}

export function MonthGrid({ from, to, monthFrom, monthTo, today, byDate, holidays, onSelect }: Props) {
  const days = eachDay(from, to);
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface md:block">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-7 border-b border-line bg-bg-subtle">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((date) => {
            const inMonth = date >= monthFrom && date <= monthTo;
            const weekend = weekdayIndex(date) >= 5;
            const isToday = date === today;
            return (
              <div
                key={date}
                className={cx(
                  'min-h-[96px] border-b border-r border-line p-1.5',
                  weekend && 'bg-bg-subtle/60',
                  !inMonth && 'opacity-40'
                )}
              >
                <div className="mb-1 flex justify-end">
                  <span
                    className={cx(
                      'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold',
                      isToday ? 'bg-fg text-fg-inverted' : 'text-fg-muted'
                    )}
                  >
                    {Number(date.slice(8))}
                  </span>
                </div>
                <DayEntries rows={byDate.get(date) || []} holiday={holidays.get(date)} onSelect={onSelect} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
