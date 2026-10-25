'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, Plus } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useAuth } from '@/context/AuthContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { ILLUSTRATIONS, PC } from '../constants/petty-cash.constants';
import { MY_PETTY_CASH_PATH } from '../hooks/usePettyCashBasePath';
import { useMyOverview } from '../hooks/useMyOverview';
import { usePettyCashAccess } from '../hooks/usePettyCashAccess';
import type { Wallet } from '../types/petty-cash.model';
import { money } from '../utils/format';
import { AskFundsDialog } from './components/FundDialogs';
import { CashCountDialog } from './components/CashCountDialog';
import { ExpenseCardList } from './components/ExpenseCardList';
import { ExpenseFormDrawer } from './components/ExpenseFormDrawer';
import { GoodsToReceive } from './components/GoodsToReceive';
import { ReceiveGoodsDialog } from './components/ReceiveGoodsDialog';
import { useReceiveAfterSave } from '../hooks/useReceiveAfterSave';
import { FundStatusPill } from './components/StatusBadges';
import { Block, Gate, Panel } from './components/Primitives';
import { WalletCard } from './components/WalletCard';
import { MyExpenses } from './MyExpensesPage';
import { MyFundRequests } from './MyFundRequestsPage';

const TABS = [
  { value: 'wallets', label: 'Wallets' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'fund-requests', label: 'Fund requests' },
] as const;
type Tab = (typeof TABS)[number]['value'];

export function MyPettyCashPage() {
  const { enabled, can } = usePettyCashAccess();
  return (
    <Gate enabled={enabled} allowed={can(PC.SPEND)} what="petty cash">
      <MyPettyCash />
    </Gate>
  );
}

/** What the person may spend, in a line: the spendable amount and the rules that matter to them. */
function SpendLine({ wallet: w }: { wallet: Wallet }) {
  const spend = w.spendable === null ? w.available : Math.max(0, w.spendable);
  const rules = [
    w.maxPerExpense !== null ? `Up to ${money(w.maxPerExpense)} per expense` : null,
    w.rules?.physicalCopy === 'always' ? 'Paper bill needed' : w.rules?.physicalCopy === 'above' && w.rules.physicalCopyAbove !== null ? `Paper bill above ${money(w.rules.physicalCopyAbove)}` : null,
  ].filter(Boolean);
  return (
    <div className="mt-3 border-t border-line pt-3 text-xs">
      <p className="flex items-baseline justify-between gap-3">
        <span className="text-fg-muted">You can spend</span>
        <span className="text-sm font-bold tabular-nums text-fg">{money(spend)}</span>
      </p>
      {rules.length > 0 && <p className="mt-1 text-[11px] text-fg-muted">{rules.join(' · ')}</p>}
    </div>
  );
}

function MyPettyCash() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = TABS.some((t) => t.value === raw) ? (raw as Tab) : 'wallets';
  const setTab = (next: Tab) => router.replace(next === 'wallets' ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div>
        <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">My petty cash</h1>
      </div>
      <div className="w-full overflow-x-auto tt-scroll-hidden sm:w-auto sm:self-start">
        <SegmentedControl<Tab> options={TABS} value={tab} onChange={setTab} fitText />
      </div>
      {tab === 'expenses' ? <MyExpenses /> : tab === 'fund-requests' ? <MyFundRequests /> : <MyWallets />}
    </div>
  );
}

const noop = () => {};

