'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as sitesApi from '../api/sites.api';
import { toSiteList } from '../types/sites.mapper';
import type { Site } from '../types/sites.model';
import { messageOf } from '@/lib/api/errors';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS, type SiteStatusFilter } from '../constants/sites.constants';

export function useSiteList() {
  const [sites, setSites] = useState<Site[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatusState] = useState<SiteStatusFilter>('all');
  const [city, setCityState] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const inFlightRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const fetchSites = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!hasLoadedRef.current) {
      setIsInitialLoading(true);
    }
    setIsFetching(true);
    setError('');
    try {
      const dto = await sitesApi.listSites({
        search,
        status,
        page,
        pageSize,
        city: city || undefined,
      });
      const result = toSiteList(dto);
      setSites(result.sites);
      setTotal(result.total);
      setTotalPages(result.pages);
      hasLoadedRef.current = true;
    } catch (err) {
      setError(messageOf(err));
    } finally {
      inFlightRef.current = false;
      setIsInitialLoading(false);
      setIsFetching(false);
    }
  }, [search, status, page, pageSize, city]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const setStatus = useCallback((next: SiteStatusFilter) => {
    setStatusState(next);
    setPage(1);
  }, []);

  const setCity = useCallback((next: string) => {
    setCityState(next);
    setPage(1);
  }, []);

  const setPageSize = useCallback((next: number) => {
    setPageSizeState(next);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setStatusState('all');
    setCityState('');
    setPage(1);
  }, []);

  const updateSiteStatusLocally = useCallback((id: number, nextStatus: 'active' | 'inactive') => {
    setSites((prev) => prev.map((site) => (site.id === id ? { ...site, status: nextStatus } : site)));
  }, []);

  return {
    sites,
    isLoading: isInitialLoading || isFetching,
    isInitialLoading,
    isFetching,
    error,
    searchInput,
    setSearchInput,
    status,
    setStatus,
    city,
    setCity,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    refetch: fetchSites,
    clearFilters,
    updateSiteStatusLocally,
    hasActiveFilters: Boolean(search) || status !== 'all' || Boolean(city),
  };
}
