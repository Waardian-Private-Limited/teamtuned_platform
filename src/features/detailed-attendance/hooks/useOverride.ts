'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/detailedAttendance.api';
import { toImpact } from '../types/detailed.mapper';
import type { Impact, OverrideStatus } from '../types/detailed.model';

/**
 * The override form: the status chosen (or "remove the override"), the reason, and what the
 * engine says applying it would do. The preview is asked for as soon as a status is chosen, and
 * the answer to an older choice never replaces the answer to a newer one.
 */
export function useOverride(employeeId: number, date: string, hasOverride: boolean) {
  const [mode, setMode] = useState<'set' | 'clear'>('set');
  const [status, setStatus] = useState<OverrideStatus | null>(null);
  const [reason, setReason] = useState('');
  const [impact, setImpact] = useState<Impact | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useRef(0);

  const ready = mode === 'clear' ? hasOverride : status !== null;

  useEffect(() => {
    if (!ready) { setImpact(null); return undefined; }
    const id = ++run.current;
    const controller = new AbortController();
    setPreviewing(true);
    setError(null);
    api.previewOverride(employeeId, date, mode === 'clear' ? { clear: true } : { status: status! }, controller.signal)
      .then((res) => { if (id === run.current) setImpact(toImpact(res.impact)); })
      .catch((e) => { if (id === run.current && !controller.signal.aborted) { setImpact(null); setError(messageOf(e)); } })
      .finally(() => { if (id === run.current) setPreviewing(false); });
    return () => controller.abort();
  }, [employeeId, date, mode, status, ready]);

  const canSave = ready && reason.trim().length > 0 && !previewing && !saving && !!impact;

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      if (mode === 'clear') await api.clearOverride(employeeId, date, reason.trim());
      else await api.setOverride(employeeId, date, { status: status!, reason: reason.trim() });
      return true;
    } catch (e) {
      setError(messageOf(e));
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, employeeId, date, status, reason]);

  return { mode, setMode, status, setStatus, reason, setReason, impact, previewing, saving, error, canSave, save };
}
