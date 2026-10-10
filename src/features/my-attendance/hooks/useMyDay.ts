'use client';

import { useEffect, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { toDay } from '@/features/detailed-attendance/types/detailed.mapper';
import type { DayDetail } from '@/features/detailed-attendance/types/detailed.model';
import * as api from '../api/myAttendance.api';

export function useMyDay(date: string | null, reloadKey = 0) {
  const [data, setData] = useState<DayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setData(null); setLoading(true); }, [date]);

  useEffect(() => {
    if (!date) return undefined;
    const controller = new AbortController();
    api.getMyDay(date, controller.signal)
      .then((dto) => { setData(toDay(dto)); setError(null); })
      .catch((e) => { if (!controller.signal.aborted) setError(messageOf(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date, reloadKey]);

  return { data, loading, error };
}
