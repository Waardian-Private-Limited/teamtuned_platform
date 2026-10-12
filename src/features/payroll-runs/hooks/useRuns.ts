'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/payrollRuns.api';
import { POLL_MS } from '../constants/payrollRuns.constants';
import { toRun } from '../types/payrollRuns.mapper';
import type { Run } from '../types/payrollRuns.model';

const isActive = (r: Run) => r.id !== null && (r.compute.state === 'queued' || r.compute.state === 'running');

export function useRuns(month: string, subOrgId: number | null) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [settledVersion, setSettledVersion] = useState(0);
  const reqRef = useRef(0);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!month) return;
    const req = ++reqRef.current;
    if (loadedRef.current) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const dto = await api.listRuns(month, subOrgId);
      if (req !== reqRef.current) return;
      setRuns((dto.runs || []).map(toRun));
      loadedRef.current = true;
    } catch (err) {
      if (req === reqRef.current) setError(messageOf(err));
    } finally {
      if (req === reqRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [month, subOrgId]);

  useEffect(() => {
    loadedRef.current = false;
    setRuns([]);
    load();
  }, [load]);

  const patchRun = useCallback((next: Run) => {
    setRuns((prev) => prev.map((r) => (r.id !== null && r.id === next.id ? { ...next, statusCounts: next.statusCounts ?? r.statusCounts, finalizeNeedsApproval: next.finalizeNeedsApproval ?? r.finalizeNeedsApproval } : r)));
  }, []);

  const activeIds = runs.filter(isActive).map((r) => r.id as number).join(',');

  useEffect(() => {
    if (!activeIds) return;
    const ids = activeIds.split(',').map(Number);
    let stopped = false;
    const timer = setInterval(async () => {
      const results = await Promise.all(ids.map((id) => api.getRun(id).then(toRun).catch(() => null)));
      if (stopped) return;
      let settled = false;
      results.forEach((r) => {
        if (!r) return;
        if (!isActive(r)) settled = true;
        patchRun(r);
      });
      if (settled) {
        setSettledVersion((v) => v + 1);
        load();
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [activeIds, patchRun, load]);

  return { runs, setRuns, loading, refreshing, error, refresh: load, patchRun, settledVersion };
}
