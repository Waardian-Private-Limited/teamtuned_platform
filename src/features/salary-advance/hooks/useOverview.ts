'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/salaryAdvance.api';
import { toOverview } from '../types/salaryAdvance.mapper';
import type { Overview } from '../types/salaryAdvance.model';
import { thisMonth } from '../utils/format';

export function useOverview() {
  const [month, setMonth] = useState(thisMonth());
  const [subOrgId, setSubOrgId] = useState<number | null>(null);
  const [data, setData] = useState<Overview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);

  const load = useCallback(async () => {
    const id = ++request.current;
    setIsFetching(true);
    setError('');
    try {
      const dto = await api.getOverview({ subOrgId, month });
      if (id === request.current) setData(toOverview(dto));
    } catch (err) {
      if (id === request.current) setError(messageOf(err));
    } finally {
      if (id === request.current) {
        setIsFetching(false);
        setIsLoading(false);
      }
    }
  }, [subOrgId, month]);

  useEffect(() => {
    load();
  }, [load]);

  return { month, setMonth, subOrgId, setSubOrgId, data, isLoading, isFetching, error, refetch: load };
}
