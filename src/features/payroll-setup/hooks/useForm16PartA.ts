'use client';

import { useCallback, useEffect, useState } from 'react';
import * as api from '../api/payrollSetup.api';
import { toPartAEmployee } from '../types/payroll-setup.mapper';
import type { PartAUploadResultDto } from '../types/payroll-setup.dto';
import type { PartAEmployee } from '../types/payroll-setup.model';
import { messageOf } from '../utils/asyncAction';

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Form 16 Part A PDFs downloaded from TRACES for one year and company. A batch is matched
 * to employees by the PAN in each file name; a single file can also go to one employee.
 */
export function useForm16PartA(financialYear: string, company: number | null) {
  const [employees, setEmployees] = useState<PartAEmployee[]>([]);
  const [missing, setMissing] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  // 'batch', or the employee id being uploaded to / removed.
  const [busy, setBusy] = useState<'batch' | number | null>(null);
  const [result, setResult] = useState<PartAUploadResultDto | null>(null);
  const [rowError, setRowError] = useState<{ employeeId: number; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const dto = await api.listPartA(financialYear, company);
      setEmployees((dto.employees || []).map(toPartAEmployee));
      setMissing(Number(dto.missing || 0));
      setError('');
    } catch (err) {
      setError(messageOf(err));
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  }, [financialYear, company]);

  useEffect(() => {
    setIsLoading(true);
    setResult(null);
    setRowError(null);
    load();
  }, [load]);

  const uploadBatch = useCallback(async (files: File[]) => {
    const pdfs = files.filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    // Files the server would refuse anyway are reported with the rest of the result.
    const skipped = [
      ...files.filter((f) => !pdfs.includes(f)).map((f) => ({ file_name: f.name, reason: 'Not a PDF' })),
      ...pdfs.filter((f) => f.size > MAX_BYTES).map((f) => ({ file_name: f.name, reason: 'Larger than 5 MB' })),
    ];
    const sendable = pdfs.filter((f) => f.size <= MAX_BYTES);
    setError('');
    if (!sendable.length) {
      setResult({ matched: [], unmatched: skipped });
      return;
    }
    setBusy('batch');
    try {
      const dto = await api.uploadPartA(financialYear, company, sendable);
      setResult({ matched: dto.matched || [], unmatched: [...(dto.unmatched || []), ...skipped] });
      await load();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(null);
    }
  }, [financialYear, company, load]);

  const uploadOne = useCallback(async (employeeId: number, file: File) => {
    setRowError(null);
    if (file.size > MAX_BYTES) {
      setRowError({ employeeId, message: 'File is larger than 5 MB' });
      return;
    }
    setBusy(employeeId);
    try {
      await api.uploadPartA(financialYear, company, [file], employeeId);
      await load();
    } catch (err) {
      setRowError({ employeeId, message: messageOf(err) });
    } finally {
      setBusy(null);
    }
  }, [financialYear, company, load]);

  const remove = useCallback(async (employeeId: number) => {
    setRowError(null);
    setBusy(employeeId);
    try {
      await api.removePartA(financialYear, company, employeeId);
      await load();
    } catch (err) {
      setRowError({ employeeId, message: messageOf(err) });
    } finally {
      setBusy(null);
    }
  }, [financialYear, company, load]);

  return { employees, missing, isLoading, error, busy, result, rowError, uploadBatch, uploadOne, remove };
}
