'use client';

import { useCallback, useEffect, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/payrollRuns.api';
import type { PayrollSettingsDto, PayrollSettingsPatchDto } from '../types/payrollRuns.dto';

const DEFAULTS: PayrollSettingsDto = { finalizeApproval: false, payrollBySubOrg: true, documentName: 'assigned' };

function fromDto(s: Partial<PayrollSettingsDto> | null | undefined): PayrollSettingsDto {
  return {
    finalizeApproval: Boolean(s?.finalizeApproval),
    payrollBySubOrg: s?.payrollBySubOrg !== false,
    documentName: s?.documentName ?? DEFAULTS.documentName,
  };
}

export function usePayrollSettings(open: boolean, subOrgId: number | null) {
  const [settings, setSettings] = useState<PayrollSettingsDto>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .getSettings(subOrgId)
      .then((s) => {
        if (!cancelled) setSettings(fromDto(s));
      })
      .catch((err) => {
        if (!cancelled) setError(messageOf(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, subOrgId]);

  const save = useCallback(
    async (patch: PayrollSettingsPatchDto, optimistic: Partial<PayrollSettingsDto>) => {
      const prev = settings;
      setSettings({ ...prev, ...optimistic });
      setSaving(true);
      setError('');
      try {
        const saved = await api.saveSettings(subOrgId, patch);
        setSettings(fromDto(saved));
        const dropped = saved?.discardedDrafts ?? 0;
        showSuccess(dropped ? `Payroll settings saved. ${dropped} draft payroll${dropped === 1 ? '' : 's'} removed and planned again.` : 'Payroll settings saved');
      } catch (err) {
        setSettings(prev);
        setError(messageOf(err));
      } finally {
        setSaving(false);
      }
    },
    [settings, subOrgId]
  );

  return { ...settings, loading, saving, error, save };
}
