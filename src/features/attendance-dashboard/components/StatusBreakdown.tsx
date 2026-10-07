'use client';

import { cx } from '@/theme/tokens';
import { STATUS, STATUS_ORDER } from '../constants/dashboard.constants';
import type { DayStatus, EmployeeView, SummaryDto } from '../types/dashboard.dto';
import { Card, Skeleton } from './Card';

/**
 * Where everyone is, as one 100% bar (a 2px surface gap between segments) with a labelled,
 * clickable legend: every status carries its name and count, never colour alone.
 */
export function StatusBreakdown({ summary, isToday, view, onView, loading }: { summary: SummaryDto | null; isToday: boolean; view: EmployeeView; onView: (v: EmployeeView) => void; loading: boolean }) {
  const shown = STATUS_ORDER.filter((s) => isToday || s !== 'not_checked_in');
  return (
    <Card title="Where everyone is" subtitle="Each employee counts once. Select a status to list the people.">
      {loading || !summary ? (
        <div className="space-y-4"><Skeleton className="h-4 w-full rounded-full" /><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div></div>
      ) : summary.headcount === 0 ? (
        <p className="py-6 text-center text-sm text-fg-muted">No employees match these filters.</p>
      ) : (
        <>
          <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={shown.map((s) => `${STATUS[s].label} ${summary.counts[s]}`).join(', ')}>
            {shown.filter((s) => summary.counts[s] > 0).map((s) => (
              <div key={s} title={`${STATUS[s].label}: ${summary.counts[s]}`} className="h-full transition-[flex-grow] duration-500" style={{ flexGrow: summary.counts[s], flexBasis: 0, background: STATUS[s].color }} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {shown.map((s: DayStatus) => {
              const n = summary.counts[s];
              const share = summary.headcount ? Math.round((n / summary.headcount) * 100) : 0;
              return (
                <button key={s} type="button" onClick={() => onView(s)} aria-pressed={view === s}
                  className={cx('flex min-w-0 items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors', view === s ? 'border-[var(--tt-primary)] bg-bg-subtle' : 'border-line hover:bg-bg-subtle')}>
                  <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: STATUS[s].color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-fg-muted">{STATUS[s].label}</span>
                    <span className="text-sm font-extrabold tabular-nums text-fg">{n}<span className="ml-1 text-xs font-semibold text-fg-subtle">{share}%</span></span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}
