'use client';

import { AlertTriangle, CalendarDays, Coffee, Lock, Moon, PencilLine } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Alert';
import { COMP_OFF_REASON, COMP_OFF_STATE, FLAG_TEXT, SCHEDULE_TEXT } from '../../constants/detailed.constants';
import { useDay } from '../../hooks/useDay';
import type { DayDetail } from '../../types/detailed.model';
import { clockText, dateTimeText, daysText, longDayText, minutesText, punchTimeText, time24, timeText } from '../../utils/format';
import { Avatar, Skeleton } from './controls';
import { PunchCard } from './PunchCard';
import { StatusBadge } from './StatusBadge';

interface Props {
  employeeId: number | null;
  date: string | null;
  reloadKey: number;
  /** While the override form is open on top, Escape closes only that. */
  childOpen: boolean;
  onClose: () => void;
  onMonth?: (employeeId: number, month: string) => void;
  onOverride: (day: DayDetail) => void;
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-line p-3">
      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</p>
      <p className="mt-1 truncate text-lg font-extrabold leading-none tabular-nums text-fg">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-fg-muted">{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-muted">{title}</h3>
      {children}
    </section>
  );
}

const cutText = (p: string | null) => (p === 'full_day' ? 'a full day' : 'half a day');
const statusText = (s: string) => (s === 'Half-Day' ? 'Half day' : s);

/** What the employee's policy decided for the day, one plain line each, only the lines that apply. */
function policyLines(d: DayDetail): string[] {
  const day = d.day;
  if (!day) return [];
  const out: string[] = [];
  if (day.lateMark) {
    out.push(`Late by ${minutesText(day.lateMinutes)}${day.lateBeyondGraceMinutes ? ` (${minutesText(day.lateBeyondGraceMinutes)} past the grace time)` : ''}: late mark number ${day.lateMarkNumber}`);
    if (day.latePenalty) out.push(`Late-mark penalty: ${cutText(day.latePenalty)} is cut`);
  } else if (day.lateMinutes > 0) {
    out.push(`Arrived ${minutesText(day.lateMinutes)} after shift start${day.lateExcusedMinutes ? `, ${minutesText(day.lateExcusedMinutes)} excused` : ', within the allowed time'}`);
  }
  if (day.earlyMark) {
    out.push(`Left ${minutesText(day.earlyMinutes)} early: early-exit mark number ${day.earlyMarkNumber}`);
    if (day.earlyPenalty) out.push(`Early-exit penalty: ${cutText(day.earlyPenalty)} is cut`);
  }
  for (const f of day.flags) if (FLAG_TEXT[f]) out.push(FLAG_TEXT[f]);
  return out;
}

/** What the roster or policy expected of the day: the shift, a week off, a holiday, leave. */
function expectation(d: DayDetail): { value: string; hint?: string } {
  const sch = d.schedule;
  const day = d.day;
  const source = sch ? (sch.roster ? 'from the roster' : 'from the policy') : undefined;
  if (day && day.shiftStartAt && day.shiftEndAt) return { value: `${time24(day.shiftStartAt, d.timezone)} – ${time24(day.shiftEndAt, d.timezone)}`, hint: sch ? source : undefined };
  if (sch && sch.shift) return { value: `${sch.shift.start} – ${sch.shift.end}${sch.shift.endsNextDay ? ' (+1)' : ''}`, hint: source };
  if (sch && sch.flexible) return { value: 'Flexible', hint: 'no fixed shift' };
  if (sch && sch.kind !== 'working' && sch.kind !== 'absent') return { value: SCHEDULE_TEXT[sch.kind], hint: sch.roster ? 'from the roster' : undefined };
  return { value: '—' };
}

function OverrideNote({ d }: { d: DayDetail }) {
  const o = d.override;
  if (!o) return null;
  const hours = o.inTime && o.outTime ? `Hours set to ${clockText(o.inTime)} – ${clockText(o.outTime)}` : null;
  const forced = o.status ? `marked ${statusText(o.status)}` : null;
  return (
    <div className="rounded-xl border border-line bg-bg-subtle/60 p-3">
      <p className="flex items-center gap-2 text-sm font-bold text-fg"><PencilLine className="h-4 w-4 shrink-0 text-fg-muted" /> Changed by {o.by || 'HR'}{o.at ? <span className="font-medium text-fg-muted"> · {dateTimeText(o.at, d.timezone)}</span> : null}</p>
      {(hours || forced) && <p className="mt-1 text-sm text-fg">{[hours, forced].filter(Boolean).join(', ')}</p>}
      {o.reason && <p className="mt-0.5 text-sm text-fg-muted">Reason: {o.reason}</p>}
    </div>
  );
}

