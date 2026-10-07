'use client';

import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, CalendarDays, Coffee, Lock, Moon, PencilLine } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Alert';
import { cx } from '@/theme/tokens';
import { COMP_OFF_REASON, COMP_OFF_STATE, FACE_TEXT, FLAG_TEXT, LOCATION_TEXT, SOURCE_TEXT } from '../../constants/detailed.constants';
import { useDay } from '../../hooks/useDay';
import type { DayDetail } from '../../types/detailed.model';
import { dateTimeText, daysText, longDayText, minutesText, timeText, unitsText } from '../../utils/format';
import { Avatar, Skeleton } from './controls';
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
    <div className="rounded-xl border border-line p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</p>
      <p className="mt-1 text-lg font-extrabold leading-none tabular-nums text-fg">{value}</p>
      {hint && <p className="mt-1 text-xs text-fg-muted">{hint}</p>}
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

const punchLabel = (kind: 'work' | 'night_ot', direction: 'in' | 'out') => (kind === 'night_ot' ? (direction === 'in' ? 'Night OT start' : 'Night OT end') : direction === 'in' ? 'Check-in' : 'Check-out');

const cutText = (p: string | null) => (p === 'full_day' ? 'a full day' : 'half a day');

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

function Body({ d, onMonth, onOverride }: { d: DayDetail; onMonth: Props['onMonth']; onOverride: Props['onOverride'] }) {
  const day = d.day;
  const lines = policyLines(d);
  const extras = day ? [
    day.overtimeMinutes ? `Overtime ${minutesText(day.overtimeMinutes)}` : null,
    day.nightOtMinutes ? `Night overtime ${minutesText(day.nightOtMinutes)}` : null,
    day.breakMinutes ? `Break ${minutesText(day.breakMinutes)}` : null,
  ].filter(Boolean) : [];

  return (
    <div className="space-y-5">
      {(d.holiday || d.leave || d.locked || d.nightOtYesterdayMinutes > 0 || d.override) && (
        <ul className="space-y-1.5 text-sm">
          {d.holiday && <li className="flex items-center gap-2 text-fg"><CalendarDays className="h-4 w-4 shrink-0 text-fg-muted" /> {d.holiday.name}{d.holiday.half ? ' (half day)' : ''}</li>}
          {d.leave && <li className="flex items-center gap-2 text-fg"><CalendarDays className="h-4 w-4 shrink-0 text-fg-muted" /> {d.leave.name}{d.leave.units === 0.5 ? ' (half day)' : ''}, {d.leave.isPaid ? 'paid' : 'unpaid'}</li>}
          {d.nightOtYesterdayMinutes > 0 && <li className="flex items-center gap-2 text-fg"><Moon className="h-4 w-4 shrink-0 text-fg-muted" /> Worked night overtime last night, {minutesText(d.nightOtYesterdayMinutes)}</li>}
          {d.override && <li className="flex items-start gap-2 text-fg"><PencilLine className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" /> <span>Set to <strong>{d.override.status === 'Half-Day' ? 'Half day' : d.override.status}</strong> by {d.override.by || 'HR'}{d.override.reason ? `: ${d.override.reason}` : ''}</span></li>}
          {d.locked && <li className="flex items-center gap-2 text-fg"><Lock className="h-4 w-4 shrink-0 text-fg-muted" /> Locked for payroll, no changes</li>}
        </ul>
      )}

      {day && (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <Figure label="Check-in" value={day.firstInAt ? timeText(day.firstInAt) : '—'} />
          <Figure label="Check-out" value={day.lastOutAt ? timeText(day.lastOutAt) : day.openSession ? 'Still in' : '—'} />
          <Figure label="Worked" value={minutesText(day.workedMinutes)} hint={day.expectedMinutes ? `of ${minutesText(day.expectedMinutes)}` : undefined} />
          <Figure label="Payable" value={unitsText(day.payableUnits)} hint={day.payableUnits > 0 && day.payableUnits !== 1 ? `${daysText(day.payableUnits)} day` : undefined} />
        </div>
      )}
      {extras.length > 0 && <p className="-mt-2 text-sm text-fg-muted">{extras.join(' · ')}</p>}

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

      <Section title="Check-ins">
        {d.punches.length === 0 ? <p className="text-sm text-fg-muted">No check-ins on this day.</p> : (
          <ol className="divide-y divide-line rounded-xl border border-line">
            {d.punches.map((p) => {
              const Icon = p.direction === 'in' ? ArrowDownToLine : ArrowUpFromLine;
              const where = [p.place, LOCATION_TEXT[p.location], FACE_TEXT[p.face], SOURCE_TEXT[p.source]].filter(Boolean).join(' · ');
              return (
                <li key={p.id} className={cx('flex items-start gap-3 px-3 py-2.5', p.voided && 'opacity-50')}>
                  <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
                  <div className="min-w-0 flex-1">
                    <p className={cx('text-sm font-bold text-fg', p.voided && 'line-through')}>{punchLabel(p.kind, p.direction)}</p>
                    {where && <p className="truncate text-xs text-fg-muted">{where}</p>}
                    {p.voided && <p className="text-xs text-fg-muted">Removed{p.voidReason ? `: ${p.voidReason}` : ''}</p>}
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-fg">{timeText(p.at)}</span>
                </li>
              );
            })}
            {d.breaks.map((b) => (
              <li key={`b${b.id}`} className="flex items-center gap-3 px-3 py-2.5">
                <Coffee aria-hidden className="h-4 w-4 shrink-0 text-fg-muted" />
                <p className="flex-1 text-sm text-fg">Break</p>
                <span className="text-sm tabular-nums text-fg-muted">{timeText(b.startedAt)} – {b.endedAt ? timeText(b.endedAt) : 'ongoing'}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {d.history.length > 0 && (
        <Section title="History">
          <ol className="space-y-2.5 border-l border-line pl-4">
            {d.history.map((h) => (
              <li key={h.id} className="relative text-sm">
                <span aria-hidden className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full border border-line bg-surface" />
                <p className="text-fg">{h.summary || h.kind}{h.by ? <span className="text-fg-muted"> · {h.by}</span> : null}</p>
                {h.reason && <p className="text-xs text-fg-muted">{h.reason}</p>}
                <p className="text-[11px] text-fg-subtle">{dateTimeText(h.at)}</p>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        {onMonth && <button type="button" onClick={() => onMonth(d.employee.id, d.date.slice(0, 7))} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-4 text-xs font-semibold text-fg hover:bg-bg-subtle sm:text-sm"><CalendarDays className="h-4 w-4" /> Monthly attendance</button>}
        {d.canOverride && (
          <button type="button" onClick={() => onOverride(d)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] sm:text-sm"><PencilLine className="h-4 w-4" /> Override status</button>
        )}
      </div>
    </div>
  );
}

function Skeletons() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      <Skeleton className="h-24 rounded-xl" /><Skeleton className="h-32 rounded-xl" />
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
