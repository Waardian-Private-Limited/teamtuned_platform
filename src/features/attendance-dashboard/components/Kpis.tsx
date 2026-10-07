'use client';

import { AlarmClock, CalendarOff, Clock4, Hourglass, UserCheck, UserX } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { minutesText, pctText } from '../constants/dashboard.constants';
import type { EmployeeView, SummaryDto } from '../types/dashboard.dto';
import { Skeleton } from './Card';

function Tile({ icon: Icon, label, value, note, tone, onClick, active }: { icon: LucideIcon; label: string; value: string | number; note?: string; tone?: string; onClick?: () => void; active?: boolean }) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle" style={tone ? { color: tone } : undefined}><Icon className="h-4 w-4" /></span>
        <span className="truncate text-xs font-semibold text-fg-muted">{label}</span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-2xl font-extrabold leading-none text-fg">{value}</div>
        {note && <div className="mt-1.5 truncate text-xs text-fg-muted">{note}</div>}
      </div>
    </>
  );
  const base = cx('flex min-w-0 flex-col gap-3 rounded-xl border bg-surface p-4 text-left shadow-[var(--tt-shadow-sm)] transition-colors', active ? 'border-[var(--tt-primary)]' : 'border-line');
  if (!onClick) return <div className={base}>{body}</div>;
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cx(base, 'hover:border-line-strong focus-visible:outline-2 focus-visible:outline-[var(--tt-primary)]')}>
      {body}
    </button>
  );
}

/**
 * The headline: attendance rate as the one big figure, then the counts a manager acts on.
 * Every count opens the matching list below.
 */
export function Kpis({ summary, isToday, view, onView, loading }: { summary: SummaryDto | null; isToday: boolean; view: EmployeeView; onView: (v: EmployeeView) => void; loading: boolean }) {
  if (loading || !summary) {
    return (
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,3fr)]">
        <Skeleton className="h-[164px] rounded-xl" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[100px] rounded-xl" />)}</div>
      </div>
    );
  }
  const s = summary;
  const waiting = isToday ? s.counts.not_checked_in : 0;
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,3fr)]">
      <div className="flex flex-col justify-between rounded-xl border border-line bg-surface p-5 shadow-[var(--tt-shadow-sm)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Attendance rate</p>
          <p className="mt-2 text-5xl font-extrabold leading-none text-fg">{pctText(s.rates.attendance)}</p>
          <p className="mt-2 text-sm text-fg-muted"><strong className="font-bold text-fg">{s.present}</strong> of {s.expected} expected at work</p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-bg-subtle" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.rates.attendance ?? 0} aria-label="Attendance rate">
          <div className="h-full rounded-full bg-[var(--tt-primary)] transition-[width] duration-500" style={{ width: `${Math.min(100, s.rates.attendance ?? 0)}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Tile icon={UserCheck} label="Present" value={s.present} note={`${s.counts.working} working now`} tone="var(--tt-success)" onClick={() => onView('present')} active={view === 'present'} />
        <Tile icon={AlarmClock} label="Late" value={s.late} note={`Punctuality ${pctText(s.rates.punctuality)}`} tone="var(--tt-warning)" onClick={() => onView('late')} active={view === 'late'} />
        {isToday
          ? <Tile icon={Hourglass} label="Not checked in" value={waiting} note="Expected, no punch yet" tone="var(--tt-warning)" onClick={() => onView('not_checked_in')} active={view === 'not_checked_in'} />
          : <Tile icon={UserX} label="Absent" value={s.counts.absent} note={`Absence ${pctText(s.rates.absence)}`} tone="var(--tt-danger)" onClick={() => onView('absent')} active={view === 'absent'} />}
        <Tile icon={CalendarOff} label="On leave" value={s.counts.on_leave} note={`${s.counts.holiday + s.counts.week_off} off (holiday or week off)`} onClick={() => onView('on_leave')} active={view === 'on_leave'} />
        <Tile icon={Clock4} label="Average hours" value={minutesText(s.minutes.average_worked)} note="Per person present" />
        <Tile icon={Hourglass} label="Overtime" value={minutesText(s.minutes.overtime)} note={s.minutes.night_ot ? `${minutesText(s.minutes.night_ot)} night OT` : 'No night OT'} />
      </div>
    </div>
  );
}
