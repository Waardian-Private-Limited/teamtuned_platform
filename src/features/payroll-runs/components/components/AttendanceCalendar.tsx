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

const tone = (t: string) => TONE[t] || TONE.muted;

function unitsNote(c: DayCell) {
  if (c.payableUnits === null) return null;
  if (c.payableUnits === 1) return null;
  if (c.payableUnits === 0) return 'No pay';
  return `${c.payableUnits} paid`;
}

export function AttendanceCalendar({ cells, onOpenDay }: { cells: DayCell[]; onOpenDay?: (date: string) => void }) {
  if (!cells.length) return null;
  const weekday = (date: string) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const lead = weekday(cells[0].date);
  const legend = Array.from(new Map(cells.filter((c) => c.key !== 'upcoming').map((c) => [c.label, c.tone])).entries()).slice(0, 8);

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
              const t = tone(c.tone);
              const note = unitsNote(c);
              return (
                <button
                  type="button"
                  key={c.date}
                  disabled={!onOpenDay || c.key === 'upcoming'}
                  onClick={() => onOpenDay?.(c.date)}
                  title={`${formatDate(c.date, 'weekday')}: ${c.label}${c.leaveName ? ` · ${c.leaveName}` : ''}${note ? ` · ${note}` : ''}`}
                  className="relative flex min-h-[58px] min-w-0 flex-col overflow-hidden rounded-md border border-line bg-surface px-1.5 py-1 pl-2.5 text-left transition-colors enabled:cursor-pointer enabled:hover:border-line-strong enabled:hover:bg-bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-fg/30 disabled:cursor-default"
                >
                  <span aria-hidden className={cx('absolute inset-y-0 left-0 w-[3px]', t.bar)} />
                  <span className="text-[11px] font-bold tabular-nums text-fg-muted">{Number(c.date.slice(8, 10))}</span>
                  <span className={cx('truncate text-[10px] font-semibold leading-tight', t.text)}>{c.label}</span>
                  {note && <span className="truncate text-[10px] text-fg-muted">{note}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line sm:hidden">
          {cells.map((c) => {
            const t = tone(c.tone);
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
                {note && <span className="shrink-0 text-[11px] text-fg-muted">{note}</span>}
              </li>
            );
          })}
        </ul>
        {legend.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
            {legend.map(([label, tn]) => (
              <span key={label} className="inline-flex items-center gap-1.5 text-[11px] text-fg-muted">
                <span aria-hidden className={cx('h-2 w-2 rounded-sm', tone(tn).bar)} />
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
