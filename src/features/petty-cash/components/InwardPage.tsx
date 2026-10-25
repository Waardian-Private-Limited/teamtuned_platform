'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Download, PackageCheck, Undo2 } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { ILLUSTRATIONS, INWARD_ACCESS, INWARD_ACTIONS, INWARD_TABS, PAPER_TABS } from '../constants/petty-cash.constants';
import { useExpenseList } from '../hooks/useExpenseList';
import { usePettyCashAccess } from '../hooks/usePettyCashAccess';
import { usePettyCashBasePath } from '../hooks/usePettyCashBasePath';
import { useRowSelection } from '../hooks/useRowSelection';
import type { InwardTab, PaperTab } from '../types/petty-cash.model';
import { BulkInwardDialog } from './components/BulkInwardDialog';
import { ExpenseFilterControls, ExpenseSearch } from './components/ExpenseFilters';
import { ExpenseListBody, SelectionBar } from './components/ExpenseListBody';
import { ExportExpensesDialog, ExportInwardDialog } from './components/ExportDialogs';
import { Gate, primaryBtn, secondaryBtn } from './components/Primitives';

type View = 'goods' | 'paper';

const VIEWS: ReadonlyArray<{ value: View; label: string }> = [
  { value: 'goods', label: 'Goods' },
  { value: 'paper', label: 'Paper bills' },
];

export function InwardPage() {
  const { enabled, canAny } = usePettyCashAccess();
  return (
    <Gate enabled={enabled} allowed={canAny(INWARD_ACCESS)} what="the inward register">
      <Inward />
    </Gate>
  );
}

function Inward() {
  const params = useSearchParams();
  const [view, setView] = React.useState<View>(params.get('view') === 'paper' ? 'paper' : 'goods');
  const switcher = (
    <div className="w-full overflow-x-auto tt-scroll-hidden sm:w-auto">
      <SegmentedControl<View> options={[...VIEWS]} value={view} onChange={setView} fitText />
    </div>
  );
  return view === 'goods' ? <GoodsRegister key="goods" switcher={switcher} /> : <PaperBills key="paper" switcher={switcher} />;
}

