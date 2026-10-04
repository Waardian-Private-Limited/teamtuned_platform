'use client';

import type { Insights } from '../../../types/roster.types';

type Metric = keyof Insights['inequality'];

const METRICS: { key: Metric; label: string; even: string; uneven: string; value: (e: Insights['employees'][number]) => number }[] = [
  { key: 'shifts', label: 'Shifts', even: 'Shifts are spread evenly', uneven: 'Some people work more shifts', value: (e) => e.shifts },
  { key: 'nights', label: 'Night shifts', even: 'Night shifts are spread evenly', uneven: 'Some people carry more nights', value: (e) => e.nights },
  { key: 'weekends', label: 'Weekends', even: 'Weekend work is spread evenly', uneven: 'Some people work more weekends', value: (e) => e.weekends },
  { key: 'holidays', label: 'Holidays', even: 'Holiday work is spread evenly', uneven: 'Some people work more holidays', value: (e) => e.holidays },
  { key: 'hours', label: 'Hours', even: 'Hours are spread evenly', uneven: 'Some people work longer hours', value: (e) => e.hours },
];

export function FairnessPanel({ insights }: { insights: Insights }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h3 className="text-sm font-bold text-fg">Fairness</h3>
      <p className="mb-3 text-xs text-fg-muted">How evenly work is shared. A lower spread is fairer.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {METRICS.map((m) => {
          const pct = Math.round(insights.inequality[m.key]);
          const sorted = insights.employees.map(m.value).sort((a, b) => b - a);
          const max = Math.max(1, ...sorted);
          return (
            <div key={m.key} className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-fg-muted">{m.label}</span>
                <span className="text-lg font-bold text-fg">{pct}%</span>
              </div>
              <div className="flex h-10 items-end gap-px" aria-hidden="true">
                {sorted.map((v, i) => (
                  <span key={i} className="min-w-px flex-1 rounded-sm bg-fg" style={{ height: `${Math.max(6, (v / max) * 100)}%`, opacity: 0.75 }} />
                ))}
              </div>
              <p className="text-xs text-fg">{pct <= 15 ? m.even : m.uneven}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
