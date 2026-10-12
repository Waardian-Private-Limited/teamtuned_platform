'use client';

import { useCallback, useEffect, useState } from 'react';
import * as api from '../api/payrollSetup.api';
import { toChallan, toTdsSettings } from '../types/payroll-setup.mapper';
import type { ChallanCompanyFilter, TdsChallan, TdsSettings } from '../types/payroll-setup.model';
import { messageOf } from '../utils/asyncAction';
import { showError, showSuccess } from '@/lib/toast';
import { currentFinancialYear } from '../constants/payroll-setup.constants';

export function useTdsAdmin() {
  const [settings, setSettings] = useState<TdsSettings | null>(null);
  const [subOrganizationId, setSubOrganizationId] = useState(0);
  const [challans, setChallans] = useState<TdsChallan[]>([]);
  const [financialYear, setFinancialYear] = useState(currentFinancialYear());
  const [challanCompany, setChallanCompany] = useState<ChallanCompanyFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [challansLoading, setChallansLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const settingsDto = await api.getTdsSettings(subOrganizationId);
      setSettings(toTdsSettings(settingsDto.settings));
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, [subOrganizationId]);

  const loadChallans = useCallback(async () => {
    setChallansLoading(true);
    try {
      const challansDto = await api.listTdsChallans(
        financialYear,
        challanCompany === 'all' ? undefined : challanCompany
      );
      setChallans((challansDto.challans || []).map(toChallan));
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setChallansLoading(false);
    }
  }, [financialYear, challanCompany]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadChallans();
  }, [loadChallans]);

  const load = useCallback(async () => {
    await Promise.all([loadSettings(), loadChallans()]);
  }, [loadSettings, loadChallans]);

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
    sub_organization_id: number | null;
  }) => {
    if (isSaving) return false;
    setIsSaving(true);
    try {
      const { id, ...payload } = input;
      await api.saveTdsChallan(payload, id);
      await loadChallans();
      showSuccess(input.id ? 'Challan updated' : 'Challan added');
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, loadChallans]);

  const deleteChallan = useCallback(async (id: number) => {
    try {
      await api.deleteTdsChallan(id);
      await loadChallans();
      showSuccess('Challan removed');
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    }
  }, [loadChallans]);

  return {
    settings,
    setSettings,
    subOrganizationId,
    setSubOrganizationId,
    challans,
    challansLoading,
    challanCompany,
    setChallanCompany,
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
