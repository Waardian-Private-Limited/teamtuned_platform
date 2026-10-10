'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { Balance } from '../../types/detailed.model';
import { daysText, hoursText } from '../../utils/format';
import { CompOffGrantsList } from './CompOffGrantsList';

interface Props {
  balances: Balance[];
  showGrants?: boolean;
}

function detail(b: Balance) {
  const parts: string[] = [];
  if (b.kind === 'comp_off') {
    if (b.earned && b.earned.units > 0) parts.push(`earned ${daysText(b.earned.units)} this month`);
    if (b.earned && b.earned.pendingUnits > 0) parts.push(`${daysText(b.earned.pendingUnits)} waiting for approval`);
    if (b.earned && b.earned.paidMinutes > 0) parts.push(`${hoursText(Math.round((b.earned.paidMinutes / 60) * 10) / 10)} paid instead`);
    if (b.used) parts.push(`${daysText(b.used)} used`);
    return parts.join(' · ') || (b.period === 'monthly' ? 'for this month' : 'for this cycle');
  }
  parts.push(b.used ? `${daysText(b.used)} used of ${daysText(b.credited)}` : `of ${daysText(b.credited)}`);
  if (b.pending) parts.push(`${daysText(b.pending)} pending`);
  return parts.join(' · ');
}

/** Leave types and comp-off together: what the employee can still take, in one list. */
export function BalancesPanel({ balances, showGrants = false }: Props) {
  if (balances.length === 0) return null;

  const compOffBalance = balances.find((b) => b.kind === 'comp_off');
  const grants = compOffBalance?.grants || [];
  const pendingCount = grants.filter((g) => g.state === 'pending').length;

  return (
    <section aria-label="Leave and comp-off balances" className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-fg-muted">Leave and comp-off</h3>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            {pendingCount} pending
          </span>
        )}
      </div>

      <ul className="divide-y divide-line">
        {balances.map((b) => (
          <li key={`${b.kind}-${b.code}`} className="flex items-center gap-3 px-4 py-3">
            <span aria-hidden className={cx('h-8 w-1 shrink-0 rounded-full', b.kind === 'comp_off' ? 'bg-[var(--tt-accent)]' : 'bg-[var(--tt-border-strong)]')} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-fg">{b.name}</p>
              <p className="line-clamp-2 text-xs text-fg-muted">{detail(b)}</p>
            </div>
            <p className="text-xl font-extrabold tabular-nums text-fg">{daysText(b.available)}</p>
          </li>
        ))}
      </ul>

      {showGrants && grants.length > 0 && (
        <div className="border-t border-line bg-bg-subtle/30 p-3">
          <CompOffGrantsList
            grants={grants}
            title={pendingCount > 0 ? 'Pending & earned comp-offs' : 'Comp-off grants'}
          />
        </div>
      )}
    </section>
  );
}
