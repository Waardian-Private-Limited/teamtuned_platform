'use client';

import { useCallback, useEffect, useState } from 'react';
import * as api from '../api/payrollSetup.api';
import { toTaxProfile } from '../types/payroll-setup.mapper';
import type { RegimeComparison, TaxProfile, TdsEstimate } from '../types/payroll-setup.model';
import { messageOf } from '../utils/asyncAction';
import { showError, showSuccess } from '@/lib/toast';
import { validatePan } from '../utils/validators';
import type { TdsEstimateDto } from '../types/payroll-setup.dto';

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
      setEstimate(dto.estimate ? normalizeEstimate(dto.estimate) : null);
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
      setEstimate(normalizeEstimate(dto.estimate));
    } catch {
      setEstimate(null);
    }
  }, [employeeId, financialYear]);

  const save = useCallback(async (input: {
    regime: 'old' | 'new';
    pan: string;
    declarations: Record<string, number>;
    estimated_annual_tax?: number | null;
  }) => {
    if (!employeeId) return false;
    const panError = validatePan(input.pan);
    if (panError) {
      setFieldErrors({ pan: panError });
      return false;
    }
    setFieldErrors({});
    setIsSaving(true);
    try {
      const dto = await api.saveTaxProfile(employeeId, {
        financial_year: financialYear,
        regime: input.regime,
        pan: input.pan,
        declarations: input.declarations,
        estimated_annual_tax: input.estimated_annual_tax ?? null,
      });
      setProfile(dto.profile ? toTaxProfile(dto.profile) : null);
      if (dto.estimate) setEstimate(normalizeEstimate(dto.estimate));
      showSuccess('Tax profile saved');
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [employeeId, financialYear]);

  // Runs both regimes over the same declarations so the admin can see which costs less
  // before committing the employee to one.
  const compareRegimes = useCallback(async (declarations: Record<string, number>) => {
    if (!employeeId) return;
    setIsComparing(true);
    try {
      const dto = await api.compareTaxRegimes(employeeId, financialYear, declarations);
      setComparison({
        financialYear: dto.comparison.financialYear,
        old: dto.comparison.old ? normalizeEstimate(dto.comparison.old) : null,
        new: dto.comparison.new ? normalizeEstimate(dto.comparison.new) : null,
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
    save, refreshEstimate, compareRegimes, reload: load,
  };
}

function normalizeEstimate(dto: TdsEstimateDto): TdsEstimate {
  return {
    financialYear: dto.financialYear,
    projectedAnnualGross: Number(dto.projectedAnnualGross || 0),
    standardDeduction: Number(dto.standardDeduction || 0),
    declarationTotal: Number(dto.declarationTotal || 0),
    declarationsApplied: dto.declarationsApplied ?? {},
    declarationsIgnored: dto.declarationsIgnored ?? [],
    taxableIncome: Number(dto.taxableIncome || 0),
    ageBand: dto.ageBand ?? 'default',
    slabTax: Number(dto.slabTax || 0),
    rebate: Number(dto.rebate || 0),
    rebateRelief: Number(dto.rebateRelief || 0),
    surchargeRate: Number(dto.surchargeRate || 0),
    surcharge: Number(dto.surcharge || 0),
    surchargeRelief: Number(dto.surchargeRelief || 0),
    taxBeforeCess: Number(dto.taxBeforeCess || 0),
    cess: Number(dto.cess || 0),
    annualTax: Number(dto.annualTax || 0),
    deductedBeforeCycle: Number(dto.deductedBeforeCycle || 0),
    monthlyTds: Number(dto.monthlyTds || 0),
    remainingMonths: Number(dto.remainingMonths || 12),
    isProvisional: Boolean(dto.isProvisional),
  };
}
