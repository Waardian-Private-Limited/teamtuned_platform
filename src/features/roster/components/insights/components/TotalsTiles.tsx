'use client';

import type { Insights } from '../../../types/roster.types';

export function TotalsTiles({ totals }: { totals: Insights['totals'] }) {
  const tiles = [
    { label: 'People', value: totals.employees },
    { label: 'Shifts', value: totals.shifts },
    { label: 'Hours', value: Math.round(totals.hours * 10) / 10 },
    { label: 'Overtime hours', value: Math.round((totals.overtime_minutes / 60) * 10) / 10 },
    { label: 'Comp-off days', value: totals.comp_off_days },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl border border-line bg-surface p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">{t.label}</p>
          <p className="mt-1 text-xl font-bold text-fg">{t.value}</p>
        </div>
      ))}
    </div>
  );
}
