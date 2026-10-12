'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/salarySlips.api';
import { toPayRun, toPayRuns } from '../types/salarySlips.mapper';
import type { PayRunDto } from '../types/salarySlips.dto';
import type { PayRun } from '../types/salarySlips.model';
import { MONTH_KEY, thisMonth } from '../utils/format';

export function useSalarySlipRuns() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const asked = params.get('month') || '';
  const month = MONTH_KEY.test(asked) ? asked : thisMonth();

  const [runs, setRuns] = useState<PayRun[]>([]);
  const [runId, setRunId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);

  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setError('');
    try {
      const dto = await api.listRuns(month);
      if (id !== request.current) return;
      const next = toPayRuns(dto.runs);
      setRuns(next);
      setRunId((current) => (current && next.some((r) => r.id === current) ? current : next[0]?.id ?? null));
    } catch (err) {
      if (id !== request.current) return;
      setRuns([]);
      setRunId(null);
      setError(messageOf(err));
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const setMonth = useCallback(
    (next: string) => {
      setRunId(null);
      router.replace(`${pathname}?month=${next}`, { scroll: false });
    },
    [pathname, router]
  );

  const replaceRun = useCallback((dto: PayRunDto) => {
    if (dto.id === null) return;
    const updated = toPayRun(dto as PayRunDto & { id: number });
    setRuns((list) => list.map((r) => (r.id === updated.id ? updated : r)));
  }, []);

  return {
    month,
    setMonth,
    runs,
    run: runs.find((r) => r.id === runId) ?? null,
    setRunId,
    loading,
    error,
    refetch: load,
    replaceRun,
  };
}
