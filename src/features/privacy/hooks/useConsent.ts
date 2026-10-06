'use client';

import { useCallback, useEffect, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { setToken } from '@/lib/auth/session';
import * as api from '../api/privacy.api';
import type { MyConsentResponseDto } from '../types/privacy.dto';
import { CONSENT_LANGUAGES, type ConsentLang } from '../constants/consentUi';

const LANG_KEY = 'tt.consent.lang';

function initialLang(): ConsentLang {
  try {
    const saved = window.localStorage.getItem(LANG_KEY);
    if (saved && CONSENT_LANGUAGES.some((l) => l.code === saved)) return saved as ConsentLang;
    const nav = window.navigator.language.slice(0, 2);
    if (CONSENT_LANGUAGES.some((l) => l.code === nav)) return nav as ConsentLang;
  } catch {
    // storage can be blocked; English is the fallback
  }
  return 'en';
}

export function useConsent() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [consent, setConsent] = useState<MyConsentResponseDto | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [read, setRead] = useState(false);
  const [lang, setLangState] = useState<ConsentLang>('en');

  useEffect(() => setLangState(initialLang()), []);

  const setLang = useCallback((next: ConsentLang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_KEY, next);
    } catch {
      // not persisted; still applied for this visit
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.getMyConsent();
      setConsent(res);
      setAccepted(res.accepted);
      setRead(res.accepted);
      // A returning user keeps what they already accepted ticked; anything new starts unticked.
      const before = new Set(res.notice.previously_accepted ?? []);
      setChecked(Object.fromEntries(res.notice.purposes.map((p) => [p.key, res.accepted || before.has(p.key)])));
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

  const canAccept = read && (consent?.notice.purposes ?? []).filter((p) => p.required).every((p) => checked[p.key] === true);

  const checkAllRequired = useCallback(() => {
    setChecked((c) => ({ ...c, ...Object.fromEntries((consent?.notice.purposes ?? []).map((p) => [p.key, c[p.key] || p.required])) }));
  }, [consent]);

  const accept = useCallback(async () => {
    if (!canAccept) return false;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.acceptConsent(checked, lang);
      if (res.token) setToken(res.token);
      setAccepted(true);
      return true;
    } catch (e) {
      setSubmitError(messageOf(e));
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [canAccept, checked, lang]);

  return { loading, loadError, consent, checked, toggle, canAccept, read, setRead, lang, setLang, checkAllRequired, submitting, submitError, accepted, accept, retryLoad: load };
}
