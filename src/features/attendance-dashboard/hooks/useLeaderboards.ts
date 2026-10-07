'use client';

import { useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { usePolling } from '@/lib/hooks/usePolling';
import { getLeaderBoard, getLeaders } from '../api/dashboard.api';
import { PAGE_SIZE } from '../constants/dashboard.constants';
import type { DashboardFilters, LeaderBoardKey, LeaderBoardPageDto, LeaderPeriod, LeadersDto } from '../types/dashboard.dto';

const REFRESH_MS = 5 * 60_000;

/**
 * The leaderboards for the day, week or month ending on the picked date, and one board's
 * full ranking in a popup (loaded only while it is open).
 */
export function useLeaderboards(filters: DashboardFilters, isToday: boolean) {
  const [period, setPeriod] = useState<LeaderPeriod>('day');
  const [data, setData] = useState<LeadersDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [board, setBoard] = useState<LeaderBoardKey | null>(null);
  const [page, setPage] = useState(1);
  const [full, setFull] = useState<LeaderBoardPageDto | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);

  const ready = !!filters.date;
  const key = `${JSON.stringify(filters)}|${period}`;
  const every = isToday ? REFRESH_MS : 24 * 3600_000;

  usePolling(
    async (signal) => {
      setLoading(true);
      try {
        const d = await getLeaders(filters, period, signal);
        if (!signal.aborted) { setData(d); setError(null); }
      } catch (e) {
        if (!signal.aborted) setError(messageOf(e));
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    every,
    ready,
    key,
  );

  usePolling(
    async (signal) => {
      if (!board) return;
      setLoadingFull(true);
      try {
        const d = await getLeaderBoard(filters, period, board, page, PAGE_SIZE, signal);
        if (!signal.aborted) setFull(d);
      } catch (e) {
        if (!signal.aborted) setError(messageOf(e));
      } finally {
        if (!signal.aborted) setLoadingFull(false);
      }
    },
    every,
    ready && !!board,
    `${key}|${board}|${page}`,
  );

  return {
    period,
    setPeriod: (p: LeaderPeriod) => { setPeriod(p); setData(null); },
    data, loading: loading && !data, refreshing: loading, error,
    board, page, setPage, full, loadingFull,
    openBoard: (b: LeaderBoardKey) => { setBoard(b); setPage(1); setFull(null); },
    closeBoard: () => setBoard(null),
  };
}
