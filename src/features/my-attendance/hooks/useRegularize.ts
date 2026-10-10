'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/myAttendance.api';
import { toOptions, toRequest } from '../types/regularization.mapper';
import { asksIn, asksOut, isTimeKind } from '../types/regularization.model';
import type { RegularizationKind, RegularizationOptions } from '../types/regularization.model';

/** The wall-clock date and time right now in the organization's timezone. */
function orgNow(timezone: string) {
  const now = new Date();
  return {
    date: now.toLocaleDateString('en-CA', { timeZone: timezone }),
    time: now.toLocaleTimeString('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }),
  };
}

/**
 * One day's regularization for the signed-in employee: what the policy allows, what they chose, and
 * sending it. Every rule comes from the server; this only holds the form and keeps it consistent.
 * Nothing is shown about what a request would change: the reviewer decides that.
 */
export function useRegularize(date: string) {
  const [options, setOptions] = useState<RegularizationOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [kinds, setKinds] = useState<RegularizationKind[]>([]);
  const [inTime, setInTime] = useState('');
  const [outTime, setOutTime] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api.getRegularizationOptions(date, controller.signal)
      .then((dto) => {
        const o = toOptions(dto);
        const now = orgNow(o.timezone);
        // A shift time that has not come yet today is not offered: it would be refused as a future time.
        const shiftTime = (t: string | null) => (t && (o.date !== now.date || t <= now.time) ? t : '');
        setOptions(o);
        setInTime(o.day.recordedIn ?? shiftTime(o.day.shiftStart));
        setOutTime(o.day.recordedOut ?? shiftTime(o.day.shiftEnd));
        // The first fix that changes punch times is chosen already, so the common case starts at the times.
        const first = o.kinds.find(isTimeKind);
        setKinds(first && o.eligible && !(o.request?.status === 'pending') ? [first] : []);
        setLoadError(null);
      })
      .catch((e) => { if (!controller.signal.aborted) setLoadError(messageOf(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date, nonce]);

  const timeKind = useMemo(() => kinds.find(isTimeKind) ?? null, [kinds]);
  const needsIn = asksIn(timeKind);
  const needsOut = asksOut(timeKind);
  const timesReady = (!needsIn || inTime !== '') && (!needsOut || outTime !== '');
  const canSubmit = !!options && options.eligible && kinds.length > 0 && timesReady && reason.trim().length > 0 && !busy;

  /** Picks or drops a fix. Choosing a time fix replaces the one chosen before; waivers combine with anything. */
  const toggle = useCallback((kind: RegularizationKind) => {
    setKinds((current) => {
      if (current.includes(kind)) return current.filter((k) => k !== kind);
      return [...(isTimeKind(kind) ? current.filter((k) => !isTimeKind(k)) : current), kind];
    });
  }, []);

  const submit = useCallback(async () => {
    if (!canSubmit) return false;
    setBusy(true);
    setError(null);
    try {
      const request = toRequest(await api.submitRegularization({
        date,
        kinds,
        ...(needsIn ? { in_time: inTime } : {}),
        ...(needsOut ? { out_time: outTime } : {}),
        reason: reason.trim(),
        client_at: new Date().toISOString(),
        client_tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }, file));
      setOptions((o) => (o ? { ...o, eligible: false, blockedReason: 'ATTENDANCE_REGULARIZE_ALREADY_REQUESTED', request } : o));
      return true;
    } catch (e) {
      setError(messageOf(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, [canSubmit, date, kinds, needsIn, needsOut, inTime, outTime, reason, file]);

  const withdraw = useCallback(async () => {
    const id = options?.request?.id;
    if (!id) return false;
    setBusy(true);
    setError(null);
    try {
      await api.cancelRegularization(id);
      setReason('');
      setFile(null);
      setNonce((n) => n + 1); // the day is open again: read what can be asked for now
      return true;
    } catch (e) {
      setError(messageOf(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, [options]);

  return { options, loading, loadError, kinds, toggle, timeKind, needsIn, needsOut, inTime, setInTime, outTime, setOutTime, reason, setReason, file, setFile, busy, error, canSubmit, submit, withdraw };
}
