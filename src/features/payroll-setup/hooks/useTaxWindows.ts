'use client';

import { useCallback, useEffect, useState } from 'react';
import * as api from '../api/payrollSetup.api';
import { toTdsSettings, toTdsSettingsPayload } from '../types/payroll-setup.mapper';
import type { TdsSettings } from '../types/payroll-setup.model';
import { messageOf, serverFieldOf } from '../utils/asyncAction';

export type WindowDates = Pick<TdsSettings, 'declarationOpensOn' | 'declarationClosesOn' | 'proofOpensOn' | 'proofClosesOn'>;

const EMPTY: WindowDates = { declarationOpensOn: '', declarationClosesOn: '', proofOpensOn: '', proofClosesOn: '' };

const SERVER_FIELDS: Record<string, keyof WindowDates> = {
  declaration_opens_on: 'declarationOpensOn',
  declaration_closes_on: 'declarationClosesOn',
  proof_opens_on: 'proofOpensOn',
  proof_closes_on: 'proofClosesOn',
};

/**
 * When employees may change declarations and upload proofs. The dates live on the
 * organization-level TDS settings (the row employees' pages read), whatever company the
 * identity step above is editing.
 */
export function useTaxWindows() {
  const [dates, setDates] = useState<WindowDates>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof WindowDates, string>>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .getTdsSettings(0)
      .then((dto) => {
        if (cancelled) return;
        const s = toTdsSettings(dto.settings);
        setDates({ declarationOpensOn: s.declarationOpensOn, declarationClosesOn: s.declarationClosesOn, proofOpensOn: s.proofOpensOn, proofClosesOn: s.proofClosesOn });
      })
      .catch((err) => !cancelled && setError(messageOf(err)))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const change = useCallback((key: keyof WindowDates, value: string) => {
    setDates((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    setSaved(false);
  }, []);

  const save = useCallback(async () => {
    const errors: Partial<Record<keyof WindowDates, string>> = {};
    if (dates.declarationOpensOn && dates.declarationClosesOn && dates.declarationClosesOn < dates.declarationOpensOn) {
      errors.declarationClosesOn = 'Must be after the opening date';
    }
    if (dates.proofOpensOn && dates.proofClosesOn && dates.proofClosesOn < dates.proofOpensOn) {
      errors.proofClosesOn = 'Must be after the opening date';
    }
    setFieldErrors(errors);
    setError('');
    if (Object.keys(errors).length) return;
    setIsSaving(true);
    try {
      // Re-read the identity fields just before saving, so a TAN saved in the identity card since this
      // card loaded is not written back over.
      const current = toTdsSettings((await api.getTdsSettings(0)).settings);
      await api.saveTdsSettings(toTdsSettingsPayload({ ...current, ...dates }, 0, true));
      setSaved(true);
    } catch (err) {
      const field = serverFieldOf(err, Object.keys(SERVER_FIELDS));
      if (field) setFieldErrors({ [SERVER_FIELDS[field]]: messageOf(err) });
      else setError(messageOf(err));
    } finally {
      setIsSaving(false);
    }
  }, [dates]);

  return { dates, change, save, isLoading, isSaving, saved, fieldErrors, error };
}
