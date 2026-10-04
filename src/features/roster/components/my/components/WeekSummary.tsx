'use client';

import { hoursText } from '../../../utils/myRosterUtils';

interface Props {
  shifts: number;
  minutes: number;
  nextShift: string | null;
}

export function WeekSummary({ shifts, minutes, nextShift }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Tile label="Shifts this week" value={String(shifts)} />
      <Tile label="Hours this week" value={hoursText(minutes)} />
      <div className="col-span-2 rounded-xl border border-line bg-surface p-3 sm:col-span-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Coming up</p>
        <p className="mt-1 text-sm font-bold text-fg">{nextShift ? `Next: ${nextShift}` : 'No upcoming shifts'}</p>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-fg">{value}</p>
    </div>
  );
}
