'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as authApi from '../api/auth.api';
import { toAuthOutcome } from '../types/auth.mapper';
import { QR, type QrStatus } from '../constants/auth.constants';
import { useAuthSuccess } from './useAuthSuccess';

// Long-poll: server parks each request until the phone confirms (Redis pub/sub) or ~25s passes.
// One idle HTTP request per open login page; no sockets, no DB.
export function useQrLogin() {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<QrStatus>('pending');
  const [isLoading, setIsLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const expiryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTokenRef = useRef<string | null>(null);
  const requestSeqRef = useRef(0);

  const onAuthSuccess = useAuthSuccess();

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (expiryRef.current) clearTimeout(expiryRef.current);
    expiryRef.current = null;
  }, []);

  const complete = useCallback(
    async (payload: Parameters<typeof toAuthOutcome>[0]) => {
      stop();
      const outcome = toAuthOutcome(payload);
      if (outcome.kind !== 'authenticated') return;
      if (outcome.token) {
        try {
          await authApi.exchangeQrTokenForCookie(outcome.token);
        } catch {
          // Cookie already set by the status response; exchange is a fallback.
        }
      }
      onAuthSuccess(outcome.user, outcome.token, payload);
    },
    [onAuthSuccess, stop]
  );

  const listen = useCallback(
    async (sessionToken: string, controller: AbortController) => {
      let failures = 0;
      while (activeTokenRef.current === sessionToken && !controller.signal.aborted) {
        try {
          const poll = await authApi.fetchQrStatus(sessionToken, controller.signal);
          if (activeTokenRef.current !== sessionToken) return;
          failures = 0;

          if (poll.status === 'confirmed') {
            setStatus('confirmed');
            await complete(poll);
            return;
          }
          if (poll.success === false) {
            setStatus('expired');
            stop();
            return;
          }
          if (poll.status === 'scanned') setStatus('scanned');
        } catch (err) {
          if (controller.signal.aborted || activeTokenRef.current !== sessionToken) return;
          const httpStatus = (err as { status?: number })?.status;
          if (httpStatus === 400 || httpStatus === 404 || httpStatus === 410) {
            setStatus('expired');
            stop();
            return;
          }
          // Network blip / 5xx / proxy timeout: back off, then re-park.
          failures += 1;
          await new Promise((r) => setTimeout(r, Math.min(QR.retryBaseMs * 2 ** failures, QR.retryMaxMs)));
        }
      }
    },
    [complete, stop]
  );

  const refresh = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    setIsLoading(true);
    setStatus('pending');
    stop();

    try {
      const data = await authApi.generateQrSession();
      if (seq !== requestSeqRef.current || !data.success) return;

      activeTokenRef.current = data.token;
      setToken(data.token);

      expiryRef.current = setTimeout(() => {
        if (activeTokenRef.current !== data.token) return;
        setStatus('expired');
        stop();
      }, QR.expiryMs);

      const controller = new AbortController();
      abortRef.current = controller;
      void listen(data.token, controller);
    } catch {
      setStatus('expired');
    } finally {
      if (seq === requestSeqRef.current) setIsLoading(false);
    }
  }, [listen, stop]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    refreshRef.current();
    return () => {
      activeTokenRef.current = null;
      stop();
    };
  }, [stop]);

  return { token, status, isLoading, refresh };
}
