'use client';

import { Users } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Fact, Panel } from './Primitives';
import type { CashCount, Wallet } from '../../types/petty-cash.model';
import { dateTimeText, money, walletOwner, walletRoomText } from '../../utils/format';
import { Balance, LowBadge, WalletStatusPill } from './StatusBadges';
import { FloatBar } from './WalletCard';

/** Balance, on hold, available and float of one wallet, with the rules that bound spending. */
export function WalletPosition({ wallet: w, actions }: { wallet: Wallet; actions?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-base font-bold tracking-tight text-fg sm:text-lg">{w.name}</h1>
            <WalletStatusPill status={w.status} />
            {w.low && w.status === 'active' && <LowBadge />}
          </div>
          <p className="mt-0.5 text-xs text-fg-muted sm:text-sm">{[walletOwner(w), w.code].filter(Boolean).join(' · ')}</p>
          {w.statusNote && w.status !== 'active' && <p className="mt-1.5 rounded-md bg-bg-subtle px-2.5 py-1.5 text-xs text-fg">{w.statusNote}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Fact label="Cash in wallet" value={<Balance value={w.balance} className="text-lg font-extrabold" />} />
        <Fact label="On hold" value={<span className="tabular-nums">{money(w.held)}</span>} />
        <Fact label="Available" value={<Balance value={w.available} />} />
        {w.hasFloat && <Fact label="Float" value={<span className="tabular-nums">{money(w.floatAmount)}</span>} />}
      </dl>
      <FloatBar balance={w.balance} floatAmount={w.floatAmount} hasFloat={w.hasFloat} className="mt-4" />
      <p className="mt-3 text-[11px] text-fg-muted sm:text-xs">
        {[
          w.spendable !== null ? `Can spend ${money(w.spendable)} now` : 'No spending limit',
          w.maxPerExpense ? `Up to ${money(w.maxPerExpense)} per expense` : null,
          walletRoomText(w, money),
          w.lowBalanceAlert ? `Low-balance alert at ${money(w.lowBalanceAlert)}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
    </section>
  );
}

export function CustodianList({ wallet }: { wallet: Wallet }) {
  return (
    <Panel title="Custodians" aside={<Users className="h-4 w-4 text-fg-muted" aria-hidden />}>
      {wallet.custodians.length === 0 ? (
        <p className="text-sm text-fg-muted">No custodian is named on this wallet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {wallet.custodians.map((c) => (
            <li key={c.employeeId} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{c.name}</p>
                {c.code && <p className="text-[11px] text-fg-muted">{c.code}</p>}
              </div>
              {c.isPrimary && <span className="shrink-0 rounded-full border border-line-strong px-2 py-0.5 text-[11px] font-semibold text-fg">Primary</span>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** Cash counts, newest first. `action` adds a button to a row (post the difference). */
export function CashCountList({ counts, action }: { counts: CashCount[]; action?: (c: CashCount) => React.ReactNode }) {
  if (!counts.length) return <p className="text-sm text-fg-muted">No cash count has been recorded yet.</p>;
  return (
    <ul className="divide-y divide-line">
      {counts.map((c) => (
        <li key={c.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-xs sm:text-sm">
            <p className="font-semibold text-fg">
              Counted <span className="tabular-nums">{money(c.countedAmount)}</span> of <span className="tabular-nums">{money(c.bookBalance)}</span> in the books
            </p>
            <p className="mt-0.5 text-fg-muted">{[c.countedBy, c.at ? dateTimeText(c.at) : null, c.note].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className={cx('text-sm font-bold tabular-nums', c.difference < 0 ? 'text-[var(--tt-danger)]' : 'text-fg')}>
              {c.difference === 0 ? 'Matches' : `${c.difference > 0 ? '+' : ''}${money(c.difference)}`}
            </span>
            {c.difference !== 0 && (c.adjusted ? <span className="text-[11px] text-fg-muted">Posted to ledger</span> : action?.(c))}
          </div>
        </li>
      ))}
    </ul>
  );
}
