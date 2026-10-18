'use client';

import { useCallback, useRef, useState } from 'react';
import * as api from '../api/employeeDevices.api';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';

type BusyAction = { kind: 'reset' | 'allow'; userId: number } | { kind: 'logout'; sessionId: number } | null;

// Reset, allow and log out. `onDone` reloads whatever shows the result
// (the list row and the open drawer).
export function useEmployeeDeviceActions(onDone: () => void) {
  const [busy, setBusy] = useState<BusyAction>(null);
  const inFlightRef = useRef(false);

  const run = useCallback(async (action: BusyAction, call: () => Promise<{ message?: string }>, fallback: string) => {
    if (inFlightRef.current || !action) return false;
    inFlightRef.current = true;
    setBusy(action);
    try {
      const res = await call();
      showSuccess(res?.message || fallback);
      onDone();
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    } finally {
      inFlightRef.current = false;
      setBusy(null);
    }
  }, [onDone]);

  const reset = useCallback(
    (userId: number) => run({ kind: 'reset', userId }, () => api.resetEmployeeDevice(userId), 'Registered phone removed'),
    [run]
  );
  const allow = useCallback(
    (userId: number) => run({ kind: 'allow', userId }, () => api.allowPendingDevice(userId), 'New phone allowed'),
    [run]
  );
  const logout = useCallback(
    (sessionId: number) => run({ kind: 'logout', sessionId }, () => api.logoutDeviceSession(sessionId), 'Session logged out'),
    [run]
  );

  return { busy, reset, allow, logout };
}
