'use client';

import { formatDay } from '../../../utils/rosterTime';
import type { Insights } from '../../../types/roster.types';

export function CoverageChart({ days }: { days: Insights['days'] }) {
  const max = Math.max(1, ...days.map((d) => d.staffed));
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h3 className="text-sm font-bold text-fg">Coverage by day</h3>
      <p className="mb-3 text-xs text-fg-muted">How many people are working each day.</p>
      {days.length === 0 ? (
        <p className="text-sm text-fg-muted">No days in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex h-40 items-end gap-1" style={{ minWidth: Math.max(days.length * 22, 0) }}>
            {days.map((d) => (
              <div key={d.date} className="flex h-full min-w-4 flex-1 flex-col items-center justify-end gap-1" title={`${formatDay(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}: ${d.staffed} working`}>
                <span className="text-[10px] font-semibold text-fg-muted">{d.staffed}</span>
                <span className="w-full rounded-t bg-fg" style={{ height: `${(d.staffed / max) * 100}%`, minHeight: d.staffed ? 2 : 0, opacity: 0.8 }} />
                <span className="text-[10px] text-fg-muted">{Number(d.date.slice(8))}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
