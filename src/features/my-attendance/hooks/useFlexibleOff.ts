'use client';

import { useCallback, useEffect, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/myAttendance.api';
import type { FlexibleOff } from '../types/flexibleOff.model';

/**
 * The signed-in employee's flexible week off for a month. Picking and giving back a date return the
 * month as the server now has it; every rule (past dates, quota, leave, holidays) is the server's,
 * and its message is kept for the card to show.
 */
export function useFlexibleOff(month: string, onChanged?: () => void) {
  const [data, setData] = useState<FlexibleOff | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api.getFlexibleOff(month, controller.signal)
      .then((d) => { setData(d); setError(null); })
      .catch((e) => { if (!controller.signal.aborted) setError(messageOf(e)); });
    return () => controller.abort();
  }, [month]);

  const run = useCallback(async (call: () => Promise<FlexibleOff>) => {
    setBusy(true);
    setError(null);
    try {
      setData(await call());
      onChanged?.();
      return true;
    } catch (e) {
      setError(messageOf(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, [onChanged]);

  return {
    data,
    busy,
    error,
    pick: (date: string) => run(() => api.pickFlexibleOff(date)),
    giveBack: (date: string) => run(() => api.cancelFlexibleOff(date)),
  };
}
