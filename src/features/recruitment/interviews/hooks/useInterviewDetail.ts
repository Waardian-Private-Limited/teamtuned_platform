'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf, statusOf } from '@/lib/api/errors';
import * as api from '../api/interviews.api';
import type { InterviewDetailDto } from '../types/interviews.dto';

/** One interview (GET /interviews/:id) with reload; `notFound` when the server hides it from the viewer. */
export function useInterviewDetail(interviewId: number) {
  const [detail, setDetail] = useState<InterviewDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const d = await api.getInterview(interviewId);
      if (mine === seq.current) setDetail(d);
    } catch (err) {
      if (mine !== seq.current) return;
      const status = statusOf(err);
      if (status === 404 || status === 403) setNotFound(true);
      else setError(messageOf(err));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [interviewId]);

  useEffect(() => {
    if (!Number.isFinite(interviewId) || interviewId <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    load();
  }, [interviewId, load]);

  return { detail, loading, error, notFound, reload: load };
}
