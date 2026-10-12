'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiError, messageOf } from '@/lib/api/errors';
import * as api from '../api/salaryAdvance.api';
import { PREVIEW_DEBOUNCE_MS } from '../constants/salaryAdvance.constants';
import { planInputOf, toPlanBody, toPlanContext } from '../types/salaryAdvance.mapper';
import type { PlanContext, PlanInput } from '../types/salaryAdvance.model';

/**
 * Loads the repayment-plan options for a pending or approved advance and recalculates the schedule
 * as the plan changes. `forbidden` is true when this user cannot shape plans (the approver is not HR).
 */
export function usePlanPreview(advanceId: number | null, initial: PlanContext | null = null) {
  const [context, setContext] = useState<PlanContext | null>(initial);
  const [input, setInput] = useState<PlanInput | null>(initial ? planInputOf(initial.plan) : null);
  const [isLoading, setIsLoading] = useState(!initial && Boolean(advanceId));
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (!advanceId || initial) return;
    const ac = new AbortController();
    controller.current = ac;
    setIsLoading(true);
    api
      .previewPlan(advanceId, {}, ac.signal)
      .then((dto) => {
        if (ac.signal.aborted) return;
        const ctx = toPlanContext(dto);
        setContext(ctx);
        setInput(planInputOf(ctx.plan));
      })
      .catch((err) => {
        if (ac.signal.aborted) return;
        if (err instanceof ApiError && (err.status === 403 || err.status === 401)) setForbidden(true);
        else setError(messageOf(err));
      })
      .finally(() => !ac.signal.aborted && setIsLoading(false));
    return () => ac.abort();
  }, [advanceId, initial]);

  useEffect(() => {
    if (!advanceId || !input) return;
    if (first.current) {
      first.current = false;
      return;
    }
    setIsLoading(true);
    const timer = setTimeout(() => {
      controller.current?.abort();
      const ac = new AbortController();
      controller.current = ac;
      api
        .previewPlan(advanceId, toPlanBody(input), ac.signal)
        .then((dto) => {
          if (ac.signal.aborted) return;
          setContext(toPlanContext(dto));
          setError('');
        })
        .catch((err) => !ac.signal.aborted && setError(messageOf(err)))
        .finally(() => !ac.signal.aborted && setIsLoading(false));
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [advanceId, input]);

  useEffect(() => () => controller.current?.abort(), []);

  return { context, input, setInput, isLoading, error, forbidden };
}
