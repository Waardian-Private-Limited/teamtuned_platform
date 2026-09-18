'use client';

import { useCallback, useEffect, useState } from 'react';
import * as sitesApi from '../api/sites.api';
import { toSiteBudgetUsage } from '../types/sites.mapper';
import type { SiteBudgetUsage } from '../types/sites.model';
import { messageOf } from '@/lib/api/errors';
import { BUDGET_PAGE_SIZE } from '../constants/sites.constants';

export function useSiteBudget(siteId: number | null) {
  const [budget, setBudget] = useState<SiteBudgetUsage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activePage, setActivePage] = useState(1);

  const fetchBudget = useCallback(async (page: number) => {
    if (!siteId) return;
    setIsLoading(true);
    setError('');
    try {
      const dto = await sitesApi.getSiteBudgetUsage(siteId, page, BUDGET_PAGE_SIZE);
      setBudget(toSiteBudgetUsage(dto));
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    if (!siteId) {
      setBudget(null);
      setActivePage(1);
      setError('');
      return;
    }
    fetchBudget(1);
    setActivePage(1);
  }, [siteId, fetchBudget]);

  const goToPage = useCallback((page: number) => {
    setActivePage(page);
    fetchBudget(page);
  }, [fetchBudget]);

  return { budget, isLoading, error, activePage, goToPage };
}
