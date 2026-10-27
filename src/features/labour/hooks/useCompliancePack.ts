'use client';

import { useEffect, useState } from 'react';
import * as api from '../api/labour.api';
import type { CompliancePack } from '../types/labour.types';

/**
 * The compliance pack the site follows, fetched once the site is chosen. Null unless
 * `advancedOnboarding` is on and the site has a pack, which keeps the wizard step hidden.
 */
export function useCompliancePack(advancedOnboarding: boolean, siteId: number | null): CompliancePack | null {
  const [pack, setPack] = useState<CompliancePack | null>(null);
  useEffect(() => {
    if (!advancedOnboarding || !siteId) { setPack(null); return; }
    let off = false;
    api.packForSite(siteId).then((r) => { if (!off) setPack(r.pack); }).catch(() => { if (!off) setPack(null); });
    return () => { off = true; };
  }, [advancedOnboarding, siteId]);
  return pack;
}
