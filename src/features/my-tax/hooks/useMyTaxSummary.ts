'use client';

import { useEffect, useState } from 'react';
import * as api from '../api/myTax.api';
import { toMyTax } from '../types/myTax.mapper';
import type { Regime } from '../types/myTax.model';
import { useTaxEligibility } from './useTaxEligibility';

export interface MyTaxSummary {
  regime: Regime;
  monthlyTds: number | null;
}

/**
 * Regime and monthly TDS for the card on My profile. Asks for the full tax read only
 * once the (cached) eligibility check says tax applies.
 */
export function useMyTaxSummary() {
  const eligible = useTaxEligibility();
  const [summary, setSummary] = useState<MyTaxSummary | null>(null);

  useEffect(() => {
    if (!eligible) return;
    let cancelled = false;
    api
      .getMyTax()
      .then((dto) => {
        if (cancelled) return;
        const tax = toMyTax(dto);
        setSummary({
          regime: tax.profile?.regime ?? tax.estimate?.regime ?? 'new',
          monthlyTds: tax.estimate ? tax.estimate.monthlyTds : null,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [eligible]);

  return { eligible: Boolean(eligible), summary };
}
