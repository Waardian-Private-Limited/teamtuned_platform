'use client';

import Link from 'next/link';
import { CalendarRange } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { daysBetween, formatDate, formatMonth } from '@/lib/datetime';
import { TONE } from '@/features/detailed-attendance/constants/detailed.constants';
import { daysText, hoursText } from '@/features/detailed-attendance/utils/format';
import type { BadgeTone, Month } from '@/features/detailed-attendance/types/detailed.model';
import type { CycleResponseDto } from '../types/selfDashboard.dto';
import { DashCard, Stat } from './DashCard';

// Monochrome theme: an "info" day (no blue) reads as plain foreground.
const dotOf = (tone: BadgeTone) => (tone === 'info' ? 'bg-fg' : TONE[tone].dot);

function periodTitle(period: CycleResponseDto['period']) {
  if (period.kind === 'month') return formatMonth(period.from.slice(0, 7));
  return `${formatDate(period.from, 'medium')} – ${formatDate(period.to, 'medium')}`;
}

function DayStrip({ month }: { month: Month }) {
  return (
    <Link href="/employee/my-attendance" className="block rounded-xl border border-line p-3 transition-colors hover:border-line-strong" aria-label="Open my attendance calendar">
      <div className="flex flex-wrap gap-1">
        {month.cells.map((c) => {
          const future = c.date > month.today;
          return (
            <span
              key={c.date}
              title={`${formatDate(c.date, 'medium')} · ${future ? 'Upcoming' : c.badge.label}`}
              className={cx(
                'h-5 w-5 rounded-md sm:h-6 sm:w-6',
                future ? 'border border-dashed border-line-strong' : dotOf(c.badge.tone),
                c.date === month.today && 'ring-2 ring-fg ring-offset-2 ring-offset-[var(--tt-surface)]'
              )}
            />
          );
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-fg-muted">
        {([['good', 'Present'], ['warn', 'Half day / late'], ['bad', 'Absent'], ['info', 'Leave'], ['muted', 'Off']] as Array<[BadgeTone, string]>).map(([tone, label]) => (
          <span key={tone} className="inline-flex items-center gap-1.5"><span className={cx('h-2 w-2 rounded-full', dotOf(tone))} />{label}</span>
        ))}
      </div>
    </Link>
  );
}

export function CycleCard({ month, period, loading, error, onRetry }: { month: Month | null; period: CycleResponseDto['period'] | null; loading: boolean; error: string; onRetry: () => void }) {
  const s = month?.summary;
  const elapsed = month && period ? Math.min(daysBetween(period.from, month.today) + 1, s?.calendarDays || 0) : 0;
  const leaves = (month?.balances || []).filter((b) => b.available > 0 || b.pending > 0);

  return (
    <DashCard
      title={period?.kind === 'cycle' ? 'Current pay cycle' : 'This month'}
      subtitle={period ? `${periodTitle(period)} · day ${elapsed} of ${s?.calendarDays ?? '—'}` : null}
      icon={CalendarRange}
      href="/employee/my-attendance"
      hrefLabel="Calendar"
      loading={loading && !month}
      error={!month ? error : ''}
      onRetry={onRetry}
    >
      {month && s && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
            <Stat label="Payable days" value={s.notJoined ? '—' : daysText(s.payableDays)} sub={`of ${s.calendarDays} days`} />
            <Stat label="Present" value={daysText(s.present)} sub={s.halfDays ? `+ ${s.halfDays} half days` : null} />
            <Stat label="Absent" value={daysText(s.absent)} tone={s.absent > 0 ? 'bad' : undefined} sub={s.lopDays > 0 ? `${daysText(s.lopDays)} days loss of pay` : null} />
            <Stat label="Leave" value={daysText(s.leaveDays)} sub={s.unpaidLeaveDays ? `${daysText(s.unpaidLeaveDays)} unpaid` : null} href="/employee/leave" />
            <Stat label="Late" value={s.late.marks} sub={s.late.minutes ? `${hoursText(s.late.hours)} in total` : 'On time'} tone={s.late.marks > 0 ? 'bad' : undefined} />
            <Stat label="Worked" value={hoursText(s.worked.hours)} sub={s.overtime.minutes ? `${hoursText(s.overtime.hours)} overtime` : null} />
          </div>
          <DayStrip month={month} />
          {leaves.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Balances</span>
              {leaves.map((b) => (
                <Link key={b.code} href="/employee/leave" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-subtle px-2.5 py-1 text-xs font-semibold text-fg transition-colors hover:border-line-strong">
                  {b.name}
                  <span className="tabular-nums text-fg-muted">{daysText(b.available)}{b.pending > 0 ? ` (${daysText(b.pending)} pending)` : ''}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </DashCard>
  );
}
