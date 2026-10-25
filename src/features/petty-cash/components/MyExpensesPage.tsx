'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Download, Plus } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { tabIllustration, MY_EXPENSE_TABS } from '../constants/petty-cash.constants';
import { useExpenseList } from '../hooks/useExpenseList';
import { MY_PETTY_CASH_PATH } from '../hooks/usePettyCashBasePath';
import type { ExpenseDetail, ExpenseTab } from '../types/petty-cash.model';
import { ExpenseFilterControls, ExpenseSearch } from './components/ExpenseFilters';
import { ExpenseFormDrawer } from './components/ExpenseFormDrawer';
import { ReceiveGoodsDialog } from './components/ReceiveGoodsDialog';
import { useReceiveAfterSave } from '../hooks/useReceiveAfterSave';
import { GoodsToReceive } from './components/GoodsToReceive';
import { ExpenseListBody } from './components/ExpenseListBody';
import { ExportExpensesDialog } from './components/ExportDialogs';
import { primaryBtn, secondaryBtn } from './components/Primitives';

/** Old address of the list: it now lives in the Expenses tab of My petty cash, keeping the filters in the URL. */
export function MyExpensesPage() {
  const router = useRouter();
  React.useEffect(() => {
    router.replace(`${MY_PETTY_CASH_PATH}?tab=expenses${typeof window !== 'undefined' && window.location.search ? `&${window.location.search.slice(1)}` : ''}`);
  }, [router]);
  return null;
}

/** The employee's own expenses, embedded in the Expenses tab of My petty cash. */
export function MyExpenses() {
  const router = useRouter();
  const list = useExpenseList('me', 'all');
  const [creating, setCreating] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const f = list.filters;
  const href = React.useCallback((id: number) => `${MY_PETTY_CASH_PATH}/expenses/${id}`, []);
  const tabs = MY_EXPENSE_TABS.map((t) => {
    const n = list.counts[t.value as 'all' | 'pending' | 'approved' | 'rejected'];
    return { value: t.value, label: n ? `${t.label} ${n}` : t.label };
  });
  const afterSave = React.useCallback((d: ExpenseDetail) => router.push(href(d.id)), [router, href]);
  const receive = useReceiveAfterSave(afterSave);
  const onSaved = React.useCallback(
    (d: ExpenseDetail) => {
      setCreating(false);
      receive.handle(d);
    },
    [receive]
  );

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Expenses</h1>
            <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold tabular-nums text-fg-muted 2xl:text-sm">{list.total}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <GoodsToReceive />
            <button type="button" onClick={() => setExporting(true)} className={secondaryBtn}>
              <Download className="h-3.5 w-3.5" aria-hidden />
              Export
            </button>
            <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add expense
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="w-full overflow-x-auto tt-scroll-hidden xl:w-auto">
            <SegmentedControl<ExpenseTab> options={tabs} value={f.tab} onChange={(tab) => list.update({ tab })} fitText />
          </div>
          <ExpenseSearch list={list} searchPlaceholder="Search number or merchant…" />
        </div>
        <ExpenseFilterControls list={list} scope="me" show={{ amount: false, flagged: false, physical: true, site: false, paymentMode: false }} />
      </div>

      <ExpenseListBody
        list={list}
        href={href}
        showSpender={false}
        cardsOnly
        audience="me"
        empty={{
          illustration: tabIllustration(f.tab, f.physical),
          title: 'No expenses yet',
          description: 'Cash you spend from a petty cash wallet is filed here, with its bill, for approval.',
          action: { label: 'Add expense', onClick: () => setCreating(true) },
        }}
      />

      <ExpenseFormDrawer mode="me" open={creating} onClose={() => setCreating(false)} onSaved={onSaved} />
      <ReceiveGoodsDialog {...receive.dialogProps} onReceived={list.refetch} />
      <ExportExpensesDialog open={exporting} onClose={() => setExporting(false)} scope="me" initial={f} />
    </div>
  );
}
