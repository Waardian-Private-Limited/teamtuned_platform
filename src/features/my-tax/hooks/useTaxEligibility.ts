'use client';

import { useEffect, useState } from 'react';
import * as api from '../api/myTax.api';

const TTL_MS = 5 * 60 * 1000;
let cached: { at: number; eligible: boolean } | null = null;
let inFlight: Promise<boolean> | null = null;

function load(): Promise<boolean> {
  if (cached && Date.now() - cached.at < TTL_MS) return Promise.resolve(cached.eligible);
  inFlight = inFlight || api.getMyTaxEligibility()
    .then((r) => {
      cached = { at: Date.now(), eligible: Boolean(r.eligible) };
      return cached.eligible;
    })
    .catch(() => false)
    .finally(() => { inFlight = null; });
  return inFlight;
}

/**
 * Whether income tax is deducted from the signed-in employee's pay, so the sidebar shows
 * "Tax declaration" and My profile shows the tax card only to them. One small request,
 * cached for five minutes across the app; undefined until known.
 */
export function useTaxEligibility(enabled = true): boolean | undefined {
  const [eligible, setEligible] = useState<boolean | undefined>(cached?.eligible);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    load().then((e) => { if (alive) setEligible(e); });
    return () => { alive = false; };
  }, [enabled]);
  return eligible;
}
