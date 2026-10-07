'use client';

import { useCallback, useEffect, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/detailedAttendance.api';
import { toDay } from '../types/detailed.mapper';
import type { DayDetail } from '../types/detailed.model';

export function useDay(employeeId: number | null, date: string | null, reloadKey = 0) {
  const [data, setData] = useState<DayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => { setData(null); setLoading(true); }, [employeeId, date]);

  useEffect(() => {
    if (employeeId === null || !date) return undefined;
    const controller = new AbortController();
    api.getDay(employeeId, date, controller.signal)
      .then((dto) => { setData(toDay(dto)); setError(null); })
      .catch((e) => { if (!controller.signal.aborted) setError(messageOf(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [employeeId, date, nonce, reloadKey]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload };
}
