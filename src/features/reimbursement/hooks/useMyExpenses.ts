'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/reimbursement.api';
import { toClaim, toMyOverview } from '../types/reimbursement.mapper';
import type { Claim, MyClaimTab, MyOverview } from '../types/reimbursement.model';

const PAGE_SIZE = 12;

/** The employee's expenses home: overview (wallet, counts, categories) and their reports by status. */
export function useMyExpenses() {
  const [overview, setOverview] = useState<MyOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState('');
  const [tab, setTabState] = useState<MyClaimTab>('all');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Claim[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listFetching, setListFetching] = useState(false);
  const [listError, setListError] = useState('');
  const overviewReq = useRef(0);
  const listReq = useRef(0);

  const loadOverview = useCallback(async () => {
    const id = ++overviewReq.current;
    setOverviewError('');
    try {
      const dto = await api.getMyOverview();
      if (id === overviewReq.current) setOverview(toMyOverview(dto));
    } catch (err) {
      if (id === overviewReq.current) setOverviewError(messageOf(err));
    } finally {
      if (id === overviewReq.current) setOverviewLoading(false);
    }
  }, []);

  const loadList = useCallback(async () => {
    const id = ++listReq.current;
    setListFetching(true);
    setListError('');
    try {
      const dto = await api.listMyClaims({ status: tab, page, pageSize: PAGE_SIZE });
      if (id !== listReq.current) return;
      setRows((dto.items || []).map(toClaim));
      setTotal(Number(dto.total) || 0);
    } catch (err) {
      if (id !== listReq.current) return;
      setRows([]);
      setTotal(0);
      setListError(messageOf(err));
    } finally {
      if (id === listReq.current) {
        setListFetching(false);
        setListLoading(false);
      }
    }
  }, [tab, page]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const setTab = useCallback((next: MyClaimTab) => {
    setTabState(next);
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    loadOverview();
    loadList();
  }, [loadOverview, loadList]);

  return {
    overview,
    overviewLoading,
    overviewError,
    tab,
    setTab,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    rows,
    total,
    listLoading,
    listFetching,
    listError,
    refresh,
  };
}
