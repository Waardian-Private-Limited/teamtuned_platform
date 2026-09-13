'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket, disconnectSocket } from '@/lib/socket';
import * as authApi from '../api/auth.api';
import { toAuthOutcome } from '../model/auth.mapper';
import { QR, type QrStatus } from '../constants/auth.constants';
import { useAuthSuccess } from './useAuthSuccess';

/**
 * QR sign-in: mint a session token, render it, and wait for the mobile app to
 * confirm. A socket carries the confirmation; HTTP polling only starts if the
 * socket fails to connect, so the happy path makes no polling requests.
 */
export function useQrLogin() {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<QrStatus>('pending');
  const [isLoading, setIsLoading] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Identifies the live token so responses from a refreshed-away session are dropped.
  const activeTokenRef = useRef<string | null>(null);
  const requestSeqRef = useRef(0);

  const onAuthSuccess = useAuthSuccess();

  const stop = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (expiryRef.current) clearTimeout(expiryRef.current);
    if (graceRef.current) clearTimeout(graceRef.current);
    pollRef.current = expiryRef.current = graceRef.current = null;
    disconnectSocket();
  }, []);

  const complete = useCallback(
    async (payload: Parameters<typeof toAuthOutcome>[0]) => {
      stop();
      const outcome = toAuthOutcome(payload);
      if (outcome.kind !== 'authenticated') return;
      if (outcome.token) {
        // Mirror the bearer token into an httpOnly cookie so middleware sees it.
        try {
          await authApi.exchangeQrTokenForCookie(outcome.token);
        } catch {
          // Cookie is a convenience; the bearer token alone still authenticates.
        }
      }
      onAuthSuccess(outcome.user, outcome.token, payload);
    },
    [onAuthSuccess, stop]
  );

  const startPolling = useCallback(
    (sessionToken: string) => {
      pollRef.current = setInterval(async () => {
        if (activeTokenRef.current !== sessionToken) return stop();
        try {
          const poll = await authApi.fetchQrStatus(sessionToken);
          if (activeTokenRef.current !== sessionToken) return stop();

          if (poll.status === 'scanned') setStatus('scanned');
          if (poll.status === 'confirmed') {
            setStatus('confirmed');
            await complete(poll);
          }
          if (poll.success === false) {
            setStatus('expired');
            stop();
          }
        } catch (err) {
          if (activeTokenRef.current !== sessionToken) return stop();
          // Only a definitive "this session is gone" ends the loop; keep retrying transient errors.
          const httpStatus = (err as { status?: number })?.status;
          if (httpStatus === 400 || httpStatus === 404 || httpStatus === 410) {
            setStatus('expired');
            stop();
          }
        }
      }, QR.pollIntervalMs);
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
      // A newer refresh started while this request was in flight — discard it.
      if (seq !== requestSeqRef.current || !data.success) return;

      activeTokenRef.current = data.token;
      setToken(data.token);

      expiryRef.current = setTimeout(() => {
        if (activeTokenRef.current !== data.token) return;
        setStatus('expired');
        stop();
      }, QR.expiryMs);

      const socket = getSocket(undefined, true);
      if (socket) {
        const join = () => {
          if (activeTokenRef.current === data.token) socket.emit('join_qr', data.token);
        };
        if (socket.connected) join();
        else socket.on('connect', join);

        socket.off('qr_login_success');
        socket.on('qr_login_success', async (response: Parameters<typeof toAuthOutcome>[0]) => {
          if (activeTokenRef.current !== data.token) return;
          setStatus('confirmed');
          await complete(response);
        });
      }

      graceRef.current = setTimeout(() => {
        if (activeTokenRef.current !== data.token) return;
        if (getSocket(undefined, true)?.connected) return;
        startPolling(data.token);
      }, QR.socketGraceMs);
    } catch {
      setStatus('expired');
    } finally {
      if (seq === requestSeqRef.current) setIsLoading(false);
    }
  }, [complete, startPolling, stop]);

  // Mint one session on mount and tear everything down on unmount.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    refreshRef.current();
    return () => {
      activeTokenRef.current = null;
      if (pollRef.current) clearInterval(pollRef.current);
      if (expiryRef.current) clearTimeout(expiryRef.current);
      if (graceRef.current) clearTimeout(graceRef.current);
      disconnectSocket();
    };
  }, []);

  return { token, status, isLoading, refresh };
}
