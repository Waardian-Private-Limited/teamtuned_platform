'use client';

import { useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/salaryAdvance.api';
import { toSchedulePreview } from '../types/salaryAdvance.mapper';
import type { SchedulePreview } from '../types/salaryAdvance.model';
import { PREVIEW_DEBOUNCE_MS } from '../constants/salaryAdvance.constants';

export function useRequestPreview(typeId: number | null, amount: number, installments: number, startMonth: string | null, enabled: boolean) {
  const [preview, setPreview] = useState<SchedulePreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const valid = enabled && typeId && Number.isFinite(amount) && amount > 0 && Number.isInteger(installments) && installments > 0;
    if (!valid) {
      controller.current?.abort();
      setPreview(null);
      setError('');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const timer = setTimeout(() => {
      controller.current?.abort();
      const ac = new AbortController();
      controller.current = ac;
      api
        .previewMyAdvance({ advance_type_id: typeId as number, amount, installments, start_month: startMonth || undefined }, ac.signal)
        .then((dto) => {
          if (ac.signal.aborted) return;
          setPreview(toSchedulePreview(dto));
          setError('');
        })
        .catch((err) => {
          if (ac.signal.aborted) return;
          setPreview(null);
          setError(messageOf(err));
        })
        .finally(() => !ac.signal.aborted && setIsLoading(false));
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [typeId, amount, installments, startMonth, enabled]);

  useEffect(() => () => controller.current?.abort(), []);

  return { preview, isLoading, error };
}