function Body({ d, onMonth, onOverride }: { d: DayDetail; onMonth: Props['onMonth']; onOverride: Props['onOverride'] }) {
  const day = d.day;
  const lines = policyLines(d);
  const tz = d.timezone;
  const exp = expectation(d);
  const noRecord = !d.punches.some((p) => !p.voided) && !(day && day.firstInAt);
  const work = d.punches.filter((p) => p.kind === 'work');
  const night = d.punches.filter((p) => p.kind === 'night_ot');
  const extras = day ? [
    day.breakMinutes ? `Break ${minutesText(day.breakMinutes)}` : null,
    day.lateMark ? `Late ${minutesText(day.lateMinutes)}` : null,
    day.earlyMark ? `Early exit ${minutesText(day.earlyMinutes)}` : null,
    day.overtimeMinutes ? `Overtime ${minutesText(day.overtimeMinutes)}` : null,
    day.nightOtMinutes ? `Night overtime ${minutesText(day.nightOtMinutes)}` : null,
  ].filter(Boolean) : [];
  const history = d.history.filter((h) => h.kind !== 'evaluate');

  return (
    <div className="space-y-5">
      {(d.holiday || d.leave || d.locked || d.nightOtYesterdayMinutes > 0) && (
        <ul className="space-y-1.5 text-sm">
          {d.holiday && <li className="flex items-center gap-2 text-fg"><CalendarDays className="h-4 w-4 shrink-0 text-fg-muted" /> {d.holiday.name}{d.holiday.half ? ' (half day)' : ''}</li>}
          {d.leave && <li className="flex items-center gap-2 text-fg"><CalendarDays className="h-4 w-4 shrink-0 text-fg-muted" /> {d.leave.name}{d.leave.units === 0.5 ? ' (half day)' : ''}, {d.leave.isPaid ? 'paid' : 'unpaid'}</li>}
          {d.nightOtYesterdayMinutes > 0 && <li className="flex items-center gap-2 text-fg"><Moon className="h-4 w-4 shrink-0 text-fg-muted" /> Worked night overtime last night, {minutesText(d.nightOtYesterdayMinutes)}</li>}
          {d.locked && <li className="flex items-center gap-2 text-fg"><Lock className="h-4 w-4 shrink-0 text-fg-muted" /> Locked for payroll, no changes</li>}
        </ul>
      )}

      <OverrideNote d={d} />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Figure label={d.schedule && d.schedule.roster ? 'Rostered shift' : 'Shift'} value={exp.value} hint={exp.hint} />
        <Figure label="Check-in" value={day && day.firstInAt ? timeText(day.firstInAt, tz) : '—'} />
        <Figure label="Check-out" value={day && day.lastOutAt ? punchTimeText(day.lastOutAt, d.date, tz) : day && day.openSession ? 'Still in' : '—'} />
        <Figure label="Worked" value={day ? minutesText(day.workedMinutes) : '—'} hint={day && day.expectedMinutes ? `of ${minutesText(day.expectedMinutes)}` : exp.value !== '—' && d.schedule && d.schedule.shift ? `of ${minutesText(d.schedule.shift.expectedMinutes)}` : undefined} />
      </div>
      {extras.length > 0 && <p className="-mt-2 text-sm text-fg-muted">{extras.join(' · ')}</p>}

      {noRecord && (
        <p className="rounded-xl border border-line bg-bg-subtle/50 p-3 text-sm text-fg-muted">
          {d.badge.key === 'not_joined' ? 'This was before the employee joined.' : d.badge.key === 'exited' ? 'This was after the employee left.' : d.badge.key === 'absent' ? 'No check-in was recorded on this day, so it counts as absent.' : d.badge.key === 'not_in' ? 'Not checked in yet.' : d.badge.key === 'upcoming' ? '' : 'No check-ins on this day.'}
        </p>
      )}

      {(lines.length > 0 || d.compOff.length > 0 || day?.reviewState === 'pending') && (
        <Section title="What the policy did">
          <ul className="space-y-1.5 text-sm text-fg">
            {day?.reviewState === 'pending' && <li className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tt-warning)]" /> A check-in or check-out is waiting for review</li>}
            {lines.map((l) => <li key={l} className="flex items-start gap-2"><span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-fg-subtle" />{l}</li>)}
            {d.compOff.map((g, i) => (
              <li key={i} className="flex items-start gap-2">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-fg-subtle" />
                <span>{COMP_OFF_REASON[g.reason] || g.reason}: {g.kind === 'paid' ? `paid${g.minutes ? ` ${minutesText(g.minutes)}` : ''}` : `${daysText(g.units)} day comp-off`}. {COMP_OFF_STATE[g.state] || g.state}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {work.length > 0 && (
        <Section title="Check-ins">
          <ol className="space-y-2.5">{work.map((p) => <PunchCard key={p.id} punch={p} workDate={d.date} tz={tz} />)}</ol>
        </Section>
      )}
      {night.length > 0 && (
        <Section title="Night overtime">
          <ol className="space-y-2.5">{night.map((p) => <PunchCard key={p.id} punch={p} workDate={d.date} tz={tz} />)}</ol>
        </Section>
      )}
      {d.breaks.length > 0 && (
        <Section title="Breaks">
          <ul className="divide-y divide-line rounded-xl border border-line">
            {d.breaks.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-3 py-2.5">
                <Coffee aria-hidden className="h-4 w-4 shrink-0 text-fg-muted" />
                <p className="flex-1 text-sm text-fg">Break</p>
                <span className="text-sm tabular-nums text-fg-muted">{timeText(b.startedAt, tz)} – {b.endedAt ? timeText(b.endedAt, tz) : 'ongoing'}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {history.length > 0 && (
        <Section title="History">
          <ol className="space-y-2.5 border-l border-line pl-4">
            {history.map((h) => (
              <li key={h.id} className="relative text-sm">
                <span aria-hidden className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full border border-line bg-surface" />
                <p className="text-fg">{h.summary || h.kind}{h.by ? <span className="text-fg-muted"> · {h.by}</span> : null}</p>
                {h.reason && <p className="text-xs text-fg-muted">{h.reason}</p>}
                <p className="text-[11px] text-fg-subtle">{dateTimeText(h.at, tz)}</p>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        {onMonth && <button type="button" onClick={() => onMonth(d.employee.id, d.date.slice(0, 7))} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-4 text-xs font-semibold text-fg hover:bg-bg-subtle sm:text-sm"><CalendarDays className="h-4 w-4" /> Monthly attendance</button>}
        {d.canOverride && (
          <button type="button" onClick={() => onOverride(d)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] sm:text-sm"><PencilLine className="h-4 w-4" /> Override attendance</button>
        )}
      </div>
    </div>
  );
}

function Skeletons() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      <Skeleton className="h-24 rounded-xl" /><Skeleton className="h-56 rounded-xl" />
    </div>
  );
}

/** One employee's day: the figures, what the policy decided, every check-in, who changed what. */
export function DayDialog({ employeeId, date, reloadKey, childOpen, onClose, onMonth, onOverride }: Props) {
  const { data, loading, error } = useDay(employeeId, date ? `${date}` : null, reloadKey);
  const open = employeeId !== null && !!date;
  if (!open) return null;
  return (
    <Dialog
      open
      onClose={childOpen ? () => undefined : onClose}
      maxWidthClassName="max-w-3xl"
      title={
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={data?.employee.name || ' '} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-fg">{data ? data.employee.name : 'Attendance'}</h2>
            <p className="truncate text-xs text-fg-muted">{data ? [data.employee.code, data.employee.department, data.employee.role].filter(Boolean).join(' · ') : ' '}</p>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-fg-muted">{date ? longDayText(date) : ''}{data && <StatusBadge badge={data.badge} />}</p>
          </div>
        </div>
      }
    >
      {error && <Alert message={error} />}
      {loading && !data ? <Skeletons /> : data ? <Body d={data} onMonth={onMonth} onOverride={onOverride} /> : null}
    </Dialog>
  );
}
