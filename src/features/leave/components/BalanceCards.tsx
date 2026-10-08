'use client';

import { cx } from '@/theme/tokens';
import type { Balance } from '../types/leave';
import { days, fmtDate } from '../utils/format';

const MODE_NOTE: Record<string, string> = { unlimited: 'No limit', per_event: 'Per occasion', none: 'No balance' };

export function BalanceCards({ balances, onPick }: { balances: Balance[]; onPick?: (b: Balance) => void }) {
  return (
    <div className={cx('grid w-full gap-4', balances.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
      {balances.map((b) => {
        const credited = (b.opening ?? 0) + (b.credited ?? 0) + (b.carried_in ?? 0) + (b.adjusted ?? 0);
        const usedPct = credited > 0 ? Math.min(100, (((b.used ?? 0) + (b.pending ?? 0)) / credited) * 100) : 0;
        const plain = b.available == null;
        return (
          <button
            key={b.leave_type_id}
            type="button"
            disabled={!onPick}
            onClick={() => onPick?.(b)}
            className={cx(
              'flex w-full flex-col justify-between rounded-xl border border-line bg-surface p-4 text-left transition-all',
              'shadow-xs hover:border-fg-muted/40 hover:shadow-sm',
              onPick ? 'cursor-pointer hover:bg-bg-subtle/40' : 'cursor-default'
            )}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-fg break-words">{b.name}</p>
                {b.is_paid === false && (
                  <span className="shrink-0 rounded-md border border-line px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted">
                    Unpaid
                  </span>
                )}
              </div>

              {plain ? (
                <p className="mt-3 text-sm text-fg-muted break-words">
                  {MODE_NOTE[b.mode ?? ''] ?? '—'}{b.days_per_event ? ` · ${b.days_per_event} days` : ''}
                </p>
              ) : (
                <>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold tracking-tight text-fg">
                      {days(b.available).replace(' d', '')}
                    </span>
                    <span className="text-xs font-semibold text-fg-muted">days left</span>
                  </div>

                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
                    <div
                      className="h-full rounded-full bg-[var(--tt-primary)] transition-all"
                      style={{ width: `${usedPct}%` }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 divide-x divide-line rounded-lg border border-line/60 bg-bg-subtle/50 py-2.5 text-center">
                    <div className="px-1.5">
                      <span className="block text-[11px] font-medium text-fg-muted">Credited</span>
                      <span className="mt-0.5 block text-xs font-bold text-fg">{days(credited)}</span>
                    </div>
                    <div className="px-1.5">
                      <span className="block text-[11px] font-medium text-fg-muted">Used</span>
                      <span className="mt-0.5 block text-xs font-bold text-fg">{days(b.used)}</span>
                    </div>
                    <div className="px-1.5">
                      <span className="block text-[11px] font-medium text-fg-muted">Pending</span>
                      <span className="mt-0.5 block text-xs font-bold text-fg">{days(b.pending)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-3 border-t border-line/40 pt-2.5 space-y-1">
              {(b.locked ?? 0) > 0 && (
                <p className="text-xs text-fg-muted">{days(b.locked)} unlock when you are confirmed</p>
              )}
              {b.expiring && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--tt-danger)]">
                  <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--tt-danger)]" />
                  <span>{days(b.expiring.quantity)} expire on {fmtDate(b.expiring.on)}</span>
                </div>
              )}
              {b.cycle && (
                <p className="text-[11px] text-fg-subtle">
                  Leave year: {fmtDate(b.cycle.start)} – {fmtDate(b.cycle.end)}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
