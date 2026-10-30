'use client';

import { useCallback, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import * as api from '../api/payrollRuns.api';
import { toRun } from '../types/payrollRuns.mapper';
import type { Run } from '../types/payrollRuns.model';

export type RunExportKind = 'payslips_zip' | 'payslips_combined' | 'register' | 'bank';

interface Options {
  month: string;
  onRun: (run: Run) => void;
  onReload: () => void;
}

export function useRunActions({ month, onRun, onReload }: Options) {
  const { track } = useDownloadCenter();
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setError = useCallback((key: string, message: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[key] = message;
      else delete next[key];
      return next;
    });
  }, []);

  const exec = useCallback(
    async (key: string, busyKey: string, fn: () => Promise<void>) => {
      setBusy(busyKey);
      setError(key, '');
      try {
        await fn();
        return true;
      } catch (err) {
        setError(key, messageOf(err));
        return false;
      } finally {
        setBusy(null);
      }
    },
    [setError]
  );

  const start = useCallback(
    (run: Run) =>
      exec(run.key, `${run.key}:start`, async () => {
        await api.startRuns(month, run.subOrganizationId);
        showSuccess(`Payroll started for ${run.companyName}`);
        onReload();
      }),
    [exec, month, onReload]
  );

  const startAll = useCallback(
    () =>
      exec('all', 'all:start', async () => {
        const res = await api.startRuns(month);
        showSuccess(`Payroll started for ${res.runs?.length || 'all'} companies`);
        onReload();
      }),
    [exec, month, onReload]
  );

  const runCall = useCallback(
    (run: Run, action: string, call: () => Promise<Parameters<typeof toRun>[0]>, message: string) =>
      exec(run.key, `${run.key}:${action}`, async () => {
        const dto = await call();
        onRun(toRun(dto));
        showSuccess(message);
        onReload();
      }),
    [exec, onRun, onReload]
  );

  const remove = useCallback(
    (run: Run) =>
      exec(run.key, `${run.key}:delete`, async () => {
        await api.deleteRun(run.id as number);
        showSuccess(`Draft payroll for ${run.companyName} deleted`);
        onReload();
      }),
    [exec, onReload]
  );

  const recompute = useCallback((run: Run) => runCall(run, 'recompute', () => api.recompute(run.id as number), 'Recalculation queued'), [runCall]);
  const finalize = useCallback(
    (run: Run) => runCall(run, 'finalize', () => api.finalize(run.id as number), run.finalizeNeedsApproval ? 'Sent for approval' : 'Payroll finalized'),
    [runCall]
  );
  const release = useCallback((run: Run) => runCall(run, 'release', () => api.release(run.id as number), 'Payslips generated for all employees except held ones'), [runCall]);

  const reopen = useCallback(
    async (run: Run, reason: string) => {
      setBusy(`${run.key}:reopen`);
      try {
        const dto = await api.reopen(run.id as number, reason);
        onRun(toRun(dto));
        showSuccess('Reopen request sent for approval');
        onReload();
        return null;
      } catch (err) {
        return messageOf(err);
      } finally {
        setBusy(null);
      }
    },
    [onRun, onReload]
  );

  const markPaid = useCallback(
    async (run: Run, paidOn: string, reference: string) => {
      setBusy(`${run.key}:paid`);
      try {
        const dto = await api.markPaid(run.id as number, paidOn, reference.trim());
        onRun(toRun(dto));
        showSuccess('Marked as paid');
        onReload();
        return null;
      } catch (err) {
        return messageOf(err);
      } finally {
        setBusy(null);
      }
    },
    [onRun, onReload]
  );

  const exportRun = useCallback(
    (run: Run, kind: RunExportKind) =>
      exec(run.key, `${run.key}:export`, async () => {
        const id = run.id as number;
        const job =
          kind === 'payslips_zip'
            ? await api.exportPayslips(id, 'zip')
            : kind === 'payslips_combined'
              ? await api.exportPayslips(id, 'combined')
              : kind === 'register'
                ? await api.exportRegister(id)
                : await api.exportBankTransfer(id);
        track(job);
      }),
    [exec, track]
  );

  return { busy, errors, start, startAll, remove, recompute, finalize, release, reopen, markPaid, exportRun };
}
