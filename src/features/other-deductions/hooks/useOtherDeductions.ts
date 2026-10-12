'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { messageOf } from '@/lib/api/errors';
import { MONTH_KEY, thisMonth } from '@/features/salary-slips/utils/format';
import * as api from '../api/otherDeductions.api';
import { toOtherDeduction } from '../types/otherDeductions.mapper';
import type { OtherDeduction } from '../types/otherDeductions.model';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS, type DeductionStatusFilter } from '../constants/otherDeductions.constants';

export function useOtherDeductions() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const asked = params.get('month') || '';
  const month = MONTH_KEY.test(asked) ? asked : thisMonth();

  const [rows, setRows] = useState<OtherDeduction[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ count: 0, amount: 0, paid: 0, any: false });
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatusState] = useState<DeductionStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);

  const request = useRef(0);

  const load = useCallback(async () => {
    const id = ++request.current;
    setIsFetching(true);
    setError('');
    try {
      const dto = await api.listDeductions({ month, search, status: status === 'all' ? undefined : status, page, pageSize });
      if (id !== request.current) return;
      setRows(dto.payouts.map(toOtherDeduction));
      setTotal(dto.total);
      const counts = dto.counts || {};
      const all = counts.all || 0;
      setSummary({
        count: all - (counts.cancelled || 0) - (counts.rejected || 0),
        amount: Math.abs(dto.open_amount || 0),
        paid: Math.abs(dto.paid_amount || 0),
        any: all > 0,
      });
    } catch (err) {
      if (id !== request.current) return;
      setRows([]);
      setTotal(0);
      setError(messageOf(err));
    } finally {
      if (id === request.current) {
        setIsFetching(false);
        setIsInitialLoading(false);
      }
    }
  }, [month, search, status, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const setMonth = useCallback(
    (next: string) => {
      setPage(1);
      router.replace(`${pathname}?month=${next}`, { scroll: false });
    },
    [pathname, router]
  );

  const setStatus = useCallback((next: DeductionStatusFilter) => {
    setStatusState(next);
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
    setPage(1);
  }, []);

  const totals = useMemo(() => ({ count: summary.count, amount: summary.amount, paid: summary.paid }), [summary]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const markCancelledLocally = useCallback((ids: number[]) => {
    const set = new Set(ids);
    setRows((list) => list.map((d) => (set.has(d.id) ? { ...d, status: 'cancelled', canCancel: false } : d)));
  }, []);

  return {
    month,
    setMonth,
    rows,
    total,
    totals,
    isInitialLoading,
    isFetching,
    error,
    searchInput,
    setSearchInput,
    status,
    setStatus,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    clearFilters,
    hasActiveFilters: Boolean(search) || status !== 'all',
    hasAny: summary.any,
    refetch: load,
    markCancelledLocally,
  };
}
