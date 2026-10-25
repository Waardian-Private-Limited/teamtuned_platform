'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Download, FileClock, Plus, Check } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { EXPENSES_ACCESS, EXPORT_ACCESS, EXPENSE_TABS, tabIllustration, INWARD_ACTIONS, PC } from '../constants/petty-cash.constants';
import { useExpenseList } from '../hooks/useExpenseList';
import { usePettyCashAccess } from '../hooks/usePettyCashAccess';
import { usePettyCashBasePath } from '../hooks/usePettyCashBasePath';
import { useRowSelection } from '../hooks/useRowSelection';
import type { ExpenseDetail, ExpenseTab } from '../types/petty-cash.model';
import { money } from '../utils/format';
import { BulkInwardDialog } from './components/BulkInwardDialog';
import { ExpenseFilterControls, ExpenseSearch } from './components/ExpenseFilters';
import { ExpenseFormDrawer } from './components/ExpenseFormDrawer';
import { GoodsToReceive } from './components/GoodsToReceive';
import { ReceiveGoodsDialog } from './components/ReceiveGoodsDialog';
import { useReceiveAfterSave } from '../hooks/useReceiveAfterSave';
import { ExpenseListBody, SelectionBar } from './components/ExpenseListBody';
import { ExportExpensesDialog } from './components/ExportDialogs';
import { Gate, primaryBtn, secondaryBtn } from './components/Primitives';

const EMPTY: Record<ExpenseTab, { title: string; description: string }> = {
  pending: { title: 'Nothing waiting for approval', description: 'Submitted expenses appear here until they are decided in Approvals.' },
  approved: { title: 'Nothing approved yet', description: 'Approved expenses, already taken from their wallets, appear here.' },
  rejected: { title: 'Nothing rejected', description: 'Rejected expenses are kept here with the reason.' },
  cancelled: { title: 'Nothing cancelled', description: 'Withdrawn and cancelled expenses are kept here.' },
  all: { title: 'No expenses yet', description: 'Custodians and site members file expenses from their app or the web. Admins can also enter one for an employee.' },
};

export function ExpensesPage() {
  const { enabled, canAny } = usePettyCashAccess();
  return (
    <Gate enabled={enabled} allowed={canAny(EXPENSES_ACCESS)} what="petty cash expenses">
      <Expenses />
    </Gate>
  );
}

function Expenses() {
  const router = useRouter();
  const base = usePettyCashBasePath();
  const { can, canAny } = usePettyCashAccess();
  const canInward = canAny(INWARD_ACTIONS);
  const canExport = canAny(EXPORT_ACCESS);
  const canEnter = can(PC.ADMIN);
  const list = useExpenseList('hr');
  const { selection, ids, size, reset } = useRowSelection();
  const [creating, setCreating] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [receiving, setReceiving] = React.useState(false);
  const numbers = React.useRef(new Map<number, string>());
  const f = list.filters;
  const href = React.useCallback((id: number) => `${base}/expenses/${id}`, [base]);
  const tabs = EXPENSE_TABS.map((t) => ({ value: t.value, label: list.counts[t.value as 'all' | 'pending' | 'approved' | 'rejected'] ? `${t.label} ${list.counts[t.value as 'all' | 'pending' | 'approved' | 'rejected']}` : t.label }));

  // A new filter is a new list: drop the checked rows.
  React.useEffect(() => reset(), [f, reset]);
  React.useEffect(() => {
    list.rows.forEach((r) => numbers.current.set(r.id, r.number));
  }, [list.rows]);

  const afterSave = React.useCallback((d: ExpenseDetail) => router.push(href(d.id)), [router, href]);
  const receive = useReceiveAfterSave(afterSave);
  const onSaved = React.useCallback(
    (d: ExpenseDetail) => {
      setCreating(false);
      receive.handle(d);
    },
    [receive]
  );
  const paperPending = list.counts.paperPending;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Petty cash expenses</h1>
            <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold tabular-nums text-fg-muted 2xl:text-sm">{list.total}</span>
            {list.amount > 0 && <span className="hidden text-xs font-semibold tabular-nums text-fg-muted sm:inline">{money(list.amount)}</span>}
            {(paperPending > 0 || f.physical === 'pending') && (
              <button
                type="button"
                aria-pressed={f.physical === 'pending'}
                onClick={() => list.update(f.physical === 'pending' ? { physical: null } : { physical: 'pending', tab: 'all' })}
                className={cx(
                  'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold transition-colors sm:text-xs',
                  f.physical === 'pending' ? 'border-fg bg-fg text-[var(--tt-on-primary)]' : 'border-dashed border-fg/60 bg-surface text-fg hover:bg-bg-subtle'
                )}
              >
                <FileClock className="h-3.5 w-3.5" aria-hidden />
                Paper bills to receive <span className="tabular-nums">{paperPending}</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SubOrgFilter value={f.subOrgId} onChange={(subOrgId) => list.update({ subOrgId })} allLabel="All companies" />
            <GoodsToReceive />
            {canExport && (
              <button type="button" onClick={() => setExporting(true)} className={secondaryBtn}>
                <Download className="h-3.5 w-3.5" aria-hidden />
                Export
              </button>
            )}
            {canEnter && (
              <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                <span className="sm:hidden">New</span>
                <span className="hidden sm:inline">New expense for employee</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="w-full overflow-x-auto tt-scroll-hidden xl:w-auto">
            <SegmentedControl<ExpenseTab> options={tabs} value={f.tab} onChange={(tab) => list.update({ tab })} fitText />
          </div>
          <ExpenseSearch list={list} />
        </div>
        <ExpenseFilterControls list={list} scope="hr" />
      </div>

      <ExpenseListBody
        list={list}
        href={href}
        selection={canInward || canExport ? selection : undefined}
        empty={{
          illustration: tabIllustration(f.tab, f.physical),
          ...EMPTY[f.tab],
          action: canEnter && (f.tab === 'all' || f.tab === 'pending') ? { label: 'New expense for employee', onClick: () => setCreating(true) } : undefined,
        }}
      >
        <SelectionBar count={size} onClear={reset}>
          {canInward && (
            <button type="button" onClick={() => setReceiving(true)} className={primaryBtn}>
              <Check className="h-3.5 w-3.5" aria-hidden />
              Receive paper bills
            </button>
          )}
          {canExport && (
            <button type="button" onClick={() => setExporting(true)} className={secondaryBtn}>
              <Download className="h-3.5 w-3.5" aria-hidden />
              Export selected
            </button>
          )}
        </SelectionBar>
      </ExpenseListBody>

      {canEnter && <ExpenseFormDrawer mode="hr" open={creating} onClose={() => setCreating(false)} onSaved={onSaved} />}
      <ReceiveGoodsDialog {...receive.dialogProps} onReceived={list.refetch} />
      {canExport && <ExportExpensesDialog open={exporting} onClose={() => setExporting(false)} scope="hr" initial={f} ids={ids} />}
      {canInward && (
        <BulkInwardDialog
          kind="paper"
          open={receiving}
          ids={ids}
          label={(id) => numbers.current.get(id) ?? `#${id}`}
          onClose={() => setReceiving(false)}
          onDone={() => {
            reset();
            list.refetch();
          }}
        />
      )}
    </div>
  );
}
