'use client';

import { useCallback, useEffect, useState } from 'react';
import * as api from '../api/payrollSetup.api';
import { toPerquisite } from '../types/payroll-setup.mapper';
import type { Perquisite } from '../types/payroll-setup.model';
import { messageOf, serverFieldOf } from '../utils/asyncAction';

export interface PerquisiteDraft {
  perkType: string;
  description: string;
  value: string;
  recovered: string;
}

/** Row key: a saved row's id, or 'new' for the row being added. */
export type PerquisiteRowKey = number | 'new';

const FIELDS = ['perk_type', 'value', 'recovered', 'description'] as const;

/** Perquisites (Form 12BA) for one employee and year, edited row by row. */
export function usePerquisites(employeeId: number | null, financialYear: string) {
  const [rows, setRows] = useState<Perquisite[]>([]);
  const [types, setTypes] = useState<Array<{ code: string; label: string }>>([]);
  const [totalTaxable, setTotalTaxable] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [busy, setBusy] = useState<PerquisiteRowKey | null>(null);
  const [error, setError] = useState<{ row: PerquisiteRowKey | null; field: string; message: string } | null>(null);

  const load = useCallback(async () => {
    if (!employeeId) return;
    try {
      const dto = await api.listPerquisites(employeeId, financialYear);
      setRows((dto.perquisites || []).map(toPerquisite));
      setTypes(dto.types || []);
      setTotalTaxable(Number(dto.total_taxable || 0));
    } catch (err) {
      setError({ row: null, field: '', message: messageOf(err) });
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, financialYear]);

  useEffect(() => {
    setRows([]);
    setError(null);
    if (!employeeId) return;
    setIsLoading(true);
    load();
  }, [employeeId, load]);

  const save = useCallback(async (row: PerquisiteRowKey, draft: PerquisiteDraft) => {
    if (!employeeId) return false;
    setBusy(row);
    setError(null);
    try {
      await api.savePerquisite(
        {
          employee_id: employeeId,
          financial_year: financialYear,
          perk_type: draft.perkType,
          value: draft.value.trim() === '' ? null : Number(draft.value),
          recovered: draft.recovered.trim() === '' ? null : Number(draft.recovered),
          description: draft.description.trim() || null,
        },
        row === 'new' ? undefined : row
      );
      await load();
      return true;
    } catch (err) {
      setError({ row, field: serverFieldOf(err, FIELDS) ?? '', message: messageOf(err) });
      return false;
    } finally {
      setBusy(null);
    }
  }, [employeeId, financialYear, load]);

  const remove = useCallback(async (id: number) => {
    setBusy(id);
    setError(null);
    try {
      await api.deletePerquisite(id);
      await load();
      return true;
    } catch (err) {
      setError({ row: id, field: '', message: messageOf(err) });
      return false;
    } finally {
      setBusy(null);
    }
  }, [load]);

  return { rows, types, totalTaxable, isLoading, busy, error, save, remove };
}
