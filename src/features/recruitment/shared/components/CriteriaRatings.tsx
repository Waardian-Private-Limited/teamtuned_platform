import React from 'react';
import { cx } from '@/theme/tokens';

/** A 1–5 value as a thin bar plus the number (read-only). */
function Meter({ value, label }: { value: number | null; label: string }) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className="flex items-center gap-2" role="img" aria-label={value === null ? `${label}: not rated` : `${label}: ${value} of 5`}>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-bg-subtle">
        <span className="block h-full rounded-full bg-fg" style={{ width: `${pct}%` }} />
      </span>
      <span className="w-7 text-right text-xs font-semibold tabular-nums text-fg">{value === null ? '—' : value}</span>
    </span>
  );
}

/** One panelist's criteria ratings (§10), in the interview's criteria order when given. */
export function CriteriaRatingsList({ ratings, criteria, className }: {
  ratings: Record<string, number> | null | undefined;
  criteria?: string[];
  className?: string;
}) {
  if (!ratings || Object.keys(ratings).length === 0) return null;
  const lower = new Map(Object.entries(ratings).map(([k, v]) => [k.toLowerCase(), v]));
  const names = criteria && criteria.length ? criteria : Object.keys(ratings);
  return (
    <dl className={cx('space-y-1', className)}>
      {names.map((name) => {
        const v = lower.get(name.toLowerCase());
        return (
          <div key={name} className="flex items-center justify-between gap-3">
            <dt className="min-w-0 truncate text-xs text-fg-muted">{name}</dt>
            <dd><Meter value={v ?? null} label={name} /></dd>
          </div>
        );
      })}
    </dl>
  );
}

/** Per-criterion average across the panel (§10). */
export function CriteriaAverages({ averages, title = 'Panel average', className }: {
  averages: Array<{ name: string; average: number | null; count: number }> | null | undefined;
  title?: string;
  className?: string;
}) {
  if (!averages || averages.length === 0 || averages.every((a) => a.count === 0)) return null;
  return (
    <div className={cx('rounded-lg border border-line bg-bg-subtle/60 p-2.5', className)}>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{title}</p>
      <dl className="space-y-1">
        {averages.map((a) => (
          <div key={a.name} className="flex items-center justify-between gap-3">
            <dt className="min-w-0 truncate text-xs text-fg-muted">
              {a.name}
              {a.count > 0 && <span className="ml-1 text-[11px] text-fg-subtle tabular-nums">({a.count})</span>}
            </dt>
            <dd><Meter value={a.average} label={`${a.name} average`} /></dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
