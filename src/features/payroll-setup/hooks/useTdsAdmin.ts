'use client';

import { useCallback, useEffect, useState } from 'react';
import * as api from '../api/payrollSetup.api';
import { toChallan, toTdsSettings } from '../types/payroll-setup.mapper';
import type { TdsChallan, TdsSettings } from '../types/payroll-setup.model';
import { messageOf } from '../utils/asyncAction';
import { showError, showSuccess } from '@/lib/toast';
import { currentFinancialYear } from '../constants/payroll-setup.constants';

export function useTdsAdmin() {
  const [settings, setSettings] = useState<TdsSettings | null>(null);
  const [subOrganizationId, setSubOrganizationId] = useState(0);
  const [challans, setChallans] = useState<TdsChallan[]>([]);
  const [financialYear, setFinancialYear] = useState(currentFinancialYear());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [settingsDto, challansDto] = await Promise.all([
        api.getTdsSettings(subOrganizationId),
        api.listTdsChallans(financialYear),
      ]);
      setSettings(toTdsSettings(settingsDto.settings));
      setChallans((challansDto.challans || []).map(toChallan));
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, [financialYear, subOrganizationId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = useCallback(async (input: TdsSettings) => {
    if (isSaving) return false;
    setIsSaving(true);
    try {
      const dto = await api.saveTdsSettings({
        sub_organization_id: String(subOrganizationId),
        employer_tan: input.employerTan,
        employer_pan: input.employerPan,
        signatory_name: input.signatoryName,
        signatory_designation: input.signatoryDesignation,
        place: input.place,
      });
      setSettings(toTdsSettings(dto.settings));
      showSuccess('TDS settings saved');
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, subOrganizationId]);

  const saveChallan = useCallback(async (input: {
    id?: number;
    financial_year: string;
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    bsr_code?: string;
    challan_serial_no?: string;
    deposit_date?: string;
    amount: number;
  }) => {
    if (isSaving) return false;
    setIsSaving(true);
    try {
      await api.saveTdsChallan(input, input.id);
      await load();
      showSuccess(input.id ? 'Challan updated' : 'Challan added');
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, load]);

  const deleteChallan = useCallback(async (id: number) => {
    try {
      await api.deleteTdsChallan(id);
      await load();
      showSuccess('Challan removed');
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    }
  }, [load]);

  return {
    settings,
    setSettings,
    subOrganizationId,
    setSubOrganizationId,
    challans,
    financialYear,
    setFinancialYear,
    isLoading,
    isSaving,
    error,
    saveSettings,
    saveChallan,
    deleteChallan,
    reload: load,
  };
}
