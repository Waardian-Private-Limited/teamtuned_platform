'use client';

import { useEffect, useRef, useState } from 'react';
import { PREVIEW_DEBOUNCE_MS } from '@/features/expense-bills/constants/bill.constants';
import * as api from '../api/petty-cash.api';
import { toPreview } from '../types/petty-cash.mapper';
import type { ExpenseRequestDto } from '../types/petty-cash.dto';
import type { ExpensePreview } from '../types/petty-cash.model';

/**
 * Debounced live check of the expense being written (`/me/expenses/preview`, or `/expenses/preview` for
 * HR entering it for an employee). The body is compared by its JSON so typing that changes nothing does
 * not refetch; a stale request is aborted. A failed preview is silent: the submit path reports real errors.
 */
export function useExpensePreview(body: ExpenseRequestDto | null, enabled: boolean, scope: 'me' | 'hr') {
  const [preview, setPreview] = useState<ExpensePreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const request = useRef(0);
  const json = enabled && body ? JSON.stringify(body) : '';

  useEffect(() => {
    if (!json) {
      setPreview(null);
      setIsLoading(false);
      return;
    }
    const id = ++request.current;
    const controller = new AbortController();
    setIsLoading(true);
    const t = setTimeout(() => {
      const sent = JSON.parse(json) as ExpenseRequestDto;
      (scope === 'hr' ? api.previewExpense(sent, controller.signal) : api.previewMyExpense(sent, controller.signal))
        .then((dto) => id === request.current && setPreview(toPreview(dto)))
        .catch(() => id === request.current && setPreview(null))
        .finally(() => id === request.current && setIsLoading(false));
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [json, scope]);

  return { preview, isLoading };
}
