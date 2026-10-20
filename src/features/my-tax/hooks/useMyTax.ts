'use client';

import { useCallback, useEffect, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { useAuth } from '@/context/AuthContext';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import { serverFieldOf } from '@/features/payroll-setup/utils/asyncAction';
import { toTdsEstimate } from '@/features/payroll-setup/types/payroll-setup.mapper';
import * as api from '../api/myTax.api';
import { toMyTax, toMyTaxProfile, toSaveBody, toTaxForm } from '../types/myTax.mapper';
import type { Form16Entry, MyTax, TaxFieldName, TaxForm } from '../types/myTax.model';
import { validateTaxForm } from '../utils/validate';

// Server field → form key the message sits under.
const SERVER_FIELDS = ['regime', 'pan', 'declarations', 'rent_paid_annual', 'landlord', 'home_loan_lender', 'previous_employer'] as const;
const AMOUNT_FIELDS: TaxFieldName[] = ['section80C', 'section80CCD1B', 'section80D', 'housingLoanInterest', 'other', 'otherIncome'];

export function useMyTax() {
  const { employee_id: employeeId } = useAuth();
  const { track } = useDownloadCenter();
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<MyTax | null>(null);
  const [form, setForm] = useState<TaxForm>(() => toTaxForm(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<TaxFieldName, string>>>({});
  // A save failure not tied to any input.
  const [formError, setFormError] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<{ key: string; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .getMyTax()
      .then((dto) => {
        if (cancelled) return;
        const next = toMyTax(dto);
        setData(next);
        setForm(toTaxForm(next.profile));
      })
      .catch((err) => !cancelled && setError(messageOf(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [version]);

  const retry = useCallback(() => setVersion((v) => v + 1), []);

  /** Edit the form; clears the message on what changed and the "Saved" note. */
  const patch = useCallback((changes: Partial<TaxForm>, field?: TaxFieldName) => {
    setForm((prev) => ({ ...prev, ...changes }));
    setSaved(false);
    setFormError('');
    // An amount also clears the server's message for the declarations as a group.
    const cleared: TaxFieldName[] = field ? (AMOUNT_FIELDS.includes(field) ? [field, 'declarations'] : [field]) : [];
    setFieldErrors((prev) => (cleared.some((f) => prev[f]) ? { ...prev, ...Object.fromEntries(cleared.map((f) => [f, undefined])) } : prev));
  }, []);

  const save = useCallback(async () => {
    const errors = validateTaxForm(form);
    setFieldErrors(errors);
    setFormError('');
    setSaved(false);
    if (Object.keys(errors).length > 0) return false;
    setSaving(true);
    try {
      const dto = await api.saveMyTax(toSaveBody(form, data?.profile ?? null));
      const profile = toMyTaxProfile(dto.profile);
      setData((prev) => (prev ? { ...prev, profile, estimate: toTdsEstimate(dto.estimate), estimateError: null } : prev));
      setForm(toTaxForm(profile));
      setSaved(true);
      // The regime cards compare both regimes; only the full read recomputes that.
      api.getMyTax().then((full) => {
        const next = toMyTax(full);
        setData((prev) => (prev ? { ...prev, comparison: next.comparison } : prev));
      }).catch(() => {});
      return true;
    } catch (err) {
      const field = serverFieldOf(err, SERVER_FIELDS);
      if (field) setFieldErrors({ [field === 'rent_paid_annual' ? 'rent' : field]: messageOf(err) });
      else setFormError(messageOf(err));
      return false;
    } finally {
      setSaving(false);
    }
  }, [form, data?.profile]);

  const downloadForm16 = useCallback(async (entry: Form16Entry) => {
    if (!employeeId) return;
    setDownloading(entry.key);
    setDownloadError(null);
    try {
      track(await api.exportMyForm16(employeeId, entry.financialYear, entry.company));
    } catch (err) {
      setDownloadError({ key: entry.key, message: messageOf(err) });
    } finally {
      setDownloading(null);
    }
  }, [employeeId, track]);

  return {
    data, form, loading, error, retry,
    patch, save, saving, saved, fieldErrors, formError,
    downloadForm16, downloading, downloadError,
  };
}
