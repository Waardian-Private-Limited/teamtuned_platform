'use client';

import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Alert } from '@/components/ui/Alert';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/leave.api';
import type { Balance, BalanceCard, LeaveRequest } from '../types/leave';
import { BalanceCards } from './BalanceCards';
import { LedgerTable } from './LedgerTable';
import { RequestsList } from './RequestsList';
import { cx } from '@/theme/tokens';

interface Props {
  employee: { id: number; name: string } | null;
  canAdjust: boolean;
  canAdd: boolean;
  onClose: () => void;
  onAdjust: (types: { id: number; name: string }[], typeId: number | null) => void;
  onApply: () => void;
  onOpenRequest: (r: LeaveRequest) => void;
  refreshKey: number;
}

// An employee's leave card: balances, full ledger history, and their requests.
export function LeaveCardDrawer({ employee, canAdjust, canAdd, onClose, onAdjust, onApply, onOpenRequest, refreshKey }: Props) {
  const [card, setCard] = React.useState<BalanceCard | null>(null);
  const [requests, setRequests] = React.useState<LeaveRequest[]>([]);
  const [tab, setTab] = React.useState<'balances' | 'history' | 'requests'>('balances');
  const [typeId, setTypeId] = React.useState<number | null>(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!employee) return;
    setCard(null); setError(''); setTab('balances'); setTypeId(null);
    api.employeeBalances(employee.id).then(setCard).catch((e) => setError(messageOf(e)));
    api.listRequests({ employee_id: employee.id, pageSize: 20 }).then((r) => setRequests(r.requests)).catch(() => setRequests([]));
  }, [employee, refreshKey]);

  const types = (card?.balances ?? []).filter((b: Balance) => b.cycle).map((b) => ({ id: b.leave_type_id, name: b.name }));
  return (
    <Drawer open={Boolean(employee)} onClose={onClose} title="Leave card">
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-lg font-bold tracking-tight text-fg">{employee?.name}</p>
          <div className="flex gap-2">
            {canAdd && <button type="button" onClick={onApply} className="h-9 rounded-lg border border-line px-3 text-sm font-semibold text-fg hover:bg-bg-subtle">Add leave</button>}
            {canAdjust && <button type="button" onClick={() => onAdjust(types, typeId)} className="h-9 rounded-lg bg-[var(--tt-primary)] px-3 text-sm font-semibold text-[var(--tt-on-primary)]">Adjust balance</button>}
          </div>
        </div>
        <div className="flex gap-1 rounded-lg border border-line p-0.5 text-sm">
          {(['balances', 'history', 'requests'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={cx('flex-1 rounded-md px-3 py-1.5 font-semibold capitalize', tab === t ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'text-fg-muted hover:bg-bg-subtle')}>{t}</button>
          ))}
        </div>
        {error && <Alert message={error} tone="error" />}
        {!card && !error && <div className="h-40 animate-pulse rounded-lg bg-bg-subtle" />}
        {card && tab === 'balances' && <BalanceCards balances={card.balances} onPick={(b) => { setTypeId(b.leave_type_id); setTab('history'); }} />}
        {card && tab === 'history' && (
          <div className="space-y-3">
            <select value={typeId ?? ''} onChange={(e) => setTypeId(e.target.value ? Number(e.target.value) : null)} className="h-9 rounded-lg border border-line bg-surface px-2.5 text-sm text-fg">
              <option value="">All leave types</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <LedgerTable employeeId={employee!.id} typeId={typeId} />
          </div>
        )}
        {tab === 'requests' && (requests.length ? <div className="overflow-hidden rounded-lg border border-line"><RequestsList rows={requests} showEmployee={false} onOpen={onOpenRequest} /></div> : <p className="py-6 text-center text-sm text-fg-muted">No requests.</p>)}
      </div>
    </Drawer>
  );
}
