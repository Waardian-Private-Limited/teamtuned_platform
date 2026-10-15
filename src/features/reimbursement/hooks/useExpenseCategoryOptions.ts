'use client';

import { useEffect, useMemo, useState } from 'react';
import * as api from '../api/reimbursement.api';
import type { CategoryDto } from '../types/reimbursement.dto';

export interface ExpenseCategoryOption {
  id: number;
  name: string;
  code?: string;
  kind?: 'amount' | 'distance';
  icon?: string | null;
  active?: boolean;
}

let cache: CategoryDto[] | null = null;

/** Expense categories for the policy editor (inactive ones too, so an existing rule keeps its name). */
export function useExpenseCategoryOptions(enabled = true) {
  const [items, setItems] = useState<CategoryDto[]>(cache ?? []);
  const [isLoading, setIsLoading] = useState(enabled && !cache);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    api
      .listCategories({ status: 'all' })
      .then((dto) => {
        cache = dto.items || [];
        if (!cancelled) setItems(cache);
      })
      .catch(() => {
        if (!cancelled) setItems(cache ?? []);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const options = useMemo<ExpenseCategoryOption[]>(
    () => items.map((c) => ({ id: c.id, name: c.name, code: c.code, kind: c.kind, icon: c.icon, active: c.status === 'active' })),
    [items]
  );

  return { options, isLoading };
}

export function invalidateExpenseCategoryOptions() {
  cache = null;
}
