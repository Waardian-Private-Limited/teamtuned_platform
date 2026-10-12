'use client';

import { useCallback, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import * as api from '../api/salarySlips.api';
import type { PayRunDto } from '../types/salarySlips.dto';
import type { PayRun, PayslipLayout, SalarySlipRow } from '../types/salarySlips.model';

export type RowActionKind = 'generate' | 'release' | 'download';

export interface HoldProgress {
  done: number;
  total: number;
}

export interface HoldManyResult {
  done: number;
  error: string | null;
  failedId: number | null;
}

function generatedMessage(count: number) {
  if (count <= 0) return 'Nothing new to generate. These payslips are already generated or held.';
  return `${count} payslip${count === 1 ? '' : 's'} generated and visible in the app`;
}

export function useSalarySlipActions(onRun: (dto: PayRunDto) => void, onChanged: () => void) {
  const { track } = useDownloadCenter();
  const [rowBusy, setRowBusy] = useState<{ id: number; kind: RowActionKind } | null>(null);
  const [rowError, setRowError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState<HoldProgress | null>(null);

  const runRow = useCallback(async (id: number, kind: RowActionKind, fn: () => Promise<void>) => {
    setRowBusy({ id, kind });
    setRowError('');
    try {
      await fn();
    } catch (err) {
      setRowError(messageOf(err));
    } finally {
      setRowBusy(null);
    }
  }, []);

  const downloadOne = useCallback(
    (run: PayRun, row: SalarySlipRow) =>
      runRow(row.employeeId, 'download', async () => {
        track(await api.requestPayslipExport({ runId: run.id, layout: 'combined', employeeIds: [row.employeeId], includeHeld: true }));
      }),
    [runRow, track]
  );

  const generateOne = useCallback(
    (run: PayRun, row: SalarySlipRow) =>
      runRow(row.employeeId, 'generate', async () => {
        const res = await api.generatePayslips(run.id, [row.employeeId]);
        onRun(res.run);
        showSuccess(res.generated > 0 ? `Payslip generated for ${row.name}` : generatedMessage(0));
        onChanged();
      }),
    [runRow, onRun, onChanged]
  );

  const releaseHold = useCallback(
    async (run: PayRun, row: SalarySlipRow) => {
      setRowBusy({ id: row.employeeId, kind: 'release' });
      try {
        await api.releaseHold(run.id, row.employeeId);
        showSuccess(`Hold released for ${row.name}`);
        onChanged();
        return null;
      } catch (err) {
        return messageOf(err);
      } finally {
        setRowBusy(null);
      }
    },
    [onChanged]
  );

  const generate = useCallback(
    async (run: PayRun, employeeIds: number[] | null) => {
      setGenerating(true);
      try {
        const res = await api.generatePayslips(run.id, employeeIds ?? undefined);
        onRun(res.run);
        showSuccess(generatedMessage(res.generated));
        onChanged();
        return null;
      } catch (err) {
        return messageOf(err);
      } finally {
        setGenerating(false);
      }
    },
    [onRun, onChanged]
  );

  const holdMany = useCallback(
    async (run: PayRun, employeeIds: number[], reason: string): Promise<HoldManyResult> => {
      setHolding(true);
      setHoldProgress({ done: 0, total: employeeIds.length });
      let done = 0;
      try {
        for (const id of employeeIds) {
          try {
            await api.holdPayslip(run.id, id, reason);
          } catch (err) {
            return { done, error: messageOf(err), failedId: id };
          }
          done += 1;
          setHoldProgress({ done, total: employeeIds.length });
        }
        showSuccess(done === 1 ? 'Payslip held' : `${done} payslips held`);
        return { done, error: null, failedId: null };
      } finally {
        setHolding(false);
        setHoldProgress(null);
        if (done > 0) onChanged();
      }
    },
    [onChanged]
  );

  const exportSlips = useCallback(
    async (run: PayRun, layout: PayslipLayout, employeeIds: number[] | null, includeHeld: boolean) => {
      setExporting(true);
      setExportError('');
      try {
        const job = await api.requestPayslipExport({
          runId: run.id,
          layout,
          includeHeld,
          ...(employeeIds ? { employeeIds } : {}),
        });
        track(job);
        return true;
      } catch (err) {
        setExportError(messageOf(err));
        return false;
      } finally {
        setExporting(false);
      }
    },
    [track]
  );

  return {
    rowBusy,
    rowError,
    clearRowError: () => setRowError(''),
    downloadOne,
    generateOne,
    releaseHold,
    generating,
    generate,
    holding,
    holdProgress,
    holdMany,
    exporting,
    exportError,
    clearExportError: () => setExportError(''),
    exportSlips,
  };
}
