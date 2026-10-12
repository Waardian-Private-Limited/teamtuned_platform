'use client';

import { useCallback, useState } from 'react';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/salaryAdvance.api';
import type { DisburseRequestDto } from '../types/salaryAdvance.dto';

export type AdvanceAction = 'disburse' | 'skip' | 'pause' | 'reshape' | 'repay' | 'waive' | 'cancel';

export interface ActionError {
  message: string;
  field: string | null;
}

export function useAdvanceActions(advanceId: number | null, onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);

  const run = useCallback(
    async (work: () => Promise<unknown>, success: string) => {
      if (!advanceId) return false;
      setBusy(true);
      setError(null);
      try {
        await work();
        showSuccess(success);
        onDone();
        return true;
      } catch (err) {
        const field = err instanceof ApiError ? ((err.data as { field?: string } | null)?.field ?? null) : null;
        setError({ message: messageOf(err), field });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [advanceId, onDone]
  );

  const id = advanceId ?? 0;

  return {
    busy,
    error,
    clearError: useCallback(() => setError(null), []),
    disburse: (body: DisburseRequestDto) => run(() => api.disburseAdvance(id, body), 'Advance marked as paid out'),
    skip: (monthKey: string, mode: 'push' | 'merge') => run(() => api.skipMonth(id, { month_key: monthKey, mode }), 'Month skipped'),
    pause: (untilMonth: string) => run(() => api.pauseUntil(id, untilMonth), 'Recovery paused'),
    reshape: (body: { installment_amount?: number; installments?: number; start_month?: string }) => run(() => api.reshape(id, body), 'Schedule redesigned'),
    repay: (amount: number, reference: string, paidOn: string) => run(() => api.recordRepayment(id, { amount, reference, paid_on: paidOn }), 'Repayment recorded'),
    waive: (reason: string, writeOff: boolean) => run(() => api.waiveAdvance(id, { reason, write_off: writeOff }), writeOff ? 'Balance written off' : 'Balance waived'),
    cancel: (reason: string) => run(() => api.cancelAdvance(id, reason), 'Advance cancelled'),
    cancelMine: () => run(() => api.cancelMyAdvance(id), 'Request cancelled'),
  };
}
