'use client';

import { AlertTriangle, Banknote, CheckCircle2, HandCoins, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { money, monthLabel } from '@/features/salary-advance/utils/format';
import type { PayoutOverview, PayoutTab } from '../../types/payouts.model';

function Tile({ icon: Icon, label, value, note, onClick, tone }: { icon: LucideIcon; label: string; value: string; note: string; onClick?: () => void; tone?: 'danger' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cx(
        'flex min-w-0 flex-col gap-2.5 rounded-xl border border-line bg-surface p-3.5 text-left shadow-[var(--tt-shadow-sm)] transition-colors sm:p-4',
        onClick && 'hover:border-line-strong focus-visible:outline-2 focus-visible:outline-[var(--tt-primary)]'
      )}
    >
      <span className="flex items-center gap-2">
        <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle', tone === 'danger' ? 'text-[var(--tt-danger)]' : 'text-fg')}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="truncate text-xs font-semibold text-fg-muted">{label}</span>
      </span>
      <span className="truncate text-lg font-extrabold leading-none tabular-nums text-fg sm:text-xl">{value}</span>
      <span className="truncate text-[11px] text-fg-muted sm:text-xs">{note}</span>
    </button>
  );
}

export function PayoutTiles({ overview, loading, onOpen }: { overview: PayoutOverview | null; loading: boolean; onOpen: (tab: PayoutTab, source?: 'salary' | 'advance') => void }) {
  if (loading || !overview) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-[112px] animate-pulse rounded-xl bg-bg-subtle" />)}
      </div>
    );
  }
  const o = overview;
  const people = (n: number) => `${n} ${n === 1 ? 'payment' : 'payments'}`;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Tile icon={Wallet} label="To pay" value={money(o.toPay.total.amount)} note={people(o.toPay.total.count)} onClick={() => onOpen('to_pay')} />
      <Tile icon={Banknote} label="Salaries" value={money(o.toPay.salary.amount)} note={people(o.toPay.salary.count)} onClick={() => onOpen('to_pay', 'salary')} />
      <Tile icon={HandCoins} label="Advances" value={money(o.toPay.advance.amount)} note={people(o.toPay.advance.count)} onClick={() => onOpen('to_pay', 'advance')} />
      <Tile icon={AlertTriangle} label="Failed" value={money(o.failed.amount)} note={people(o.failed.count)} onClick={() => onOpen('failed')} tone={o.failed.count ? 'danger' : undefined} />
      <Tile icon={CheckCircle2} label={`Paid in ${monthLabel(o.month, 'short')}`} value={money(o.paidThisMonth.amount)} note={people(o.paidThisMonth.count)} onClick={() => onOpen('paid')} />
    </div>
  );
}
