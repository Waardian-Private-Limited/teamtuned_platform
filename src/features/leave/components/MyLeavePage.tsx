'use client';

import React from 'react';
import { Alert } from '@/components/ui/Alert';
import { MyHolidays } from '@/features/holidays/components/MyHolidays';
import { messageOf } from '@/lib/api/errors';
import { cx } from '@/theme/tokens';
import * as api from '../api/leave.api';
import type { BalanceCard, LeaveRequest } from '../types/leave';
import { ApplyLeaveDialog } from './ApplyLeaveDialog';
import { BalanceCards } from './BalanceCards';
import { LedgerTable } from './LedgerTable';
import { LeaveEmptyState } from './LeaveEmptyState';
import { RequestDrawer } from './RequestDrawer';
import { RequestsList } from './RequestsList';

const TABS = [['requests', 'My requests'], ['history', 'History'], ['holidays', 'Holidays']] as const;

// An employee's own leave: balances up top, apply with a live preview, requests, history, holidays.
export function MyLeavePage() {
  const [card, setCard] = React.useState<BalanceCard | null>(null);
  const [requests, setRequests] = React.useState<LeaveRequest[] | null>(null);
  const [tab, setTab] = React.useState<(typeof TABS)[number][0]>('requests');
  const [applyOpen, setApplyOpen] = React.useState(false);
  const [openId, setOpenId] = React.useState<number | null>(null);
  const [error, setError] = React.useState('');
  const [key, setKey] = React.useState(0);

  React.useEffect(() => {
    api.myBalances().then(setCard).catch((e) => setError(messageOf(e)));
    api.myRequests({ pageSize: 50 }).then((r) => setRequests(r.requests)).catch((e) => setError(messageOf(e)));
  }, [key]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3.5">
        <h1 className="text-lg font-bold tracking-tight text-fg">My leave</h1>
        <button type="button" onClick={() => setApplyOpen(true)} className="h-9 rounded-lg bg-[var(--tt-primary)] px-4 text-sm font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)]">Apply for leave</button>
      </div>
      {error && <Alert message={error} tone="error" />}
      {card ? <BalanceCards balances={card.balances} /> : <div className="h-32 animate-pulse rounded-xl bg-bg-subtle" />}

      <div className="flex gap-1 self-start rounded-lg border border-line p-0.5">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cx('rounded-md px-3.5 py-1.5 text-sm font-semibold', tab === k ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'text-fg-muted hover:bg-bg-subtle')}>{label}</button>
        ))}
      </div>

      <div className="min-h-64 overflow-hidden rounded-xl border border-line bg-surface">
        {tab === 'requests' && (requests === null ? <div className="h-32 animate-pulse bg-bg-subtle/60" />
          : requests.length === 0 ? <LeaveEmptyState title="No leave yet" text="Your requests will show up here." />
          : <RequestsList rows={requests} showEmployee={false} onOpen={(r) => setOpenId(r.id)} />)}
        {tab === 'history' && <div className="p-3"><LedgerTable /></div>}
        {tab === 'holidays' && <div className="p-3"><MyHolidays compact /></div>}
      </div>

      <ApplyLeaveDialog open={applyOpen} onClose={() => setApplyOpen(false)} onApplied={() => setKey((k) => k + 1)} />
      <RequestDrawer id={openId} mode="self" onClose={() => setOpenId(null)} onChanged={() => setKey((k) => k + 1)} />
    </div>
  );
}
