import { cx } from '@/theme/tokens';
import { formatDate } from '@/lib/datetime';
import { WEEKDAYS } from '../../constants/payrollRuns.constants';
import type { DayCell } from '../../types/payrollRuns.model';
import { SectionCard } from './controls';

const TONE: Record<string, { bar: string; text: string }> = {
  good: { bar: 'bg-fg', text: 'text-fg' },
  warn: { bar: 'bg-fg-muted', text: 'text-fg' },
  bad: { bar: 'bg-[var(--tt-danger)]', text: 'text-[var(--tt-danger)]' },
  info: { bar: 'bg-line-strong', text: 'text-fg-muted' },
  muted: { bar: 'bg-line', text: 'text-fg-subtle' },
};

const OFF_KEYS = ['week_off', 'holiday'];
const NOT_COUNTED = ['week_off', 'holiday', 'not_joined', 'exited', 'upcoming'];
const LOP = { bar: 'bg-[var(--tt-danger)]', text: 'text-[var(--tt-danger)]', box: 'border-[var(--tt-danger)] bg-[var(--tt-danger-soft)]' };
const WORKED_OFF = { bar: 'bg-[var(--tt-accent)]', text: 'text-[var(--tt-accent)]', box: 'border-[var(--tt-accent)] bg-[var(--tt-accent-soft)]' };

/** A working day not paid in full: loss of pay. */
const isLop = (c: DayCell) => c.payableUnits !== null && c.payableUnits < 1 && !NOT_COUNTED.includes(c.key);
/** A week off or holiday with overtime on it. */
const workedOff = (c: DayCell) => OFF_KEYS.includes(c.key) && c.overtimeMinutes > 0;

function look(c: DayCell) {
  if (isLop(c)) return LOP;
  if (workedOff(c)) return WORKED_OFF;
  return { ...(TONE[c.tone] || TONE.muted), box: 'border-line bg-surface' };
}

const hours = (minutes: number) => `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`;

function unitsNote(c: DayCell) {
  if (workedOff(c)) return `Worked ${hours(c.overtimeMinutes)}`;
  if (c.payableUnits === null) return c.note;
  if (isLop(c)) return c.payableUnits === 0 ? 'LOP 1 day' : `LOP ${Math.round((1 - c.payableUnits) * 100) / 100} day`;
  if (c.covered) return `Absent · paid by ${c.leaveName || 'leave'}`;
  if (c.payableUnits === 1) return c.note && c.note !== c.leaveName ? `${c.note} · paid` : null;
  if (c.payableUnits === 0) return 'No pay';
  return `${c.payableUnits} paid`;
}

export function AttendanceCalendar({ cells, onOpenDay }: { cells: DayCell[]; onOpenDay?: (date: string) => void }) {
  if (!cells.length) return null;
  const weekday = (date: string) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const lead = weekday(cells[0].date);
  const legend = Array.from(new Map(cells.filter((c) => c.key !== 'upcoming' && !isLop(c) && !workedOff(c)).map((c) => [c.label, look(c).bar])).entries()).slice(0, 8);
  if (cells.some(isLop)) legend.unshift(['Loss of pay', LOP.bar]);
  if (cells.some(workedOff)) legend.push(['Worked on week off / holiday', WORKED_OFF.bar]);

  return (
    <SectionCard title="Attendance in this period">
      {onOpenDay && <p className="px-3 pt-3 text-[11px] text-fg-muted sm:px-4">Click a day to see punches, leave and overrides.</p>}
      <div className="p-3 sm:p-4">
        <div className="hidden sm:block">
          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w) => (
              <p key={w} className="text-center text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
                {w}
              </p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: lead }).map((_, i) => (
              <div key={`pad${i}`} aria-hidden />
            ))}
            {cells.map((c) => {
              const t = look(c);
              const note = unitsNote(c);
              return (
                <button
                  type="button"
                  key={c.date}
                  disabled={!onOpenDay || c.key === 'upcoming'}
                  onClick={() => onOpenDay?.(c.date)}
                  title={`${formatDate(c.date, 'weekday')}: ${c.label}${c.leaveName ? ` · ${c.leaveName}` : ''}${note ? ` · ${note}` : ''}`}
                  className={cx('relative flex min-h-[58px] min-w-0 flex-col overflow-hidden rounded-md border px-1.5 py-1 pl-2.5 text-left transition-colors enabled:cursor-pointer enabled:hover:border-line-strong enabled:hover:bg-bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-fg/30 disabled:cursor-default', t.box)}
                >
                  <span aria-hidden className={cx('absolute inset-y-0 left-0 w-[3px]', t.bar)} />
                  <span className="text-[11px] font-bold tabular-nums text-fg-muted">{Number(c.date.slice(8, 10))}</span>
                  <span className={cx('truncate text-[10px] font-semibold leading-tight', t.text)}>{c.label}</span>
                  {note && <span className={cx('truncate text-[10px]', isLop(c) || workedOff(c) ? cx('font-semibold', t.text) : 'text-fg-muted')}>{note}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line sm:hidden">
          {cells.map((c) => {
            const t = look(c);
            const note = unitsNote(c);
            return (
              <li
                key={c.date}
                onClick={() => onOpenDay && c.key !== 'upcoming' && onOpenDay(c.date)}
                className={cx('flex items-center gap-3 px-3 py-2', onOpenDay && c.key !== 'upcoming' && 'cursor-pointer active:bg-bg-subtle')}
              >
                <span aria-hidden className={cx('h-6 w-1 shrink-0 rounded-full', t.bar)} />
                <span className="w-24 shrink-0 text-xs font-semibold text-fg">{formatDate(c.date, 'weekday')}</span>
                <span className={cx('min-w-0 flex-1 truncate text-xs font-semibold', t.text)}>{c.label}</span>
                {note && <span className={cx('shrink-0 text-[11px]', isLop(c) || workedOff(c) ? cx('font-semibold', t.text) : 'text-fg-muted')}>{note}</span>}
              </li>
            );
          })}
        </ul>
        {legend.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
            {legend.map(([label, bar]) => (
              <span key={label} className="inline-flex items-center gap-1.5 text-[11px] text-fg-muted">
                <span aria-hidden className={cx('h-2 w-2 rounded-sm', bar)} />
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
