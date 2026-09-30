'use client';

import { useCallback, useState } from 'react';
import * as api from '../api/salaryRevisions.api';
import { showError, showSuccess } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';

export function useRevisionMutations(refetch: () => Promise<void>) {
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

  const run = useCallback(async (ids: number[], action: () => Promise<unknown>, message: string) => {
    setBusyIds(new Set(ids));
    try {
      await action();
      showSuccess(message);
      await refetch();
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    } finally {
      setBusyIds(new Set());
    }
  }, [refetch]);

  return {
    busyIds,
    submit: (ids: number[]) => run(ids, () => api.submitRevisions(ids), ids.length > 1 ? `${ids.length} revisions submitted` : 'Revision submitted'),
    approve: (ids: number[], note?: string) => run(ids, () => api.decideRevisions(ids, 'approve', note), ids.length > 1 ? `${ids.length} revisions approved` : 'Revision approved'),
    reject: (ids: number[], note?: string) => run(ids, () => api.decideRevisions(ids, 'reject', note), ids.length > 1 ? `${ids.length} revisions rejected` : 'Revision rejected'),
    cancel: (ids: number[]) => run(ids, () => api.cancelRevisions(ids), ids.length > 1 ? `${ids.length} revisions cancelled` : 'Revision cancelled'),
  };
}