function MyWallets() {
  const { data, isLoading, isFetching, error, refetch } = useMyOverview();
  const { user } = useAuth();
  const who = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'you';
  const [adding, setAdding] = React.useState<number | null | 'any'>(null);
  const [counting, setCounting] = React.useState<Wallet | null>(null);
  const [asking, setAsking] = React.useState<Wallet | null>(null);
  const receive = useReceiveAfterSave(noop);
  const wallets = data?.wallets ?? [];
  const usable = wallets.filter((w) => w.status === 'active');
  const month = data?.month;

  const tiles: Array<[string, string, string, string]> = month
    ? [
        ['Waiting for approval', String(month.pending), money(month.pendingAmount), `${MY_PETTY_CASH_PATH}?tab=expenses&status=pending`],
        ['Approved this month', String(month.approved), money(month.approvedAmount), `${MY_PETTY_CASH_PATH}?tab=expenses&status=approved`],
        ['Paper bills to hand in', String(month.paperPending), month.paperPending === 1 ? 'bill' : 'bills', `${MY_PETTY_CASH_PATH}?tab=expenses&physical=pending`],
      ]
    : [];

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap justify-end gap-2">
        <GoodsToReceive />
        <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} disabled={!usable.length} onClick={() => setAdding('any')}>
          Add expense
        </Btn>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-line bg-surface px-4 py-3 text-xs font-medium text-[var(--tt-danger)] sm:text-sm">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Block key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : wallets.length === 0 && !error ? (
        <div className="rounded-xl border border-line bg-surface p-6">
          <EmptyState
            illustration={ILLUSTRATIONS.wallet}
            title="No petty cash wallet yet"
            description={`No petty cash wallet is assigned to ${who}. A custodian is set per wallet, or HR can let everyone at a site spend (Petty cash → Settings → Who can spend).`}
            action={{ label: isFetching ? 'Refreshing…' : 'Refresh', onClick: () => { if (!isFetching) refetch(); } }}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {wallets.map((w) => (
              <div key={w.id} className="flex min-w-0 flex-col gap-2">
                <WalletCard wallet={w} href={`${MY_PETTY_CASH_PATH}/wallets/${w.id}`} footer={<SpendLine wallet={w} />} className="flex-1" />
                {w.status === 'active' && (
                  <div className="flex flex-wrap gap-2">
                    <Btn variant="primary" onClick={() => setAdding(w.id)} className="h-8 flex-1">
                      Add expense
                    </Btn>
                    {w.can.count && (
                      <Btn onClick={() => setCounting(w)} className="h-8 flex-1">
                        Count cash
                      </Btn>
                    )}
                    {w.can.askFunds && (
                      <Btn onClick={() => setAsking(w)} className="h-8 flex-1">
                        Ask for funds
                      </Btn>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {tiles.map(([label, value, note, href]) => (
              <Link key={label} href={href} className="block min-w-0 rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)] transition-colors hover:bg-bg-subtle/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-primary)]">
                <p className="truncate text-xs font-semibold text-fg-muted">{label}</p>
                <p className="mt-1.5 truncate text-xl font-extrabold tabular-nums text-fg">{value}</p>
                <p className="mt-0.5 truncate text-[11px] text-fg-muted">{note}</p>
              </Link>
            ))}
          </div>

          {(data?.openFundRequests.length ?? 0) > 0 && (
            <Panel title="Open fund requests" aside={<Link href={`${MY_PETTY_CASH_PATH}?tab=fund-requests`} className="text-xs font-semibold text-fg-muted underline-offset-2 hover:text-fg hover:underline">See all</Link>} flush>
              <ul className="divide-y divide-line">
                {data?.openFundRequests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-fg">{r.wallet.name}</p>
                      <p className="truncate text-xs text-fg-muted">{r.mode === 'replenish' ? 'Back up to float' : r.reason || 'Funds'}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-bold tabular-nums text-fg">{money(r.approvedAmount ?? r.amount)}</span>
                      <FundStatusPill status={r.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel
            title="Recent expenses"
            aside={
              <Link href={`${MY_PETTY_CASH_PATH}?tab=expenses`} className="inline-flex items-center gap-0.5 text-xs font-semibold text-fg-muted underline-offset-2 hover:text-fg hover:underline">
                All expenses
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
            flush
          >
            {data && data.recent.length > 0 ? (
              <div className="divide-y divide-line">
                <ExpenseCardList rows={data.recent} href={(id) => `${MY_PETTY_CASH_PATH}/expenses/${id}`} audience="me" />
              </div>
            ) : (
              <div className="p-6">
                <EmptyState compact title="No expenses yet" description="Expenses you add show here." />
              </div>
            )}
          </Panel>
        </>
      )}

      <ExpenseFormDrawer
        open={adding !== null}
        onClose={() => setAdding(null)}
        mode="me"
        walletId={typeof adding === 'number' ? adding : null}
        onSaved={(d) => {
          setAdding(null);
          refetch();
          receive.handle(d);
        }}
      />
      <ReceiveGoodsDialog {...receive.dialogProps} onReceived={refetch} />
      {counting && <CashCountDialog open onClose={() => setCounting(null)} onDone={() => { setCounting(null); refetch(); }} walletId={counting.id} bookBalance={counting.balance} scope="me" />}
      {asking && <AskFundsDialog open onClose={() => setAsking(null)} onDone={() => { setAsking(null); refetch(); }} wallet={asking} />}
    </div>
  );
}

