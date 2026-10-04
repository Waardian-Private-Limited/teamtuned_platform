'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cx } from '@/theme/tokens';
import { usePermission } from '@/lib/hooks/usePermission';
import { RequestsTab } from './RequestsTab';
import { BalancesTab } from './BalancesTab';
import { CalendarTab } from './CalendarTab';
import { RequestDrawer } from './RequestDrawer';
import { LeaveCardDrawer } from './LeaveCardDrawer';
import { AdjustDialog } from './AdjustDialog';
import { ApplyLeaveDialog } from './ApplyLeaveDialog';
import * as api from '../api/leave.api';

const TABS = [['requests', 'Requests'], ['balances', 'Balances'], ['calendar', 'Calendar']] as const;
type Tab = (typeof TABS)[number][0];

// Everything HR does with leave in one place: decide requests, see and adjust balances, see who is off.
export function LeaveHubPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { can } = usePermission();
  const tab = (TABS.find(([k]) => k === params.get('tab'))?.[0] ?? 'requests') as Tab;
  const canApprove = can('LEAVE_APPROVE');
  const canEdit = can('LEAVE_EDIT');
  const canAdd = can('LEAVE_ADD') || canEdit;
  const canAdjust = can('LEAVE_ADJUST');

  const [refreshKey, setRefreshKey] = React.useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);
  const [requestId, setRequestId] = React.useState<number | null>(null);
  const [card, setCard] = React.useState<{ id: number; name: string } | null>(null);
  const [adjust, setAdjust] = React.useState<{ ids: number[]; label: string; types: { id: number; name: string }[]; typeId?: number | null } | null>(null);
  const [applyFor, setApplyFor] = React.useState<{ id: number; name: string } | null>(null);
  const [allTypes, setAllTypes] = React.useState<{ id: number; name: string }[]>([]);

  const setTab = (t: Tab) => router.replace(`?tab=${t}`);

  async function openBulk(ids: number[]) {
    // Bulk uses the leave types of the first selected employee's card (same policy in practice).
    const c = await api.employeeBalances(ids[0]);
    const types = c.balances.filter((b) => b.cycle).map((b) => ({ id: b.leave_type_id, name: b.name }));
    setAllTypes(types);
    setAdjust({ ids, label: `${ids.length} employees`, types });
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3 sm:p-3.5">
        <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Leave</h1>
        <div className="flex gap-1 rounded-lg border border-line p-0.5">
          {TABS.map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cx('rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors', tab === k ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'text-fg-muted hover:bg-bg-subtle')}>{label}</button>
          ))}
        </div>
      </div>

      {tab === 'requests' && <RequestsTab onOpen={setRequestId} refreshKey={refreshKey} />}
      {tab === 'balances' && <BalancesTab refreshKey={refreshKey} canAdjust={canAdjust} onOpen={setCard} onBulk={openBulk} />}
      {tab === 'calendar' && <CalendarTab refreshKey={refreshKey} />}

      <RequestDrawer id={requestId} mode="admin" canApprove={canApprove} canEdit={canEdit} onClose={() => setRequestId(null)} onChanged={refresh} />
      <LeaveCardDrawer
        employee={card} canAdjust={canAdjust} canAdd={canAdd} refreshKey={refreshKey} onClose={() => setCard(null)}
        onAdjust={(types, typeId) => card && setAdjust({ ids: [card.id], label: card.name, types, typeId })}
        onApply={() => card && setApplyFor(card)}
        onOpenRequest={(r) => setRequestId(r.id)}
      />
      <AdjustDialog open={Boolean(adjust)} onClose={() => setAdjust(null)} onDone={refresh} employeeIds={adjust?.ids ?? []} label={adjust?.label ?? ''} types={adjust?.types ?? allTypes} defaultTypeId={adjust?.typeId} />
      <ApplyLeaveDialog open={Boolean(applyFor)} employee={applyFor ?? undefined} onClose={() => setApplyFor(null)} onApplied={refresh} />
    </div>
  );
}
