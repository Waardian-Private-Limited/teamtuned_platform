'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/recruitment.api';
import { toApplicationDetail } from '../types/recruitment.mapper';
import type { ApplicationDetail } from '../types/recruitment.model';

/** GET /applications/:id for the candidate drawer. `reload()` keeps the current data on screen while it refetches. */
export function useApplicationDetail(applicationId: number | null) {
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);

  const load = useCallback(async (keep: boolean) => {
    if (!applicationId) return;
    const mine = ++seq.current;
    if (!keep) { setDetail(null); setIsLoading(true); }
    setError('');
    try {
      const dto = await api.getApplication(applicationId);
      if (mine === seq.current) setDetail(toApplicationDetail(dto));
    } catch (err) {
      if (mine === seq.current) setError(messageOf(err));
    } finally {
      if (mine === seq.current) setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    if (applicationId) load(false);
    else { seq.current += 1; setDetail(null); setError(''); }
  }, [applicationId, load]);

  const reload = useCallback(() => load(true), [load]);

  return { detail, setDetail, isLoading, error, reload };
}
