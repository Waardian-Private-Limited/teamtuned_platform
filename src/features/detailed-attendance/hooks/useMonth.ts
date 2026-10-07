'use client';

import { useCallback, useEffect, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/detailedAttendance.api';
import { toMonth } from '../types/detailed.mapper';
import type { Month } from '../types/detailed.model';

/** One employee's month; moves between months and keeps the old one on screen while the next loads. */
export function useMonth(employeeId: number | null, startMonth: string, reloadKey = 0) {
  const [month, setMonth] = useState(startMonth);
  const [data, setData] = useState<Month | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => { setMonth(startMonth); setData(null); }, [employeeId, startMonth]);

  useEffect(() => {
    if (employeeId === null) return undefined;
    const controller = new AbortController();
    setLoading(true);
    api.getMonth(employeeId, month, controller.signal)
      .then((dto) => { setData(toMonth(dto)); setError(null); })
      .catch((e) => { if (!controller.signal.aborted) setError(messageOf(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [employeeId, month, nonce, reloadKey]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { month, setMonth, data, loading: loading && !data, refreshing: loading, error, reload };
}
