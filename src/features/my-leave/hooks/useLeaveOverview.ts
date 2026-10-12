'use client';

import { useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/myLeave.api';
import { toOverview } from '../types/leave.mapper';
import type { Overview } from '../types/leave.model';

/** The employee's leave types, balances, rules and earned comp-off; read again whenever `reloadKey` changes. */
export function useLeaveOverview(reloadKey: number) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setRefreshing(true);
    api.getOverview(controller.signal)
      .then((dto) => { setData(toOverview(dto)); setError(null); loaded.current = true; })
      .catch((e) => { if (!controller.signal.aborted) setError(messageOf(e)); })
      .finally(() => { if (!controller.signal.aborted) setRefreshing(false); });
    return () => controller.abort();
  }, [reloadKey]);

  return { data, error, loading: !loaded.current && !error, refreshing };
}
