'use client';

import { cx } from '@/theme/tokens';
import type { ScheduleDay } from '../../../types/roster.types';
import { TONE_CLASS } from '../../../utils/shiftTone';
import { clockOf } from '../../../utils/rosterTime';
import { kindText, shiftLabel, toneFor } from '../../../utils/myRosterUtils';

interface Props {
  rows: ScheduleDay[];
  holiday?: string;
  onSelect: (row: ScheduleDay) => void;
  compact?: boolean;
}

export function DayEntries({ rows, holiday, onSelect, compact }: Props) {
  const hasHolidayRow = rows.some((r) => r.kind === 'holiday');
  const items = rows.map((row) => {
    if (row.kind === 'shift') {
      return (
        <button
          key={row.id}
          type="button"
          onClick={() => onSelect(row)}
          className={cx(
            'w-full rounded-md px-1.5 py-1 text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-primary)]',
            TONE_CLASS[toneFor(row)]
          )}
        >
          <span className="flex items-center justify-between gap-1">
            <span className="truncate text-[11px] font-bold sm:text-xs">{compact ? shiftLabel(row) : row.short_code || shiftLabel(row)}</span>
            <span className="flex shrink-0 gap-0.5">
              {row.is_overtime ? <Marker>OT</Marker> : null}
              {row.earns_comp_off ? <Marker>CO</Marker> : null}
            </span>
          </span>
          <span className="block truncate text-[10px] opacity-80 sm:text-[11px]">
            {clockOf(row.start_at)} – {clockOf(row.end_at)}
          </span>
        </button>
      );
    }
    const label = row.kind === 'holiday' && holiday ? `HOLIDAY · ${holiday}` : kindText(row.kind);
    return (
      <div key={row.id} className="rounded-md border border-dashed border-line-strong px-1.5 py-1 text-[11px] font-semibold text-fg-muted">
        <span className="block truncate">{label}</span>
      </div>
    );
  });
  if (holiday && !hasHolidayRow) {
    items.push(
      <div key="holiday" className="rounded-md border border-dashed border-line-strong px-1.5 py-1 text-[11px] font-semibold text-fg-muted">
        <span className="block truncate">HOLIDAY · {holiday}</span>
      </div>
    );
  }
  return <div className="flex flex-col gap-1">{items}</div>;
}

function Marker({ children }: { children: React.ReactNode }) {
  return <span className="rounded border border-current px-1 text-[9px] font-bold leading-3">{children}</span>;
}
