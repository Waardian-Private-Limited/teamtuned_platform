'use client';

import { useCallback, useEffect, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { setToken } from '@/lib/auth/session';
import * as api from '../api/privacy.api';
import type { MyConsentResponseDto } from '../types/privacy.dto';

export function useConsent() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [consent, setConsent] = useState<MyConsentResponseDto | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.getMyConsent();
      setConsent(res);
      setAccepted(res.accepted);
      setChecked(Object.fromEntries(res.notice.purposes.map((p) => [p.key, res.accepted])));
    } catch (e) {
      setLoadError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback((key: string, value: boolean) => {
    setChecked((c) => ({ ...c, [key]: value }));
    setSubmitError(null);
  }, []);

  const canAccept = (consent?.notice.purposes ?? []).filter((p) => p.required).every((p) => checked[p.key] === true);

  const accept = useCallback(async () => {
    if (!canAccept) return false;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.acceptConsent(checked);
      if (res.token) setToken(res.token);
      setAccepted(true);
      return true;
    } catch (e) {
      setSubmitError(messageOf(e));
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [canAccept, checked]);

  return { loading, loadError, consent, checked, toggle, canAccept, submitting, submitError, accepted, accept, retryLoad: load };
}
