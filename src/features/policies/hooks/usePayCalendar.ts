'use client';

import { useCallback, useState } from 'react';
import * as policiesApi from '../api/policies.api';
import { toPayCalendarPeriods } from '../types/policies.mapper';
import type { PayCalendarPeriod } from '../types/policies.model';
import { messageOf } from '@/lib/api/errors';

/**
 * Twelve cycles forward for the policy's published payroll-cycle config —
 * computed by the backend (PreviewPayCalendar) so the dates an admin
 * checks here are the same ones payroll will actually run on.
 */
export function usePayCalendar(policyId: number) {
  const [periods, setPeriods] = useState<PayCalendarPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const dto = await policiesApi.previewPayCalendar(policyId);
      setPeriods(toPayCalendarPeriods(dto.periods));
    } catch (err) {
      setError(messageOf(err));
      setPeriods([]);
    } finally {
      setIsLoading(false);
    }
  }, [policyId]);

  return { periods, isLoading, error, load };
}