/** Goods bought on the bill and received at the site: waiting, partly received, received. */
function GoodsRegister({ switcher }: { switcher: React.ReactNode }) {
  const base = usePettyCashBasePath();
  const { canAny } = usePettyCashAccess();
  const canReceive = canAny(INWARD_ACTIONS);
  const list = useExpenseList('inward');
  const { selection, ids, size, reset } = useRowSelection();
  const [receiving, setReceiving] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const numbers = React.useRef(new Map<number, string>());
  const f = list.filters;
  const tab: InwardTab = f.inward === 'received' ? 'received' : f.inward === 'partial' ? 'partial' : 'waiting';
  const href = React.useCallback((id: number) => `${base}/expenses/${id}`, [base]);
  const tabs = INWARD_TABS.map((t) => {
    const n = t.value === 'waiting' ? list.counts.inwardWaiting : t.value === 'partial' ? list.counts.inwardPartial : list.counts.inwardReceived;
    return { value: t.value, label: n ? `${t.label} ${n}` : t.label };
  });

  React.useEffect(() => reset(), [f, reset]);
  React.useEffect(() => {
    list.rows.forEach((r) => numbers.current.set(r.id, r.number));
  }, [list.rows]);

  const empty = {
    waiting: { title: 'No goods waiting', description: 'Expenses whose goods have not arrived yet appear here.' },
    partial: { title: 'Nothing partly received', description: 'Expenses with only some of their goods received appear here until the rest arrives.' },
    received: { title: 'Nothing received yet', description: 'Goods you receive are kept here with their inward numbers.' },
  }[tab];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Inward register</h1>
            <p className="text-xs text-fg-muted sm:text-sm">Goods bought on petty cash bills, received at the site with quantities. Every delivery gets its own inward number.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {switcher}
            <SubOrgFilter value={f.subOrgId} onChange={(subOrgId) => list.update({ subOrgId })} allLabel="All companies" />
            <button type="button" onClick={() => setExporting(true)} className={secondaryBtn}>
              <Download className="h-3.5 w-3.5" aria-hidden />
              Export register
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="w-full overflow-x-auto tt-scroll-hidden xl:w-auto">
            <SegmentedControl<InwardTab> options={tabs} value={tab} onChange={(v) => list.update({ inward: v })} fitText />
          </div>
          <ExpenseSearch list={list} searchPlaceholder="Search number, seller or name…" />
        </div>
        <ExpenseFilterControls list={list} scope="hr" show={{ site: true, physical: false, amount: false, flagged: false, paymentMode: false }} />
      </div>

      <ExpenseListBody
        list={list}
        href={href}
        showInward
        sortable={false}
        selection={canReceive && tab !== 'received' ? selection : undefined}
        empty={{ illustration: tab === 'received' ? ILLUSTRATIONS.inward : ILLUSTRATIONS.inwardWaiting, ...empty }}
      >
        <SelectionBar count={size} onClear={reset}>
          <button type="button" onClick={() => setReceiving(true)} className={primaryBtn}>
            <PackageCheck className="h-3.5 w-3.5" aria-hidden />
            Receive all goods
          </button>
        </SelectionBar>
      </ExpenseListBody>

      {canReceive && (
        <BulkInwardDialog
          kind="goods"
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
      <ExportInwardDialog open={exporting} onClose={() => setExporting(false)} initial={f} />
    </div>
  );
}

/** The original paper bills: one tick per expense, no number. */
function PaperBills({ switcher }: { switcher: React.ReactNode }) {
  const base = usePettyCashBasePath();
  const { canAny } = usePettyCashAccess();
  const canReceive = canAny(INWARD_ACTIONS);
  const list = useExpenseList('hr', 'all', { initial: { physical: 'pending' }, viewKey: 'physical' });
  const { selection, ids, size, reset } = useRowSelection();
  const [receiving, setReceiving] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const numbers = React.useRef(new Map<number, string>());
  const f = list.filters;
  const tab: PaperTab = f.physical === 'received' ? 'received' : 'pending';
  const href = React.useCallback((id: number) => `${base}/expenses/${id}`, [base]);
  const tabs = PAPER_TABS.map((t) => {
    const n = t.value === 'pending' ? list.counts.paperPending : list.counts.paperReceived;
    return { value: t.value, label: n ? `${t.label} ${n}` : t.label };
  });

  React.useEffect(() => reset(), [f, reset]);
  React.useEffect(() => {
    list.rows.forEach((r) => numbers.current.set(r.id, r.number));
  }, [list.rows]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Inward register</h1>
            <p className="text-xs text-fg-muted sm:text-sm">Original paper bills of petty cash expenses. Tick a bill when it is in hand. Paper bills have no inward number.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {switcher}
            <SubOrgFilter value={f.subOrgId} onChange={(subOrgId) => list.update({ subOrgId })} allLabel="All companies" />
            <button type="button" onClick={() => setExporting(true)} className={secondaryBtn}>
              <Download className="h-3.5 w-3.5" aria-hidden />
              Export bills
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="w-full overflow-x-auto tt-scroll-hidden xl:w-auto">
            <SegmentedControl<PaperTab> options={tabs} value={tab} onChange={(v) => list.update({ physical: v })} fitText />
          </div>
          <ExpenseSearch list={list} searchPlaceholder="Search number, seller or name…" />
        </div>
        <ExpenseFilterControls list={list} scope="hr" show={{ site: true, physical: false, amount: false, flagged: false, paymentMode: false }} />
      </div>

      <ExpenseListBody
        list={list}
        href={href}
        sortable={false}
        selection={canReceive ? selection : undefined}
        empty={{
          illustration: tab === 'pending' ? ILLUSTRATIONS.inwardWaiting : ILLUSTRATIONS.inward,
          title: tab === 'pending' ? 'No paper bills waiting' : 'No paper bills received yet',
          description: tab === 'pending' ? 'Expenses whose paper bill has not been handed in appear here.' : 'Paper bills you tick as received are kept here.',
        }}
      >
        <SelectionBar count={size} onClear={reset}>
          {tab === 'pending' ? (
            <button type="button" onClick={() => setReceiving(true)} className={primaryBtn}>
              <Check className="h-3.5 w-3.5" aria-hidden />
              Mark received
            </button>
          ) : (
            <button type="button" onClick={() => setReceiving(true)} className={secondaryBtn}>
              <Undo2 className="h-3.5 w-3.5" aria-hidden />
              Set back to not received
            </button>
          )}
        </SelectionBar>
      </ExpenseListBody>

      {canReceive && (
        <BulkInwardDialog
          kind="paper"
          open={receiving}
          undo={tab === 'received'}
          ids={ids}
          label={(id) => numbers.current.get(id) ?? `#${id}`}
          onClose={() => setReceiving(false)}
          onDone={() => {
            reset();
            list.refetch();
          }}
        />
      )}
      <ExportExpensesDialog open={exporting} onClose={() => setExporting(false)} scope="hr" initial={f} />
    </div>
  );
}
