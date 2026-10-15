'use client';

import { useCallback, useMemo } from 'react';
import * as api from '../api/reimbursement.api';
import { toCategory } from '../types/reimbursement.mapper';
import type { CategoryListResponseDto } from '../types/reimbursement.dto';
import { useRemote } from './useRemote';

/** All categories (active and inactive) with the icon set and starter suggestions. */
export function useCategories() {
  const fetcher = useCallback(() => api.listCategories({ status: 'all' }), []);
  const r = useRemote<CategoryListResponseDto>(fetcher, 'all');
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
