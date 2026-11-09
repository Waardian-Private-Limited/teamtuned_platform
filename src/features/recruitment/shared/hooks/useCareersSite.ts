'use client';

import { useEffect, useState } from 'react';
import * as api from '../api/recruitment.api';
import { useRecruitmentAccess } from './useRecruitmentAccess';
import { useRecruitmentOptions } from './useRecruitmentOptions';

type State = 'checking' | 'on' | 'off' | 'unknown';

/**
 * The organization's public careers page and company name, for the share / QR dialogs.
 * The recruitment options carry the link; when they have none (a server that does not send it yet),
 * the careers settings are asked directly (needs RECRUIT_SETTINGS). `state` says whether the page is
 * on, off, still being checked, or could not be checked (no settings access on an older server).
 */
export function useCareersSite() {
  const { options, loading } = useRecruitmentOptions();
  const { canSettings } = useRecruitmentAccess();
  const [fromSettings, setFromSettings] = useState<{ url: string | null; done: boolean }>({ url: null, done: false });
  const fromOptions = options.careers.url;

  useEffect(() => {
    if (loading || fromOptions || !canSettings) return undefined;
    let alive = true;
    api.getSettings()
      .then((s) => {
        const on = Boolean(Number(s?.hostedEnabled ?? 0) || s?.hostedEnabled === true);
        const root = on ? s?.hostedUrl || (s?.careersSlug ? `${window.location.origin}/careers/${s.careersSlug}` : null) : null;
        if (alive) setFromSettings({ url: root ? root.replace(/\/$/, '') : null, done: true });
      })
      .catch(() => { if (alive) setFromSettings({ url: null, done: true }); });
    return () => { alive = false; };
  }, [loading, fromOptions, canSettings]);

  const url = fromOptions || fromSettings.url;
  let state: State;
  if (url) state = 'on';
  else if (loading || (canSettings && !fromSettings.done)) state = 'checking';
  else if (canSettings || options.careers.known) state = 'off';
  else state = 'unknown';

  return { url, state, companyName: options.careers.companyName, canSettings };
}
