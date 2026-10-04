'use client';

import { cx } from '@/theme/tokens';
import type { Balance } from '../types/leave';
import { days, fmtDate } from '../utils/format';

const MODE_NOTE: Record<string, string> = { unlimited: 'No limit', per_event: 'Per occasion', none: 'No balance' };

export function BalanceCards({ balances, onPick }: { balances: Balance[]; onPick?: (b: Balance) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {balances.map((b) => {
        const credited = (b.opening ?? 0) + (b.credited ?? 0) + (b.carried_in ?? 0) + (b.adjusted ?? 0);
        const usedPct = credited > 0 ? Math.min(100, (((b.used ?? 0) + (b.pending ?? 0)) / credited) * 100) : 0;
        const plain = b.available == null;
        return (
          <button
            key={b.leave_type_id} type="button" disabled={!onPick} onClick={() => onPick?.(b)}
            className={cx('rounded-xl border border-line bg-surface p-4 text-left transition-colors', onPick && 'hover:bg-bg-subtle')}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-fg">{b.name}</p>
              {b.is_paid === false && <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted">Unpaid</span>}
            </div>
            {plain ? (
              <p className="mt-3 text-sm text-fg-muted">{MODE_NOTE[b.mode ?? ''] ?? '—'}{b.days_per_event ? ` · ${b.days_per_event} days` : ''}</p>
            ) : (
              <>
                <p className="mt-2 text-3xl font-bold tracking-tight text-fg">{days(b.available).replace(' d', '')}<span className="ml-1 text-sm font-medium text-fg-muted">days left</span></p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-subtle"><div className="h-full rounded-full bg-[var(--tt-primary)]" style={{ width: `${usedPct}%` }} /></div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div><dt className="text-fg-muted">Credited</dt><dd className="font-semibold text-fg">{days(credited)}</dd></div>
                  <div><dt className="text-fg-muted">Used</dt><dd className="font-semibold text-fg">{days(b.used)}</dd></div>
                  <div><dt className="text-fg-muted">Pending</dt><dd className="font-semibold text-fg">{days(b.pending)}</dd></div>
                </dl>
                {(b.locked ?? 0) > 0 && <p className="mt-2 text-xs text-fg-muted">{days(b.locked)} unlock when you are confirmed</p>}
                {b.expiring && <p className="mt-2 text-xs font-medium text-[var(--tt-danger)]">{days(b.expiring.quantity)} expire on {fmtDate(b.expiring.on)}</p>}
                {b.cycle && <p className="mt-2 text-[11px] text-fg-subtle">Leave year {fmtDate(b.cycle.start)} – {fmtDate(b.cycle.end)}</p>}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
