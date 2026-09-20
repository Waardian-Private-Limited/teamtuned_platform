'use client';

import { useCallback, useEffect, useState } from 'react';
import * as api from '../api/payrollSetup.api';
import type { TdsReadinessDto } from '../types/payroll-setup.dto';
import { messageOf } from '../utils/asyncAction';

/**
 * Status of each step in the TDS setup sequence.
 *
 * Re-fetched after any step is completed, so finishing one step updates the badges
 * on the others (recording the first challan unblocks Form 16, for example).
 */
export function useTdsReadiness(financialYear: string) {
  const [readiness, setReadiness] = useState<TdsReadinessDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const dto = await api.getTdsReadiness(financialYear);
      setReadiness(dto.readiness);
    } catch (err) {
      setError(messageOf(err));
      setReadiness(null);
    } finally {
      setIsLoading(false);
    }
  }, [financialYear]);

  useEffect(() => {
    load();
  }, [load]);

  return { readiness, isLoading, error, reload: load };
}
