'use client';

import Link from 'next/link';
import { ArrowUpRight, Banknote, CheckCircle2, Clock3, FileClock, Hourglass, List, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cx } from '@/theme/tokens';
import { usePermission } from '@/lib/hooks/usePermission';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { CLAIMS_ACCESS, OVERVIEW_ACCESS, WALLETS_ACCESS } from '../constants/reimbursement.constants';
import { useExpenseFeatures } from '../hooks/useExpenseFeatures';
import { useExpensesBasePath } from '../hooks/useExpensesBasePath';
import { useOverview } from '../hooks/useOverview';
import type { CountAmount, Overview } from '../types/reimbursement.model';
import { compactMoney, money, monthLabel } from '../utils/format';
import { Block, CategoryIcon, FeatureOff, NoAccess, primaryBtn } from './components/Primitives';

export function ExpensesOverviewPage() {
  const f = useExpenseFeatures();
  const { canAny } = usePermission();
  if (!f.any) return <FeatureOff what="Expenses" />;
  if (!canAny(OVERVIEW_ACCESS)) return <NoAccess what="the expenses overview" />;
  return <OverviewScreen />;
}

/** `countOnly`: the figure is a number of reports (e.g. paper bills to collect), not money. */
function Tile({ icon: Icon, label, figure, note, href, countOnly }: { icon: LucideIcon; label: string; figure: CountAmount; note: string; href?: string; countOnly?: boolean }) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg">
          <Icon className="h-4 w-4" />
        </span>
        <span className="truncate text-xs font-semibold text-fg-muted">{label}</span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-xl font-extrabold leading-none tabular-nums text-fg sm:text-2xl">{countOnly ? figure.count.toLocaleString('en-IN') : money(figure.amount)}</div>
        <div className="mt-1.5 truncate text-xs text-fg-muted">
          {countOnly ? (figure.amount > 0 ? `${money(figure.amount)} · ${note}` : note) : `${figure.count} ${figure.count === 1 ? 'expense' : 'expenses'} · ${note}`}
        </div>
      </div>
    </>
  );
  const cls = 'flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 text-left shadow-[var(--tt-shadow-sm)] transition-colors';
  return href ? (
    <Link href={href} className={cx(cls, 'hover:border-line-strong')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const SERIES = [
  { key: 'claim', label: 'Claims', color: 'var(--tt-fg)' },
  { key: 'wallet', label: 'Wallet', color: 'var(--tt-fg-subtle)' },
] as const;

type TrendPoint = Overview['trend'][number];

function TrendTooltip({ active, payload, series }: { active?: boolean; payload?: Array<{ payload: TrendPoint }>; series: ReadonlyArray<(typeof SERIES)[number]> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-[var(--tt-shadow-md)]">
      <p className="font-bold text-fg">{monthLabel(p.month)}</p>
      {series.map((s) => (
        <p key={s.key} className="mt-1 flex items-center gap-2 text-fg-muted">
          <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
          {s.label} <strong className="ml-auto pl-3 tabular-nums text-fg">{money(p[s.key])}</strong>
        </p>
      ))}
    </div>
  );
}

function TrendChart({ trend, loading, features }: { trend: TrendPoint[] | null; loading: boolean; features: { claims: boolean; wallet: boolean } }) {
  const series = SERIES.filter((s) => (s.key === 'claim' ? features.claims : features.wallet));
  const data = trend ?? [];
  const empty = !loading && data.every((p) => !p.claim && !p.wallet);
  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)] sm:p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-fg">Approved spend</h2>
          <p className="mt-0.5 text-xs text-fg-muted">Last 6 months, by the month it was spent</p>
        </div>
        {series.length > 1 && (
          <ul className="flex items-center gap-3 text-xs text-fg-muted" aria-label="Legend">
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </li>
            ))}
          </ul>
        )}
      </header>
      {loading ? (
        <Block className="h-60 w-full" />
      ) : empty ? (
        <p className="flex h-60 items-center justify-center text-sm text-fg-muted">Nothing approved in the last 6 months.</p>
      ) : (
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }} barGap={2} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="var(--tt-border)" />
              <XAxis dataKey="month" tickFormatter={(m: string) => monthLabel(m, 'short').split(' ')[0]} tick={{ fontSize: 11, fill: 'var(--tt-fg-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v: number) => compactMoney(v)} tick={{ fontSize: 11, fill: 'var(--tt-fg-muted)' }} axisLine={false} tickLine={false} width={56} />
              <Tooltip content={<TrendTooltip series={series} />} cursor={{ fill: 'var(--tt-bg-subtle)' }} />
              {series.map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {!loading && !empty && (
        <table className="sr-only">
          <caption>Approved spend by month</caption>
          <thead>
            <tr>
              <th>Month</th>
              {series.map((s) => (
                <th key={s.key}>{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.month}>
                <td>{monthLabel(p.month)}</td>
                {series.map((s) => (
                  <td key={s.key}>{money(p[s.key])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function TopCategories({ items, loading }: { items: Overview['topCategories'] | null; loading: boolean }) {
  const max = Math.max(1, ...(items ?? []).map((i) => i.amount));
  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)] sm:p-5">
      <h2 className="text-sm font-bold text-fg">Top categories</h2>
      <p className="mt-0.5 text-xs text-fg-muted">This month</p>
      {loading ? (
        <Block className="mt-4 h-40 w-full" />
      ) : !items?.length ? (
        <p className="mt-4 text-sm text-fg-muted">Nothing approved this month yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((c) => (
            <li key={c.id} className="flex items-center gap-3">
              <CategoryIcon icon={c.icon} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-xs sm:text-sm">
                  <span className="truncate font-semibold text-fg">{c.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-fg">{money(c.amount)}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
                  <div className="h-full origin-left rounded-full bg-fg transition-transform duration-500" style={{ transform: `scaleX(${c.amount / max})` }} />
                </div>
                <p className="mt-0.5 text-[11px] text-fg-muted">
                  {c.claims} {c.claims === 1 ? 'expense' : 'expenses'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function WalletExposure({ w, href }: { w: NonNullable<Overview['wallets']>; href: string | null }) {
  const rows: Array<[string, string]> = [
    ['Funds with employees', money(w.fundsOut)],
    ['Owed to employees', money(w.owedToEmployees)],
    ['Wallets below zero', String(w.negative)],
    ['Active · frozen', `${w.active} · ${w.frozen}`],
    ['Fund requests waiting', String(w.fundRequestsPending)],
    ['Fund requests to pay', `${w.fundRequestsToPay.count} · ${money(w.fundRequestsToPay.amount)}`],
  ];
  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)] sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-fg">Expense wallets</h2>
          <p className="mt-0.5 text-xs text-fg-muted">{w.count} {w.count === 1 ? 'wallet' : 'wallets'}</p>
        </div>
        {href && (
          <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-fg hover:underline">
            Wallets <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <dl className="mt-3 divide-y divide-line">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 py-2 text-xs sm:text-sm">
            <dt className="text-fg-muted">{label}</dt>
            <dd className="font-semibold tabular-nums text-fg">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function OverviewScreen() {
  const base = useExpensesBasePath();
  const { canAny } = usePermission();
  const features = useExpenseFeatures();
  const o = useOverview();
  const k = o.data?.kpis;
  const listHref = (status: string) => {
    const q = new URLSearchParams({ status });
    if (o.subOrgId) q.set('subOrgId', String(o.subOrgId));
    return `${base}/claims?${q.toString()}`;
  };
  const f = o.data?.features ?? { claims: features.claims, wallet: features.wallet };
  const canWallets = f.wallet && canAny(WALLETS_ACCESS);
  const bills = o.data?.billsToCollect ?? null;
  const tileCount = 1 + (f.claims ? 3 : o.data?.wallets ? 1 : 0) + (bills ? 1 : 0);
  const tileGrid = cx('grid grid-cols-2 gap-3', tileCount > 4 ? 'md:grid-cols-3 xl:grid-cols-5' : 'md:grid-cols-4');

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3 pb-8">
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-center sm:justify-between sm:p-3.5 2xl:p-4">
        <div className="min-w-0">
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Expenses</h1>
          <p className="text-xs text-fg-muted sm:text-sm">What is waiting for approval, what is owed to employees and where the money goes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SubOrgFilter value={o.subOrgId} onChange={o.setSubOrgId} />
          <Link href={`${base}/claims`} className={primaryBtn}>
            <List className="h-3.5 w-3.5" />
            All expenses
          </Link>
        </div>
      </div>

      {o.error && <p role="alert" className="px-1 text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{o.error}</p>}

      <div className={cx('flex flex-col gap-3 transition-opacity duration-200', o.isFetching && !o.isLoading ? 'opacity-70' : 'opacity-100')}>
        {o.isLoading || !k ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Block key={i} className="h-[104px] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className={tileGrid}>
            <Tile icon={Hourglass} label="Waiting for approval" figure={k.pending} note={f.wallet && k.wallet_pending.count ? `${k.wallet_pending.count} from wallets` : 'In Approvals'} href={listHref('pending')} />
            {f.claims && <Tile icon={Clock3} label="To pay" figure={k.to_pay} note="By Accounts" href={listHref('to_pay')} />}
            {f.claims && <Tile icon={Banknote} label="With payroll" figure={k.in_payroll} note="Next draft pay run" href={`${listHref('approved')}&payout_mode=payroll`} />}
            {f.claims && <Tile icon={CheckCircle2} label="Paid this month" figure={k.paid_this_month} note={o.data ? monthLabel(o.data.month, 'short') : ''} href={listHref('paid')} />}
            {!f.claims && o.data?.wallets && (
              <Tile icon={Wallet} label="Fund requests to pay" figure={o.data.wallets.fundRequestsToPay} note="Approved" href={canWallets ? `${base}/wallets?tab=requests` : undefined} />
            )}
            {bills && (
              <Tile
                icon={FileClock}
                label="Bills to collect"
                figure={bills}
                note={bills.count ? 'Paper bills not handed in' : 'Nothing to collect'}
                href={canAny(CLAIMS_ACCESS) ? `${listHref('all')}&physical=pending` : undefined}
                countOnly
              />
            )}
          </div>
        )}
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <TrendChart trend={o.data?.trend ?? null} loading={o.isLoading} features={f} />
          <TopCategories items={o.data?.topCategories ?? null} loading={o.isLoading} />
        </div>
        {o.data?.wallets && <WalletExposure w={o.data.wallets} href={canWallets ? `${base}/wallets` : null} />}
      </div>
    </div>
  );
}
