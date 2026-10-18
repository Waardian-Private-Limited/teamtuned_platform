'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf, statusOf } from '@/lib/api/errors';
import * as api from '../../shared/api/recruitment.api';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../../shared/constants/recruitment.constants';
import { toPaged, toPosition } from '../../shared/types/recruitment.mapper';
import type { Position } from '../../shared/types/recruitment.model';

export type PositionStatusFilter = 'all' | 'open' | 'draft' | 'paused' | 'closed';

export const POSITION_STATUS_FILTERS: ReadonlyArray<{ value: PositionStatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'draft', label: 'Draft' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
];

/** Server-paged positions. `initialMine` starts with "Mine" on (hiring managers without RECRUIT_*). */
export function usePositionList(initialMine = false) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatusState] = useState<PositionStatusFilter>('all');
  const [departmentId, setDepartmentIdState] = useState<number | null>(null);
  const [mine, setMineState] = useState(initialMine);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const inFlightRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const queuedRef = useRef(false);

  const fetchPositions = useCallback(async () => {
    if (inFlightRef.current) { queuedRef.current = true; return; }
    inFlightRef.current = true;
    if (!hasLoadedRef.current) setIsInitialLoading(true);
    setIsFetching(true);
    setError('');
    try {
      const dto = await api.listPositions({ search, status, departmentId, mine, page, pageSize });
      const result = toPaged(dto, toPosition);
      setPositions(result.items);
      setTotal(result.total);
      setTotalPages(result.pages);
      setForbidden(false);
      hasLoadedRef.current = true;
    } catch (err) {
      if (statusOf(err) === 403) setForbidden(true);
      else setError(messageOf(err));
    } finally {
      inFlightRef.current = false;
      setIsInitialLoading(false);
      setIsFetching(false);
    }
  }, [search, status, departmentId, mine, page, pageSize]);

  useEffect(() => { fetchPositions(); }, [fetchPositions]);

  // A filter change while a request is in flight re-runs once it settles.
  useEffect(() => {
    if (!isFetching && queuedRef.current) { queuedRef.current = false; fetchPositions(); }
  }, [isFetching, fetchPositions]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSearch(searchInput); }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const setStatus = useCallback((v: PositionStatusFilter) => { setStatusState(v); setPage(1); }, []);
  const setDepartmentId = useCallback((v: number | null) => { setDepartmentIdState(v); setPage(1); }, []);
  const setMine = useCallback((v: boolean) => { setMineState(v); setPage(1); }, []);
  const setPageSize = useCallback((v: number) => { setPageSizeState(v); setPage(1); }, []);

  const clearFilters = useCallback(() => {
    setSearchInput(''); setSearch(''); setStatusState('all'); setDepartmentIdState(null); setMineState(initialMine); setPage(1);
  }, [initialMine]);

  return {
    positions, isInitialLoading, isFetching, error, forbidden,
    searchInput, setSearchInput, status, setStatus, departmentId, setDepartmentId, mine, setMine,
    page, setPage, pageSize, setPageSize, total, totalPages,
    refetch: fetchPositions, clearFilters,
    hasActiveFilters: Boolean(search) || status !== 'all' || departmentId !== null || mine !== initialMine,
  };
}
