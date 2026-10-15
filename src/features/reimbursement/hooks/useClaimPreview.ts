'use client';

import { useEffect, useRef, useState } from 'react';
import * as api from '../api/reimbursement.api';
import { PREVIEW_DEBOUNCE_MS } from '../constants/reimbursement.constants';
import { toPreview } from '../types/reimbursement.mapper';
import type { ClaimRequestDto } from '../types/reimbursement.dto';
import type { ClaimPreview } from '../types/reimbursement.model';

/**
 * Debounced live check of the report being written (`/me/claims/preview`, or `/claims/preview` for
 * HR filing for an employee). The body is compared
 * by its JSON so typing that changes nothing does not refetch. A failed preview is silent: the
 * submit path reports real errors.
 */
export function useClaimPreview(body: ClaimRequestDto | null, claimId: number | null, enabled: boolean, scope: 'me' | 'hr' = 'me') {
  const [preview, setPreview] = useState<ClaimPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const request = useRef(0);
  const json = enabled && body ? JSON.stringify(body) : '';

  useEffect(() => {
    if (!json) {
      setPreview(null);
      setIsLoading(false);
      return;
    }
    const id = ++request.current;
    const controller = new AbortController();
    setIsLoading(true);
    const t = setTimeout(() => {
      const sent = JSON.parse(json) as ClaimRequestDto;
      (scope === 'hr' ? api.previewClaim(sent, controller.signal) : api.previewMyClaim(sent, claimId, controller.signal))
        .then((dto) => id === request.current && setPreview(toPreview(dto)))
        .catch(() => id === request.current && setPreview(null))
        .finally(() => id === request.current && setIsLoading(false));
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [json, claimId, scope]);

  return { preview, isLoading };
}
