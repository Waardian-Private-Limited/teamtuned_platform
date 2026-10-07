'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/detailedAttendance.api';
import { toImpact } from '../types/detailed.mapper';
import type { Impact, OverrideForm, OverrideStatus } from '../types/detailed.model';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const PREVIEW_DELAY_MS = 400;

/**
 * The override form: the day's start and end time (always asked, starting from what was
 * recorded, else the rostered shift), an optional forced status, the reason, and what the
 * engine says applying it would do. The preview follows the times as they are typed; the answer
 * to an older entry never replaces the answer to a newer one. When a status was forced earlier,
 * "remove it" is offered as the other way out.
 */
export function useOverride(employeeId: number, date: string, form: OverrideForm) {
  const [mode, setMode] = useState<'set' | 'clear'>('set');
  const [inTime, setInTime] = useState(form.inTime ?? '');
  const [outTime, setOutTime] = useState(form.outTime ?? '');
  const [status, setStatus] = useState<OverrideStatus | ''>((['Present', 'Half-Day', 'Absent'] as string[]).includes(form.forcedStatus ?? '') ? (form.forcedStatus as OverrideStatus) : '');
  const [reason, setReason] = useState('');
  const [impact, setImpact] = useState<Impact | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useRef(0);

  const timesOk = TIME.test(inTime) && TIME.test(outTime);
  const ready = mode === 'clear' ? !!form.forcedStatus : timesOk;
  const nextDay = timesOk && outTime <= inTime;

  useEffect(() => {
    if (!ready) { setImpact(null); setPreviewing(false); return undefined; }
    const id = ++run.current;
    const controller = new AbortController();
    setPreviewing(true);
    setError(null);
    const timer = setTimeout(() => {
      api.previewOverride(employeeId, date, mode === 'clear' ? { clear: true } : { in_time: inTime, out_time: outTime, status: status || null }, controller.signal)
        .then((res) => { if (id === run.current) setImpact(toImpact(res.impact)); })
        .catch((e) => { if (id === run.current && !controller.signal.aborted) { setImpact(null); setError(messageOf(e)); } })
        .finally(() => { if (id === run.current) setPreviewing(false); });
    }, PREVIEW_DELAY_MS);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [employeeId, date, mode, inTime, outTime, status, ready]);

  const canSave = ready && reason.trim().length > 0 && !previewing && !saving && !!impact;

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      if (mode === 'clear') await api.clearOverride(employeeId, date, reason.trim());
      else await api.setOverride(employeeId, date, { in_time: inTime, out_time: outTime, status: status || null, reason: reason.trim() });
      return true;
    } catch (e) {
      setError(messageOf(e));
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, employeeId, date, inTime, outTime, status, reason]);

  return { mode, setMode, inTime, setInTime, outTime, setOutTime, status, setStatus, reason, setReason, nextDay, impact, previewing, saving, error, canSave, save };
}
