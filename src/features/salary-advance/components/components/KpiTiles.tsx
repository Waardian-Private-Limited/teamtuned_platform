'use client';

import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, Banknote, Clock3, Hourglass, Repeat2, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { OverviewKpis } from '../../types/salaryAdvance.model';
import { money, monthLabel } from '../../utils/format';
import { Block } from './StatusBadges';

interface TileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  note?: string;
  href?: string;
}

function Tile({ icon: Icon, label, value, note, href }: TileProps) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg">
          <Icon className="h-4 w-4" />
        </span>
        <span className="truncate text-xs font-semibold text-fg-muted">{label}</span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-xl font-extrabold leading-none tabular-nums text-fg sm:text-2xl">{value}</div>
        {note && <div className="mt-1.5 truncate text-xs text-fg-muted">{note}</div>}
      </div>
    </>
  );
  const base = 'flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 text-left shadow-[var(--tt-shadow-sm)] transition-colors';
  if (!href) return <div className={base}>{body}</div>;
  return (
    <Link href={href} className={cx(base, 'hover:border-line-strong focus-visible:outline-2 focus-visible:outline-[var(--tt-primary)]')}>
      {body}
    </Link>
  );
}

interface KpiTilesProps {
  kpis: OverviewKpis | null;
  month: string;
  loading: boolean;
  listHref: (status: string) => string;
}

export function KpiTiles({ kpis, month, loading, listHref }: KpiTilesProps) {
  if (loading || !kpis) {
    return (
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,3fr)]">
        <Block className="h-[176px] rounded-xl" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Block key={i} className="h-[100px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  const k = kpis;
  const monthText = monthLabel(month, 'short');
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,3fr)]">
      <Link
        href={listHref('active')}
        className="flex flex-col justify-between rounded-xl border border-line bg-surface p-5 shadow-[var(--tt-shadow-sm)] transition-colors hover:border-line-strong"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Outstanding</p>
          <p className="mt-2 truncate text-4xl font-extrabold leading-none tabular-nums text-fg sm:text-5xl">{money(k.outstanding)}</p>
          <p className="mt-2 text-sm text-fg-muted">
            Across <strong className="font-bold text-fg">{k.activeCount}</strong> active {k.activeCount === 1 ? 'advance' : 'advances'}
          </p>
        </div>
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-fg">
          View active <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </Link>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Tile icon={Wallet} label="Active" value={String(k.activeCount)} note="Being recovered" href={listHref('active')} />
        <Tile icon={Hourglass} label="Pending approval" value={String(k.pendingCount)} note="Waiting in Approvals" href={listHref('pending')} />
        <Tile icon={Clock3} label="To disburse" value={String(k.toDisburseCount)} note="Approved, not paid out" href={listHref('to_disburse')} />
        <Tile icon={Banknote} label="Paid out" value={money(k.disbursedThisMonth)} note={monthText} />
        <Tile icon={ArrowDownLeft} label="Recovered" value={money(k.recoveredThisMonth)} note={monthText} />
        <Tile icon={Repeat2} label="Carried forward" value={money(k.carriedThisMonth)} note={`Not recovered in ${monthText}`} />
      </div>
    </div>
  );
}
