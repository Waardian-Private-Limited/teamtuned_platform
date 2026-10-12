'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import * as api from '../api/payrollRuns.api';
import { POLL_MS } from '../constants/payrollRuns.constants';
import { toEmployeePay, toRun } from '../types/payrollRuns.mapper';
import type { EmployeePay } from '../types/payrollRuns.model';

export function useEmployeePay(runId: number | null, employeeId: number | null) {
  const { track } = useDownloadCenter();
  const [data, setData] = useState<EmployeePay | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState<'payslip' | 'recompute' | 'hold' | 'generate' | null>(null);
  const reqRef = useRef(0);
  const keyRef = useRef('');

  const load = useCallback(async () => {
    if (runId === null || employeeId === null) {
      setLoading(false);
      setError('This payroll entry could not be found.');
      return;
    }
    const req = ++reqRef.current;
    const key = `${runId}:${employeeId}`;
    if (keyRef.current === key) setRefreshing(true);
    else {
      setLoading(true);
      setData(null);
    }
    setError('');
    try {
      const res = toEmployeePay(await api.getItem(runId, employeeId));
      if (req !== reqRef.current) return;
      setData(res);
      keyRef.current = key;
    } catch (err) {
      if (req === reqRef.current) setError(messageOf(err));
    } finally {
      if (req === reqRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [runId, employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  const calculating = data ? data.run.compute.state === 'queued' || data.run.compute.state === 'running' : false;

  useEffect(() => {
    if (!calculating || runId === null) return;
    const timer = setInterval(async () => {
      try {
        const run = toRun(await api.getRun(runId));
        if (run.compute.state !== 'queued' && run.compute.state !== 'running') load();
        else setData((d) => (d ? { ...d, run } : d));
      } catch {}
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [calculating, runId, load]);

  const downloadPayslip = useCallback(async () => {
    if (!data || runId === null || employeeId === null) return;
    setBusy('payslip');
    setActionError('');
    try {
      track(await api.exportPayslips(runId, 'combined', [employeeId], true));
    } catch (err) {
      setActionError(messageOf(err));
    } finally {
      setBusy(null);
    }
  }, [data, runId, employeeId, track]);

  const recompute = useCallback(async () => {
    if (runId === null) return;
    setBusy('recompute');
    setActionError('');
    try {
      const run = toRun(await api.recompute(runId));
      setData((d) => (d ? { ...d, run } : d));
      showSuccess('Recalculation queued');
    } catch (err) {
      setActionError(messageOf(err));
    } finally {
      setBusy(null);
    }
  }, [runId]);

  const generatePayslip = useCallback(async () => {
    if (runId === null || employeeId === null) return;
    setBusy('generate');
    setActionError('');
    try {
      const res = await api.generatePayslips(runId, [employeeId]);
      showSuccess(res.generated > 0 ? 'Payslip generated and visible in the app' : 'This payslip is already generated or held');
      await load();
    } catch (err) {
      setActionError(messageOf(err));
    } finally {
      setBusy(null);
    }
  }, [runId, employeeId, load]);

  const setHold = useCallback(
    async (hold: boolean, reason: string) => {
      if (runId === null || employeeId === null) return 'Missing payroll entry';
      setBusy('hold');
      try {
        await api.setHold(runId, employeeId, hold, reason.trim());
        showSuccess(hold ? 'Salary put on hold' : 'Hold released');
        await load();
        return null;
      } catch (err) {
        return messageOf(err);
      } finally {
        setBusy(null);
      }
    },
    [runId, employeeId, load]
  );

  return { data, loading, refreshing, error, actionError, busy, calculating, reload: load, downloadPayslip, recompute, generatePayslip, setHold };
}
