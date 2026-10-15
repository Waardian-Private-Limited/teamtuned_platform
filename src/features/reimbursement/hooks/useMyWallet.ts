'use client';

import { useCallback, useState } from 'react';
import * as api from '../api/reimbursement.api';
import { toFundRequest, toLedgerEntry, toWallet } from '../types/reimbursement.mapper';
import { useRemote } from './useRemote';

const PAGE_SIZE = 50;

/** The employee's own wallet statement and their fund requests. */
export function useMyWallet() {
  const [page, setPageState] = useState(1);
  const [range, setRangeState] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const statementFetcher = useCallback(async () => {
    const dto = await api.getMyWallet({ page, pageSize: PAGE_SIZE, from: range.from, to: range.to });
    const w = dto.wallet;
    return {
      wallet: w ? toWallet(w) : null,
      fundRequests: Boolean(dto.fund_requests),
      entries: (dto.items || []).map(toLedgerEntry),
      total: Number(dto.total) || 0,
    };
  }, [page, range]);
  const statement = useRemote(statementFetcher, `${page}:${range.from}:${range.to}`);
  const requestsFetcher = useCallback(async () => {
    const dto = await api.listMyFundRequests({ page: 1, pageSize: 50 });
    return (dto.items || []).map(toFundRequest);
  }, []);
  const requests = useRemote(requestsFetcher, 'requests');
  const setRange = useCallback((next: { from: string; to: string }) => {
    setRangeState(next);
    setPageState(1);
  }, []);
  const { refetch: refetchStatement } = statement;
  const { refetch: refetchRequests } = requests;
  const refresh = useCallback(() => {
    refetchStatement();
    refetchRequests();
  }, [refetchStatement, refetchRequests]);
  return {
    statement,
    requests,
    page,
    setPage: setPageState,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil((statement.data?.total ?? 0) / PAGE_SIZE)),
    range,
    setRange,
    refresh,
  };
}
