'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/salaryAdvance.api';
import { toAdvance, toMyOverview } from '../types/salaryAdvance.mapper';
import type { Advance, MyOverview } from '../types/salaryAdvance.model';

export type MyStatusFilter = 'all' | 'pending' | 'active' | 'closed';

const PAGE_SIZE = 10;

export function useMyAdvances() {
  const [version, setVersion] = useState(0);
  const [overview, setOverview] = useState<MyOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState('');

  const [rows, setRows] = useState<Advance[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatusState] = useState<MyStatusFilter>('all');
  const [listLoading, setListLoading] = useState(true);
  const [listFetching, setListFetching] = useState(false);
  const [listError, setListError] = useState('');
  const request = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setOverviewError('');
    api
      .getMyOverview()
      .then((dto) => !cancelled && setOverview(toMyOverview(dto)))
      .catch((err) => !cancelled && setOverviewError(messageOf(err)))
      .finally(() => !cancelled && setOverviewLoading(false));
    return () => {
      cancelled = true;
    };
  }, [version]);

  const loadList = useCallback(async () => {
    const id = ++request.current;
    setListFetching(true);
    setListError('');
    try {
      const dto = await api.listMyAdvances({ status: status === 'all' ? undefined : status, page, pageSize: PAGE_SIZE });
      if (id !== request.current) return;
      setRows((dto.items || []).map(toAdvance));
      setTotal(Number(dto.total) || 0);
    } catch (err) {
      if (id !== request.current) return;
      setRows([]);
      setListError(messageOf(err));
    } finally {
      if (id === request.current) {
        setListFetching(false);
        setListLoading(false);
      }
    }
  }, [status, page]);

  useEffect(() => {
    loadList();
  }, [loadList, version]);

  const setStatus = useCallback((next: MyStatusFilter) => {
    setStatusState(next);
    setPage(1);
  }, []);

  return {
    overview,
    overviewLoading,
    overviewError,
    rows,
    total,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    status,
    setStatus,
    listLoading,
    listFetching,
    listError,
    refresh: useCallback(() => setVersion((v) => v + 1), []),
  };
}
