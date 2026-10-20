'use client';

import { useCallback, useEffect, useState } from 'react';
import * as api from '../api/payrollSetup.api';
import { toDebitVersions } from '../types/payroll-setup.mapper';
import type { DebitVersionHistory } from '../types/payroll-setup.model';
import { messageOf } from '../utils/asyncAction';
import { showError, showSuccess } from '@/lib/toast';

/**
 * A rule's dated versions, newest first, and the date an edit applies from by default
 * (the first day no finalized payroll has frozen). Pass null to stay idle.
 */
export function useDebitVersions(ruleId: number | null) {
  const [history, setHistory] = useState<DebitVersionHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!ruleId) return;
    setIsLoading(true);
    setError('');
    try {
      setHistory(toDebitVersions(await api.listDebitVersions(ruleId)));
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, [ruleId]);

  useEffect(() => {
    setHistory(null);
    setError('');
    if (ruleId) load();
  }, [ruleId, load]);

  const remove = useCallback(async (versionId: number) => {
    if (!ruleId || removingId) return false;
    setRemovingId(versionId);
    try {
      await api.deleteDebitVersion(ruleId, versionId);
      await load();
      showSuccess('Change removed');
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    } finally {
      setRemovingId(null);
    }
  }, [ruleId, removingId, load]);

  return {
    history,
    defaultEffectiveFrom: history?.defaultEffectiveFrom ?? '',
    isLoading,
    error,
    removingId,
    remove,
    reload: load,
  };
}
