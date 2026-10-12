'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf, statusOf } from '@/lib/api/errors';
import * as api from '../api/salaryAdvance.api';
import { toAdvanceDetail } from '../types/salaryAdvance.mapper';
import type { AdvanceDetail } from '../types/salaryAdvance.model';

export function useAdvanceDetail(id: number | null, scope: 'hr' | 'me' = 'hr') {
  const [detail, setDetail] = useState<AdvanceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const request = useRef(0);

  const load = useCallback(async () => {
    if (!id) {
      setDetail(null);
      return;
    }
    const rid = ++request.current;
    setError('');
    setNotFound(false);
    try {
      const dto = scope === 'me' ? await api.getMyAdvance(id) : await api.getAdvance(id);
      if (rid === request.current) setDetail(toAdvanceDetail(dto));
    } catch (err) {
      if (rid !== request.current) return;
      if (statusOf(err) === 404) setNotFound(true);
      setError(messageOf(err));
    } finally {
      if (rid === request.current) setIsLoading(false);
    }
  }, [id, scope]);

  useEffect(() => {
    setIsLoading(Boolean(id));
    setDetail(null);
    load();
  }, [load, id]);

  return { detail, isLoading, error, notFound, refetch: load };
}
