'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/offers.api';
import type { OfferListItemDto, OfferStatus } from '../types/offers.dto';

export function useOfferList() {
  const [items, setItems] = useState<OfferListItemDto[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatusState] = useState<OfferStatus | 'all'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const seq = useRef(0);
  const loaded = useRef(false);

  const fetchList = useCallback(async () => {
    const mine = ++seq.current;
    if (!loaded.current) setIsInitialLoading(true);
    setIsFetching(true);
    setError('');
    try {
      const dto = await api.listOffers({ status, search, page, pageSize });
      if (mine !== seq.current) return;
      setItems(dto.items || []);
      setTotal(dto.total || 0);
      setTotalPages(dto.pages || 0);
      loaded.current = true;
    } catch (err) {
      if (mine === seq.current) setError(messageOf(err));
    } finally {
      if (mine === seq.current) { setIsInitialLoading(false); setIsFetching(false); }
    }
  }, [status, search, page, pageSize]);

  useEffect(() => { fetchList(); }, [fetchList]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSearch(searchInput.trim()); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  return {
    items,
    isInitialLoading,
    isFetching,
    error,
    status,
    setStatus: (v: OfferStatus | 'all') => { setStatusState(v); setPage(1); },
    searchInput,
    setSearchInput,
    page,
    setPage,
    pageSize,
    setPageSize: (n: number) => { setPageSizeState(n); setPage(1); },
    total,
    totalPages,
    refetch: fetchList,
    hasFilters: status !== 'all' || Boolean(search),
    clearFilters: () => { setStatusState('all'); setSearchInput(''); setSearch(''); setPage(1); },
  };
}
