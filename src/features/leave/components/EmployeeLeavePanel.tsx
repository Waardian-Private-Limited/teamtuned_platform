'use client';

import React from 'react';
import { Alert } from '@/components/ui/Alert';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/leave.api';
import type { BalanceCard } from '../types/leave';
import { BalanceCards } from './BalanceCards';
import { LedgerTable } from './LedgerTable';

// Read-only leave card for one employee, shown inside the attendance screen.
export function EmployeeLeavePanel({ employeeId, employeeName }: { employeeId: number; employeeName: string }) {
  const [card, setCard] = React.useState<BalanceCard | null>(null);
  const [error, setError] = React.useState('');
  React.useEffect(() => { api.employeeBalances(employeeId).then(setCard).catch((e) => setError(messageOf(e))); }, [employeeId]);
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold tracking-tight text-fg">{employeeName} · Leave</h2>
      {error && <Alert message={error} tone="error" />}
      {card ? <BalanceCards balances={card.balances} /> : !error && <div className="h-32 animate-pulse rounded-xl bg-bg-subtle" />}
      <div><h3 className="mb-2 text-sm font-bold text-fg">History</h3><LedgerTable employeeId={employeeId} /></div>
    </div>
  );
}
