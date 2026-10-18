'use client';

import { useCallback, useState } from 'react';
import { showError, showSuccess } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/recruitment.api';
import { STAGE_LABELS } from '../constants/recruitment.constants';
import type { NamedRef, Stage } from '../types/recruitment.model';

export type ApplicationAction = 'stage' | 'reject' | 'reopen' | 'rating' | 'owner' | 'referrer' | 'note';

/**
 * Pipeline mutations shared by the board, the candidates list and the drawer.
 * Each resolves true/false; `onDone(applicationId)` fires after a success so
 * the caller can refresh what it shows.
 */
export function useApplicationActions(onDone?: (applicationId: number, action: ApplicationAction) => void) {
  const [busy, setBusy] = useState<ApplicationAction | null>(null);
  const [rejectError, setRejectError] = useState('');

  const run = useCallback(async (id: number, action: ApplicationAction, fn: () => Promise<unknown>, success?: string) => {
    setBusy(action);
    try {
      await fn();
      if (success) showSuccess(success);
      onDone?.(id, action);
      return true;
    } catch (err) {
      if (action === 'reject') setRejectError(messageOf(err));
      else showError(messageOf(err));
      return false;
    } finally {
      setBusy(null);
    }
  }, [onDone]);

  return {
    busy,
    rejectError,
    clearRejectError: () => setRejectError(''),
    moveStage: (id: number, stage: Stage) => run(id, 'stage', () => api.moveStage(id, stage), `Moved to ${STAGE_LABELS[stage]}`),
    reject: (id: number, reason: string, notify: boolean) => {
      setRejectError('');
      return run(id, 'reject', () => api.rejectApplication(id, reason, notify), 'Candidate rejected');
    },
    reopen: (id: number) => run(id, 'reopen', () => api.reopenApplication(id), 'Application reopened'),
    rate: (id: number, rating: number | null) => run(id, 'rating', () => api.updateApplication(id, { rating })),
    setOwner: (id: number, owner: NamedRef | null) => run(id, 'owner', () => api.updateApplication(id, { ownerEmployeeId: owner?.id ?? null }), 'Owner updated'),
    setReferrer: (id: number, referrer: NamedRef | null) => run(id, 'referrer', () => api.updateApplication(id, { referredByEmployeeId: referrer?.id ?? null }), 'Referrer updated'),
    addNote: (id: number, text: string) => run(id, 'note', () => api.addNote(id, text)),
  };
}
