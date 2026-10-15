'use client';

import { useCallback, useState } from 'react';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/reimbursement.api';
import type { PayRequestDto } from '../types/reimbursement.dto';
import type { PayoutMode } from '../types/reimbursement.model';
import { splitError } from '../utils/errors';

export type ClaimAction = 'pay' | 'payout' | 'cancel' | 'withdraw';

export interface ActionError {
  fields: Record<string, string>;
  form: string;
}

/** Runs one mutation with busy/error state, a success toast and `onDone`. Shared by claim and wallet screens. */
export function useMutation(onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);

  const run = useCallback(
    async (work: () => Promise<unknown>, success: string) => {
      setBusy(true);
      setError(null);
      try {
        await work();
        showSuccess(success);
        onDone();
        return true;
      } catch (err) {
        setError(splitError(err));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [onDone]
  );

  return { busy, error, run, clearError: useCallback(() => setError(null), []) };
}

export function useClaimActions(claimId: number, onDone: () => void) {
  const m = useMutation(onDone);
  return {
    busy: m.busy,
    error: m.error,
    clearError: m.clearError,
    pay: (body: PayRequestDto) => m.run(() => api.payClaim(claimId, body), 'Expense marked as paid'),
    setPayout: (mode: PayoutMode) => m.run(() => api.setPayoutMode(claimId, mode), mode === 'payroll' ? 'It will be paid with payroll' : 'It will be paid by Accounts'),
    cancel: (reason: string) => m.run(() => api.cancelClaim(claimId, reason), 'Expense cancelled'),
    withdraw: (isDraft: boolean) => m.run(() => api.cancelMyClaim(claimId), isDraft ? 'Draft deleted' : 'Expense withdrawn'),
  };
}
