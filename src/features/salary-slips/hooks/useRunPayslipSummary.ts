'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api/salarySlips.api';
import type { PayRunDto } from '../types/salarySlips.dto';
import { toRunPayslipSummary } from '../types/salarySlips.mapper';
import type { RunPayslipSummary } from '../types/salarySlips.model';

export function useRunPayslipSummary(runId: number | null, onRun: (dto: PayRunDto) => void) {
  const [summary, setSummary] = useState<RunPayslipSummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const request = useRef(0);
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;

  const load = useCallback(async () => {
    const id = ++request.current;
    if (!runId) {
      setSummary(null);
      setLoaded(true);
      return;
    }
    try {
      const dto = await api.getRun(runId);
      if (id !== request.current) return;
      setSummary(toRunPayslipSummary(dto));
      onRunRef.current(dto);
    } catch {
      if (id === request.current) setSummary(null);
    } finally {
      if (id === request.current) setLoaded(true);
    }
  }, [runId]);

  useEffect(() => {
    setSummary(null);
    setLoaded(false);
    load();
  }, [load]);

  return { summary, loaded, refetch: load };
}
