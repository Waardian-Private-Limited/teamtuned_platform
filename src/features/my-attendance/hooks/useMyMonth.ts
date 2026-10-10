'use client';

import { useEffect, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { toMonth } from '@/features/detailed-attendance/types/detailed.mapper';
import type { Month } from '@/features/detailed-attendance/types/detailed.model';
import * as api from '../api/myAttendance.api';

/** The signed-in employee's month; keeps the old month on screen while the next one loads. */
export function useMyMonth(startMonth: string, reloadKey = 0) {
  const [month, setMonth] = useState(startMonth);
  const [data, setData] = useState<Month | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setMonth(startMonth); }, [startMonth]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api.getMyMonth(month, controller.signal)
      .then((dto) => { setData(toMonth(dto)); setError(null); })
      .catch((e) => { if (!controller.signal.aborted) setError(messageOf(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [month, reloadKey]);

  return { month, setMonth, data, loading: loading && !data, refreshing: loading, error };
}
