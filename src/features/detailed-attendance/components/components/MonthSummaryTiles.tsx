import { cx } from '@/theme/tokens';
import type { Month } from '../../types/detailed.model';
import { daysText, hoursText, minutesText } from '../../utils/format';

function Tile({ label, value, sub, tone, wide }: { label: string; value: string; sub?: string; tone?: 'bad' | 'good'; wide?: boolean }) {
  return (
    <div className={cx('min-w-0 rounded-xl border border-line p-3.5', wide && 'col-span-2')}>
      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</p>
      <p className={cx('mt-1.5 truncate text-2xl font-extrabold leading-none tabular-nums', tone === 'bad' ? 'text-[var(--tt-danger)]' : 'text-fg')}>{value}</p>
      {sub && <p className="mt-1.5 line-clamp-2 text-xs text-fg-muted">{sub}</p>}
    </div>
  );
}

const nonZero = (parts: Array<[number, string]>) => parts.filter(([n]) => n > 0).map(([n, t]) => `${daysText(n)} ${t}`);

/** The month's totals. Only what costs or earns something gets a note; nothing says "0". */
export function MonthSummaryTiles({ month }: { month: Month }) {
  const s = month.summary;
  const lop = nonZero([[s.lop.absent, 'absent'], [s.lop.halfDay, 'half-day cut'], [s.lop.other, 'short'], [s.lop.unpaidLeave, 'unpaid leave'], [s.lop.sandwich, 'sandwich'], [s.lop.lateDeduction, 'late deduction']]);
  const leave = nonZero([[s.paidLeaveDays, 'paid'], [s.unpaidLeaveDays, 'unpaid']]);
  const comp = month.compOff;
  const compSub = [comp.earnedUnits > 0 ? `earned ${daysText(comp.earnedUnits)} this month` : null, comp.pendingUnits > 0 ? `${daysText(comp.pendingUnits)} waiting for approval` : null].filter(Boolean).join(' · ');

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      <Tile label="Payable days" value={daysText(s.payableDays)} sub={s.lateDeduction.enabled && s.lateDeduction.days > 0 ? `${daysText(s.payableDaysBeforeLateDeduction)} before late deduction` : `of ${s.calendarDays} days`} />
      <Tile label="Loss of pay" value={daysText(s.lopDays)} tone={s.lopDays > 0 ? 'bad' : undefined} sub={lop.length ? lop.join(' · ') : 'None'} />
      <Tile label="Present" value={daysText(s.present)} sub={s.halfDays ? `and ${s.halfDays} half day${s.halfDays === 1 ? '' : 's'}` : undefined} />
      <Tile label="Absent" value={daysText(s.absent)} tone={s.absent > 0 ? 'bad' : undefined} />
      <Tile label="Leave" value={daysText(s.leaveDays)} sub={leave.length ? leave.join(' · ') : undefined} />
      <Tile label={comp.period === 'monthly' ? 'Comp-off this month' : 'Comp-off balance'} value={comp.available === null ? '—' : daysText(comp.available)} sub={compSub || (comp.available === null ? 'Not part of the policy' : undefined)} />
      <Tile label="Late" value={s.late.minutes ? minutesText(s.late.minutes) : '—'} sub={s.late.marks ? `${s.late.marks} late mark${s.late.marks === 1 ? '' : 's'}` : undefined} />
      {month.policy.lateDeduction ? (
        <>
          <Tile label="Late hours" value={s.late.minutes ? hoursText(s.late.hours) : '—'} sub={s.lateDeduction.days > 0 ? `deducts ${daysText(s.lateDeduction.days)} day${s.lateDeduction.days === 1 ? '' : 's'} (${minutesText(s.lateDeduction.freeMinutes)} free)` : `${minutesText(s.lateDeduction.freeMinutes)} free each period`} />
          <Tile label="Overtime hours" value={s.overtime.minutes + s.nightOt.minutes ? hoursText(Math.round(((s.overtime.minutes + s.nightOt.minutes) / 60) * 10) / 10) : '—'} sub={s.nightOt.minutes ? `incl. night ${hoursText(s.nightOt.hours)}` : undefined} />
        </>
      ) : (
        <Tile label="Overtime" value={s.overtime.minutes + s.nightOt.minutes ? hoursText(Math.round(((s.overtime.minutes + s.nightOt.minutes) / 60) * 10) / 10) : '—'} sub={s.nightOt.minutes ? `incl. night ${hoursText(s.nightOt.hours)}` : undefined} />
      )}
    </div>
  );
}
