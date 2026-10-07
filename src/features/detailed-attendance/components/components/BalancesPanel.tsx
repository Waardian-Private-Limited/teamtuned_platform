import { cx } from '@/theme/tokens';
import type { Balance } from '../../types/detailed.model';
import { daysText, hoursText } from '../../utils/format';

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
export function BalancesPanel({ balances }: { balances: Balance[] }) {
  if (balances.length === 0) return null;
  return (
    <section aria-label="Leave and comp-off balances" className="overflow-hidden rounded-xl border border-line bg-surface">
      <h3 className="border-b border-line px-4 py-3 text-xs font-bold uppercase tracking-wide text-fg-muted">Leave and comp-off</h3>
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
    </section>
  );
}
