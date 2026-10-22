'use client';

import { cx } from '@/theme/tokens';
import { Card, Skeleton } from '@/features/attendance-dashboard/components/Card';
import type { AgingKey, AuditBacklogDto } from '../types/audit.dto';

// Older is darker: the bar reads as ink building up.
const SHADE: Record<AgingKey, string> = {
  under_1d: 'color-mix(in srgb, var(--tt-fg) 18%, var(--tt-surface))',
  d1_3: 'color-mix(in srgb, var(--tt-fg) 40%, var(--tt-surface))',
  d3_7: 'color-mix(in srgb, var(--tt-fg) 66%, var(--tt-surface))',
  over_7d: 'var(--tt-fg)',
};

/** How old the waiting requests are, as one stacked bar and a clickable legend per age. */
export function BacklogPanel({ backlog, loading, active, onAging }: { backlog: AuditBacklogDto | null; loading: boolean; active: AgingKey | null; onAging: (k: AgingKey, label: string) => void }) {
  return (
    <Card title="Backlog by age" subtitle="Every request pending now, whenever it was raised">
      {loading || !backlog ? <Skeleton className="h-28 w-full" /> : backlog.pending === 0 ? (
        <p className="flex h-28 items-center justify-center text-sm text-fg-muted">Nothing is waiting for a decision.</p>
      ) : (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-bg-subtle" role="img" aria-label={backlog.aging.map((a) => `${a.label}: ${a.count}`).join(', ')}>
            {backlog.aging.filter((a) => a.count > 0).map((a) => (
              <div key={a.key} className="h-full border-r-2 border-[var(--tt-surface)] last:border-r-0" style={{ width: `${(a.count / backlog.pending) * 100}%`, background: SHADE[a.key] }} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {backlog.aging.map((a) => (
              <button key={a.key} type="button" disabled={!a.count} onClick={() => onAging(a.key, `Waiting ${a.label.toLowerCase()}`)} aria-pressed={active === a.key}
                className={cx('flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-colors disabled:cursor-default disabled:opacity-50', active === a.key ? 'border-[var(--tt-primary)]' : 'border-line hover:border-line-strong')}>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-fg-muted"><span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: SHADE[a.key] }} />{a.label}</span>
                <span className="text-xl font-extrabold tabular-nums text-fg">{a.count}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
