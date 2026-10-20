'use client';

import { useEffect, useState } from 'react';
import * as api from '@/features/payroll-setup/api/payrollSetup.api';
import type { CompanyOption } from '@/features/payroll-setup/components/tds/tdsShared';

export interface TdsCounters {
  proofsWaiting: number | null;
  partAMissing: number | null;
}

/**
 * The two overview counters that need their own reads: proofs waiting for review this
 * year, and Part A missing for last year across every company the user can act for.
 * A failed read leaves its counter at null rather than showing a wrong 0.
 */
export function useTdsCounters(financialYear: string, lastYear: string, companies: CompanyOption[]) {
  const [counters, setCounters] = useState<TdsCounters>({ proofsWaiting: null, partAMissing: null });
  const companyKey = companies.map((c) => c.value ?? 'org').join(',');

  useEffect(() => {
    let cancelled = false;
    api
      .listProofQueue(financialYear)
      .then((dto) => {
        const waiting = (dto.employees || []).reduce((sum, e) => sum + Number(e.pending || 0), 0);
        if (!cancelled) setCounters((prev) => ({ ...prev, proofsWaiting: waiting }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [financialYear]);

  useEffect(() => {
    if (!companies.length) return;
    let cancelled = false;
    Promise.all(companies.map((c) => api.listPartA(lastYear, c.value)))
      .then((lists) => {
        const missing = lists.reduce((sum, dto) => sum + Number(dto.missing || 0), 0);
        if (!cancelled) setCounters((prev) => ({ ...prev, partAMissing: missing }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // companyKey stands in for the companies array, which is rebuilt each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastYear, companyKey]);

  return counters;
}
