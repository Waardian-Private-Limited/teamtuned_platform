'use client';

import { useCallback, useMemo } from 'react';
import { useRemote } from '@/features/reimbursement/hooks/useRemote';
import { toCategory } from '@/features/reimbursement/types/reimbursement.mapper';
import type { CategoryListResponseDto } from '@/features/reimbursement/types/reimbursement.dto';
import * as api from '../api/petty-cash.api';

/** Every petty cash category (active and inactive) with the icon set and starter suggestions. */
export function useCategories(enabled = true) {
  const fetcher = useCallback(() => api.listManagedCategories(), []);
  const r = useRemote<CategoryListResponseDto>(enabled ? fetcher : null, 'pc-categories');
  const categories = useMemo(() => (r.data?.items || []).map(toCategory), [r.data]);
  return {
    categories,
    icons: r.data?.icons || [],
    starters: r.data?.starters || [],
    isLoading: r.isLoading,
    isFetching: r.isFetching,
    error: r.error,
    refetch: r.refetch,
  };
}
