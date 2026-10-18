'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as mapperApi from '../api/siteSubOrgMapper.api';
import { toMappingList } from '../types/siteSubOrgMapper.mapper';
import type { Mapping, PickerOption } from '../types/siteSubOrgMapper.model';
import { messageOf } from '@/lib/api/errors';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../constants/siteSubOrgMapper.constants';

export function useMappingList() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [subOrgId, setSubOrgIdState] = useState<number | null>(null);
  // The site filter keeps the whole option (not just the id) so its label
  // survives even though the picker only holds the latest search results.
  const [site, setSiteState] = useState<PickerOption | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const inFlightRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const siteId = site?.value ?? null;

  const fetchMappings = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!hasLoadedRef.current) {
      setIsInitialLoading(true);
    }
    setIsFetching(true);
    setError('');
    try {
      const dto = await mapperApi.listMappings({ search, siteId, subOrgId, page, pageSize });
      const result = toMappingList(dto);
      setMappings(result.mappings);
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
  }, [search, siteId, subOrgId, page, pageSize]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  // Debounced search settles into `search` (the value actually sent to the
  // server) and resets to page 1, mirroring the roles list hook.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const setSubOrgId = useCallback((next: number | null) => {
    setSubOrgIdState(next);
    setPage(1);
  }, []);

  const setSite = useCallback((next: PickerOption | null) => {
    setSiteState(next);
    setPage(1);
  }, []);

  const setPageSize = useCallback((next: number) => {
    setPageSizeState(next);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setSubOrgIdState(null);
    setSiteState(null);
    setPage(1);
  }, []);

  return {
    mappings,
    isLoading: isInitialLoading || isFetching,
    isInitialLoading,
    isFetching,
    error,
    searchInput,
    setSearchInput,
    subOrgId,
    setSubOrgId,
    site,
    setSite,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    refetch: fetchMappings,
    clearFilters,
    hasActiveFilters: Boolean(search) || subOrgId !== null || site !== null,
  };
}
