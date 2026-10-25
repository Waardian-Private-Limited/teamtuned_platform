'use client';

import Link from 'next/link';
import { MapPin, Building2, Users } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { Wallet } from '../../types/petty-cash.model';
import { floatPercent, money, walletOwner } from '../../utils/format';
import { LowBadge, WalletStatusPill, Balance } from './StatusBadges';

/** Share of the float left, as a thin bar. Monochrome: the bar is dashed-outlined and filled with the text colour. */
export function FloatBar({ balance, floatAmount, hasFloat = floatAmount > 0, className }: { balance: number; floatAmount: number; hasFloat?: boolean; className?: string }) {
  if (!hasFloat || floatAmount <= 0) return null;
  const pct = floatPercent(balance, floatAmount);
  return (
    <div className={className}>
      <div role="progressbar" aria-label="Cash left of the float" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-1.5 overflow-hidden rounded-full bg-bg-subtle ring-1 ring-inset ring-line">
        <div className="h-full rounded-full bg-fg transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-fg-muted">
        {pct}% of the {money(floatAmount)} float
      </p>
    </div>
  );
}

/** One wallet as a card: owner, cash, float bar, status. `href` makes the whole card a link. */
export function WalletCard({ wallet: w, href, footer, className }: { wallet: Wallet; href?: string; footer?: React.ReactNode; className?: string }) {
  const OwnerIcon = w.site ? MapPin : Building2;
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-fg">{w.name}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-fg-muted sm:text-xs">
            <OwnerIcon className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{walletOwner(w)}</span>
            {w.code && <span className="shrink-0">· {w.code}</span>}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <WalletStatusPill status={w.status} />
          {w.low && w.status === 'active' && <LowBadge />}
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-fg-muted">Cash in wallet</p>
          <p className="truncate text-xl font-extrabold">
            <Balance value={w.balance} />
          </p>
        </div>
        <div className="shrink-0 text-right text-[11px] text-fg-muted">
          <p>
            Available <span className="font-semibold tabular-nums text-fg">{money(w.available)}</span>
          </p>
          {w.held > 0 && <p>{money(w.held)} on hold</p>}
        </div>
      </div>
      <FloatBar balance={w.balance} floatAmount={w.floatAmount} hasFloat={w.hasFloat} className="mt-3" />
      {w.custodians.length > 0 && (
        <p className="mt-3 flex items-center gap-1 truncate text-[11px] text-fg-muted">
          <Users className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{w.custodians.map((c) => c.name).join(', ')}</span>
        </p>
      )}
      {footer}
    </>
  );
  const shell = cx('block min-w-0 rounded-xl border bg-surface p-4 shadow-[var(--tt-shadow-sm)]', w.low && w.status === 'active' ? 'border-dashed border-fg/50' : 'border-line', w.status === 'closed' && 'opacity-70', className);
  if (!href) return <div className={shell}>{body}</div>;
  return (
    <Link href={href} className={cx(shell, 'group transition-colors hover:bg-bg-subtle/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-primary)]')}>
      {body}
    </Link>
  );
}
