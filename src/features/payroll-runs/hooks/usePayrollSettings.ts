'use client';

import { useCallback, useEffect, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/payrollRuns.api';

export function usePayrollSettings(open: boolean, subOrgId: number | null) {
  const [finalizeApproval, setFinalizeApproval] = useState(false);
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
        if (!cancelled) setFinalizeApproval(Boolean(s.finalizeApproval));
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

  const toggle = useCallback(
    async (next: boolean) => {
      const prev = finalizeApproval;
      setFinalizeApproval(next);
      setSaving(true);
      setError('');
      try {
        const res = await api.saveSettings(subOrgId, next);
        setFinalizeApproval(Boolean(res?.finalizeApproval ?? next));
        showSuccess('Payroll settings saved');
      } catch (err) {
        setFinalizeApproval(prev);
        setError(messageOf(err));
      } finally {
        setSaving(false);
      }
    },
    [finalizeApproval, subOrgId]
  );

  return { finalizeApproval, loading, saving, error, toggle };
}
