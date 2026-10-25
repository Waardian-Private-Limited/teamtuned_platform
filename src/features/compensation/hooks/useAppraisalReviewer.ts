'use client';

import { useEffect, useState } from 'react';
import * as api from '../api/compensation.api';

const TTL_MS = 5 * 60 * 1000;
let cached: { at: number; open: boolean } | null = null;
let inFlight: Promise<boolean> | null = null;

function load(): Promise<boolean> {
  if (cached && Date.now() - cached.at < TTL_MS) return Promise.resolve(cached.open);
  inFlight = inFlight || api.teamAppraisalStatus()
    .then((r) => {
      cached = { at: Date.now(), open: Boolean(r.has_reviews) };
      return cached.open;
    })
    .catch(() => false)
    .finally(() => { inFlight = null; });
  return inFlight;
}

/** Forget the cached answer (after a manager submits, so the menu follows). */
export function resetAppraisalReviewer() {
  cached = null;
}

/**
 * Whether the signed-in employee has people to rate in an open appraisal, so the sidebar shows "Team appraisals" only to
 * them. One small request, cached for five minutes across the app; undefined until known.
 */
export function useAppraisalReviewer(enabled = true): boolean | undefined {
  const [open, setOpen] = useState<boolean | undefined>(cached?.open);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    load().then((v) => { if (alive) setOpen(v); });
    return () => { alive = false; };
  }, [enabled]);
  return open;
}
