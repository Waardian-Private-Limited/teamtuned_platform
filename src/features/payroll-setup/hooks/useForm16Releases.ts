'use client';

import { useCallback, useEffect, useState } from 'react';
import * as api from '../api/payrollSetup.api';
import { toForm16Release } from '../types/payroll-setup.mapper';
import type { Form16Release } from '../types/payroll-setup.model';
import { messageOf } from '../utils/asyncAction';

/**
 * Form 16 releases for one financial year. Until a company releases it, its employees
 * cannot download their own Form 16; payroll still can.
 */
export function useForm16Releases(financialYear: string) {
  const [releases, setReleases] = useState<Form16Release[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Key of the company being changed ('org' or its id), so only its button spins.
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const dto = await api.listForm16Releases(financialYear);
      setReleases((dto.releases || []).map(toForm16Release));
    } catch (err) {
      setError(messageOf(err));
      setReleases([]);
    } finally {
      setIsLoading(false);
    }
  }, [financialYear]);

  useEffect(() => {
    load();
  }, [load]);

  const setReleased = useCallback(async (company: number | null, released: boolean) => {
    setBusy(company === null ? 'org' : String(company));
    setError('');
    try {
      const dto = await api.setForm16Release(financialYear, company, released);
      setReleases((dto.releases || []).map(toForm16Release));
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(null);
    }
  }, [financialYear]);

  const releaseOf = useCallback(
    (company: number | null) => releases.find((r) => r.subOrganizationId === company) ?? null,
    [releases]
  );

  return { releases, isLoading, busy, error, releaseOf, setReleased, reload: load };
}
