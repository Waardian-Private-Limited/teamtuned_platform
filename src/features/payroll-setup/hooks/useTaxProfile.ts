'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api/payrollSetup.api';
import { toTaxProfile, toTdsEstimate } from '../types/payroll-setup.mapper';
import type { RegimeComparison, TaxProfile, TdsEstimate } from '../types/payroll-setup.model';
import { messageOf, serverFieldOf } from '../utils/asyncAction';
import { showError, showSuccess } from '@/lib/toast';
import { statusOf } from '@/lib/api/errors';
import { validatePan } from '../utils/validators';
import type { PreviousEmployerDto, TaxPartyDto, TaxProofsDto } from '../types/payroll-setup.dto';
import type { TaxProfileFieldName } from '../constants/payroll-setup.constants';

const PROFILE_FIELDS: readonly TaxProfileFieldName[] = [
  'pan', 'regime', 'financial_year', 'estimated_annual_tax', 'declarations', 'rent_paid_annual', 'previous_employer',
  'landlord', 'home_loan_lender', 'relief_89', 'proofs',
];

export interface TaxProfileInput {
  regime: 'old' | 'new';
  pan: string;
  declarations: Record<string, number>;
  estimated_annual_tax?: number | null;
  rent_paid_annual?: number | null;
  metro_city?: boolean;
  previous_employer?: PreviousEmployerDto | null;
  landlord?: TaxPartyDto | null;
  home_loan_lender?: TaxPartyDto | null;
  proofs?: TaxProofsDto | null;
  relief_89?: number | null;
}

/** TDS was already deducted this year under the current regime; switching needs a confirm. */
export interface RegimeLock {
  deducted: number;
  message: string;
}

export function useTaxProfile(employeeId: number | null, financialYear: string) {
  const [profile, setProfile] = useState<TaxProfile | null>(null);
  const [estimate, setEstimate] = useState<TdsEstimate | null>(null);
  const [comparison, setComparison] = useState<RegimeComparison | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  // null = not yet known. Never block the form on a failed lookup.
  const [configuredYears, setConfiguredYears] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [regimeLock, setRegimeLock] = useState<RegimeLock | null>(null);
  const pendingRef = useRef<TaxProfileInput | null>(null);

  const load = useCallback(async () => {
    if (!employeeId) return;
    setIsLoading(true);
    setError('');
    try {
      const [dto, years] = await Promise.all([
        api.getTaxProfile(employeeId, financialYear),
        api.listTaxYears().catch(() => null),
      ]);
      setProfile(dto.profile ? toTaxProfile(dto.profile) : null);
      setEstimate(dto.estimate ? toTdsEstimate(dto.estimate) : null);
      setConfiguredYears(years?.financial_years ?? null);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, financialYear]);

  useEffect(() => {
    setProfile(null);
    setEstimate(null);
    setComparison(null);
    if (employeeId) load();
  }, [employeeId, financialYear, load]);

  const refreshEstimate = useCallback(async () => {
    if (!employeeId) return;
    try {
      const dto = await api.getTdsPreview(employeeId, financialYear);
      setEstimate(toTdsEstimate(dto.estimate));
    } catch {
      setEstimate(null);
    }
  }, [employeeId, financialYear]);

  const save = useCallback(async (input: TaxProfileInput, confirmRegimeChange = false) => {
    if (!employeeId) return false;
    const panError = validatePan(input.pan);
    if (panError) {
      setFieldErrors({ pan: panError });
      return false;
    }
    setFieldErrors({});
    setRegimeLock(null);
    setIsSaving(true);
    try {
      const dto = await api.saveTaxProfile(employeeId, {
        financial_year: financialYear,
        regime: input.regime,
        pan: input.pan,
        declarations: input.declarations,
        estimated_annual_tax: input.estimated_annual_tax ?? null,
        rent_paid_annual: input.rent_paid_annual,
        metro_city: input.metro_city,
        previous_employer: input.previous_employer,
        landlord: input.landlord,
        home_loan_lender: input.home_loan_lender,
        proofs: input.proofs,
        relief_89: input.relief_89,
        confirm_regime_change: confirmRegimeChange || undefined,
      });
      setProfile(dto.profile ? toTaxProfile(dto.profile) : null);
      if (dto.estimate) setEstimate(toTdsEstimate(dto.estimate));
      showSuccess('Tax profile saved');
      return true;
    } catch (err) {
      // 409 REGIME_LOCKED: TDS already went out under the current regime. Hold the input
      // so the dialog can resend it once the admin confirms.
      if (statusOf(err) === 409 && (err as { code?: string })?.code === 'REGIME_LOCKED') {
        pendingRef.current = input;
        setRegimeLock({
          deducted: Number((err as { data?: { deducted?: unknown } })?.data?.deducted) || 0,
          message: messageOf(err),
        });
        return false;
      }
      const field = serverFieldOf(err, PROFILE_FIELDS);
      if (field) setFieldErrors({ [field]: messageOf(err) });
      else showError(messageOf(err));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [employeeId, financialYear]);

  const confirmRegimeChange = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending) return false;
    pendingRef.current = null;
    return save(pending, true);
  }, [save]);

  // Runs both regimes over the same declarations so the admin can see which costs less
  // before committing the employee to one.
  const compareRegimes = useCallback(async (declarations: Record<string, number>) => {
    if (!employeeId) return;
    setIsComparing(true);
    try {
      const dto = await api.compareTaxRegimes(employeeId, financialYear, declarations);
      setComparison({
        financialYear: dto.comparison.financialYear,
        old: dto.comparison.old ? toTdsEstimate(dto.comparison.old) : null,
        new: dto.comparison.new ? toTdsEstimate(dto.comparison.new) : null,
        cheaper: dto.comparison.cheaper,
        saving: Number(dto.comparison.saving || 0),
      });
    } catch (err) {
      showError(messageOf(err));
      setComparison(null);
    } finally {
      setIsComparing(false);
    }
  }, [employeeId, financialYear]);

  // Income-tax rates are configured per financial year. Knowing this up front lets the
  // form say so before the admin fills it in, rather than failing on save.
  const isYearConfigured = configuredYears === null ? true : configuredYears.includes(financialYear);

  return {
    profile, estimate, comparison, isComparing, isLoading, isSaving, error, fieldErrors,
    configuredYears, isYearConfigured,
    regimeLock, dismissRegimeLock: () => { pendingRef.current = null; setRegimeLock(null); },
    save, confirmRegimeChange, refreshEstimate, compareRegimes, reload: load,
  };
}
