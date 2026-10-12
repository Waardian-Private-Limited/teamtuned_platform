'use client';

import { useCallback, useEffect, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/myLeave.api';
import { toDetail, toTimeline } from '../types/leave.mapper';
import type { LeaveRequestDetail, Timeline } from '../types/leave.model';

/** One of the employee's requests with its days and approval timeline, and withdrawing or cancelling it. */
export function useLeaveRequest(id: number | null) {
  const [detail, setDetail] = useState<LeaveRequestDetail | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!id) { setDetail(null); setTimeline(null); return; }
    const controller = new AbortController();
    setError(null);
    api.getRequest(id, controller.signal)
      .then(async (dto) => {
        const d = toDetail(dto);
        setDetail(d);
        // The timeline is a second, small read; a request that never went to approval has none.
        setTimeline(d.approvalId ? toTimeline(await api.getTimeline(d.approvalId, controller.signal)) : null);
      })
      .catch((e) => { if (!controller.signal.aborted) setError(messageOf(e)); });
    return () => controller.abort();
  }, [id, nonce]);

  useEffect(() => { setDetail(null); setTimeline(null); }, [id]);

  const cancel = useCallback(async (reason: string) => {
    if (!id) return false;
    setBusy(true);
    try {
      await api.cancel(id, reason.trim());
      setNonce((n) => n + 1);
      return true;
    } catch (e) {
      setError(messageOf(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, [id]);

  return { detail, timeline, error, busy, cancel };
}
