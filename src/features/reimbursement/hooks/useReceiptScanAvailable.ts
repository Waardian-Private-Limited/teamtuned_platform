'use client';

import { useEffect, useState } from 'react';
import { useFeatures } from '@/lib/hooks/useFeatures';
import * as api from '../api/reimbursement.api';
import { REIMBURSEMENT_AI_FEATURE } from '../constants/reimbursement.constants';

let cached: boolean | null = null;

/**
 * Whether HR can scan receipts when filing for an employee: `/overview` `features.ai`. The overview
 * needs view rights, so when it cannot be read the session's feature list decides.
 */
export function useReceiptScanAvailable(enabled: boolean) {
  const { hasFeature } = useFeatures();
  const fallback = hasFeature(REIMBURSEMENT_AI_FEATURE);
  const [ai, setAi] = useState<boolean | null>(cached);

  useEffect(() => {
    if (!enabled || cached !== null) return;
    let cancelled = false;
    api
      .getOverview()
      .then((dto) => {
        cached = Boolean(dto.features?.ai);
        if (!cancelled) setAi(cached);
      })
      .catch(() => {
        if (!cancelled) setAi(null);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return ai ?? fallback;
}
