'use client';

import { useEffect, useState } from 'react';
import * as api from '../api/recruitment.api';
import { useRecruitmentAccess } from './useRecruitmentAccess';
import { useRecruitmentOptions } from './useRecruitmentOptions';

/**
 * The organization's public careers page (null while the hosted page is off) and company name, for the
 * share / QR dialogs. Comes with the recruitment options; a server that does not send it yet is asked
 * through the careers settings instead (needs RECRUIT_SETTINGS).
 */
export function useCareersSite() {
  const { options, loading } = useRecruitmentOptions();
  const { canSettings } = useRecruitmentAccess();
  const [fallback, setFallback] = useState<string | null>(null);
  const known = options.careers.known;

  useEffect(() => {
    if (loading || known || !canSettings) return undefined;
    let alive = true;
    api.getSettings()
      .then((s) => {
        if (!alive || !s?.hostedEnabled) return;
        const root = s.hostedUrl || (s.careersSlug ? `${window.location.origin}/careers/${s.careersSlug}` : null);
        setFallback(root ? root.replace(/\/$/, '') : null);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [loading, known, canSettings]);

  return { url: known ? options.careers.url : fallback, companyName: options.careers.companyName, canSettings };
}
