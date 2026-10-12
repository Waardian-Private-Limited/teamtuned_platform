'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/myLeave.api';
import { PREVIEW_DEBOUNCE_MS } from '../constants/leave.constants';
import { toQuote } from '../types/leave.mapper';
import type { LeaveType, Quote, Session } from '../types/leave.model';
import type { LeaveInputDto } from '../types/leave.dto';
import { allowsHalfDays, allowsHours, needsDocument } from '../utils/policyText';

/**
 * Applying for leave. The form only collects the answer; every rule (notice, limits, balance, the
 * document, approval) is checked by the server on each change through a preview, so what this shows
 * is what applying will do. The last preview answer wins; older ones are dropped.
 */
export function useApplyLeave(types: LeaveType[]) {
  // Comp-off is offered only while there is some to spend; a single choice is picked for the employee.
  const offered = useMemo(() => types.filter((t) => t.code !== 'COMPOFF' || (t.balance?.available ?? 0) > 0), [types]);
  const [typeId, setTypeId] = useState<number | null>(offered.length === 1 ? offered[0].id : null);
  // Dates start empty: the employee picks them.
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [startSession, setStartSession] = useState<Session>('full');
  const [endSession, setEndSession] = useState<Session>('full');
  const [byHour, setByHour] = useState(false);
  const [hours, setHours] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const type = types.find((t) => t.id === typeId) ?? null;
  const halfDays = !!type && allowsHalfDays(type.policy);
  const hourly = !!type && allowsHours(type.policy);
  const sameDay = start === end;

  // A choice the leave type does not allow is put back, so the form never asks for what will be refused.
  useEffect(() => {
    if (!halfDays) { setStartSession('full'); setEndSession('full'); }
    if (!hourly) setByHour(false);
  }, [halfDays, hourly]);
  useEffect(() => { if (!sameDay) setByHour(false); }, [sameDay]);

  const input = useMemo<LeaveInputDto | null>(() => {
    if (!typeId || !start || !end || end < start) return null;
    const hour = byHour && hourly && sameDay;
    return {
      leave_type_id: typeId, start_date: start, end_date: end, unit: hour ? 'hour' : 'day',
      start_session: hour ? 'full' : startSession, end_session: hour ? 'full' : sameDay ? startSession : endSession,
      hours: hour ? Number(hours) || null : null, has_attachment: !!file,
    };
  }, [typeId, start, end, startSession, endSession, byHour, hourly, sameDay, hours, file]);

  useEffect(() => {
    if (!input) { setQuote(null); return; }
    const controller = new AbortController();
    setChecking(true);
    const t = setTimeout(() => {
      api.preview(input, controller.signal)
        .then((dto) => { setQuote(toQuote(dto)); setError(null); })
        .catch((e) => { if (!controller.signal.aborted) setError(messageOf(e)); })
        .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    }, PREVIEW_DEBOUNCE_MS);
    return () => { clearTimeout(t); controller.abort(); };
  }, [input]);

  const documentNeeded = !!type && needsDocument(type.policy, quote?.days ?? null);
  const canSubmit = !!input && !!quote?.ok && !checking && !busy && (!documentNeeded || !!file);

  const submit = useCallback(async () => {
    if (!input || !canSubmit) return false;
    setBusy(true);
    setError(null);
    try {
      await api.apply(input, reason.trim(), file);
      return true;
    } catch (e) {
      setError(messageOf(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, [input, canSubmit, reason, file]);

  const setFrom = useCallback((v: string) => { setStart(v); setEnd((e) => (!e || e < v ? v : e)); }, []);

  return {
    offered, type, typeId, setTypeId, start, setStart: setFrom, end, setEnd, sameDay, startSession, setStartSession, endSession, setEndSession,
    halfDays, hourly, byHour, setByHour, hours, setHours, reason, setReason, file, setFile, documentNeeded,
    quote, checking, busy, error, canSubmit, submit,
  };
}
