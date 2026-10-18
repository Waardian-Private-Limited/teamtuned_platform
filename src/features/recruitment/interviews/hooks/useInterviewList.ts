'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { addDays, orgToday, useOrgTimezone } from '@/lib/datetime';
import * as api from '../api/interviews.api';
import type { InterviewListItemDto, InterviewStatus } from '../types/interviews.dto';
import type { RangePreset } from '../constants/interviews.constants';
import { weekStart } from '../lib/orgTime';
import type { EmployeeLite } from '../lib/EmployeePickers';

const PAGE_SIZE = 50;

export function useInterviewList() {
  const tz = useOrgTimezone();
  const today = orgToday(tz);

  const [items, setItems] = useState<InterviewListItemDto[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  const [preset, setPresetState] = useState<RangePreset>('next7');
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(addDays(today, 13));
  const [status, setStatusState] = useState<InterviewStatus | 'all'>('scheduled');
  const [positionId, setPositionIdState] = useState<number | null>(null);
  const [interviewer, setInterviewerState] = useState<EmployeeLite | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const seq = useRef(0);
  const loadedRef = useRef(false);

  const range = useMemo(() => {
    if (preset === 'week') {
      const from = weekStart(today);
      return { from, to: addDays(from, 6) };
    }
    if (preset === 'next7') return { from: today, to: addDays(today, 6) };
    return customFrom <= customTo ? { from: customFrom, to: customTo } : { from: customTo, to: customFrom };
  }, [preset, today, customFrom, customTo]);

  const fetchList = useCallback(async () => {
    const mine = ++seq.current;
    if (!loadedRef.current) setIsInitialLoading(true);
    setIsFetching(true);
    setError('');
    try {
      const dto = await api.listInterviews({
        from: range.from,
        to: range.to,
        status,
        positionId,
        interviewerId: interviewer?.id ?? null,
        page,
        pageSize,
      });
      if (mine !== seq.current) return;
      setItems(dto.items || []);
      setTotal(dto.total || 0);
      setTotalPages(dto.pages || 0);
      loadedRef.current = true;
    } catch (err) {
      if (mine === seq.current) setError(messageOf(err));
    } finally {
      if (mine === seq.current) {
        setIsInitialLoading(false);
        setIsFetching(false);
      }
    }
  }, [range.from, range.to, status, positionId, interviewer, page, pageSize]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  return {
    items,
    isInitialLoading,
    isFetching,
    error,
    preset,
    setPreset: reset(setPresetState),
    customFrom,
    setCustomFrom: reset(setCustomFrom),
    customTo,
    setCustomTo: reset(setCustomTo),
    range,
    status,
    setStatus: reset(setStatusState),
    positionId,
    setPositionId: reset(setPositionIdState),
    interviewer,
    setInterviewer: reset(setInterviewerState),
    page,
    setPage,
    pageSize,
    setPageSize: reset(setPageSizeState),
    total,
    totalPages,
    refetch: fetchList,
    hasFilters: status !== 'scheduled' || positionId !== null || interviewer !== null || preset !== 'next7',
    clearFilters: () => {
      setPresetState('next7');
      setStatusState('scheduled');
      setPositionIdState(null);
      setInterviewerState(null);
      setPage(1);
    },
  };
}
