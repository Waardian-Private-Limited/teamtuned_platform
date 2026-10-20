'use client';

import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { formatTime } from '@/lib/datetime';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import * as api from '../api/selfDashboard.api';
import type { UpcomingDayDto } from '../types/selfDashboard.dto';
import { DashCard } from './DashCard';

type Kind = 'work' | 'off' | 'holiday' | 'leave' | 'none';

const HALF = (h: string | null) => (h === 'first' ? 'first half' : 'second half');

/** One line per day: what it is, and the times when it is a working day. */
function describe(d: UpcomingDayDto, tz: string): { kind: Kind; title: string; detail: string | null } {
  const times = d.shift ? `${formatTime(d.shift.start, tz)} – ${formatTime(d.shift.end, tz)}` : d.flexible_hours ? `${d.flexible_hours}h flexible` : null;
  if (d.leave && d.leave.units >= 1) return { kind: 'leave', title: 'On leave', detail: 'Approved' };
  switch (d.type) {
    case 'holiday': return { kind: 'holiday', title: d.holiday?.name || 'Holiday', detail: 'Holiday' };
    case 'half_holiday': return { kind: 'holiday', title: d.holiday?.name || 'Half holiday', detail: [`Off ${HALF(d.off_half)}`, times].filter(Boolean).join(' · ') };
    case 'week_off': return { kind: 'off', title: 'Week off', detail: null };
    case 'half_week_off': return { kind: 'off', title: 'Half day off', detail: [`Off ${HALF(d.off_half)}`, times].filter(Boolean).join(' · ') };
    case 'roster_leave': return { kind: 'leave', title: 'Leave (roster)', detail: null };
    case 'unscheduled': return { kind: 'none', title: 'Not scheduled', detail: 'Roster not published yet' };
    case 'no_policy': return { kind: 'none', title: 'No policy', detail: null };
  }
  const extra = [
    d.leave ? 'Half-day leave' : null,
    d.holiday?.optional ? `Optional holiday: ${d.holiday.name}` : null,
  ].filter(Boolean).join(' · ');
  return { kind: 'work', title: times || 'Working day', detail: extra || null };
}

const DATE_CHIP: Record<Kind, string> = {
  work: 'border-line bg-bg text-fg',
  off: 'border-line bg-bg-subtle text-fg-muted',
  holiday: 'border-[var(--tt-success)]/25 bg-[var(--tt-success-soft)] text-[var(--tt-success)]',
  leave: 'border-line bg-bg-subtle text-fg',
  none: 'border-dashed border-line-strong bg-bg text-fg-muted',
};

const weekday = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' });

export function WeekCard() {
  const q = useAsync(() => api.getUpcoming(), []);
  const data = q.data;

  return (
    <DashCard title="Next 7 days" subtitle="Shifts, offs, holidays and leave" icon={CalendarDays} href="/employee/holidays" hrefLabel="Holidays" loading={q.loading && !data} error={!data ? q.error : ''} onRetry={() => void q.refetch()}>
      {data && (
        <ul className="divide-y divide-line">
          {data.days.map((d) => {
            const today = d.date === data.today;
            const v = describe(d, data.timezone);
            return (
              <li key={d.date}>
                <Link href={`/employee/my-attendance?date=${d.date}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-bg-subtle">
                  <span className={cx('flex w-11 shrink-0 flex-col items-center rounded-xl border py-1', today ? 'border-fg bg-fg text-fg-inverted' : DATE_CHIP[v.kind])}>
                    <span className="text-[10px] font-bold uppercase">{today ? 'Today' : weekday(d.date)}</span>
                    <span className="text-base font-extrabold leading-tight tabular-nums">{Number(d.date.slice(8))}</span>
                  </span>
                  <span className="min-w-0">
                    <span className={cx('block truncate text-sm font-bold', v.kind === 'off' || v.kind === 'none' ? 'text-fg-muted' : 'text-fg', v.kind === 'work' && 'tabular-nums')}>{v.title}</span>
                    {v.detail && <span className="block truncate text-xs text-fg-muted">{v.detail}</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashCard>
  );
}
