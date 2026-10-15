'use client';

import { useEffect, useRef, useState } from 'react';
import * as api from '../api/reimbursement.api';
import { SEARCH_DEBOUNCE_MS } from '../constants/reimbursement.constants';
import { placeErrors } from '../utils/errors';

export interface ClaimMatchCount {
  /** null while unknown (first load, skipped or failed). */
  count: number | null;
  loading: boolean;
  /** Field errors from a 400 (e.g. `spent_to`), keyed like the export body. */
  fields: Record<string, string>;
  /** Any other failure, as one line. */
  error: string;
}

/**
 * "N expenses match": the list endpoint with the same filters and `pageSize=1`, debounced.
 * `params` null skips the call (dialog closed, picked claims, or a date range the form already rejects).
 */
export function useClaimMatchCount(scope: 'hr' | 'me', params: api.ClaimFilterParams | null, subOrgId?: number | null): ClaimMatchCount {
  const [state, setState] = useState<ClaimMatchCount>({ count: null, loading: false, fields: {}, error: '' });
  const request = useRef(0);
  const key = params ? JSON.stringify([scope, params, subOrgId ?? null]) : '';

  useEffect(() => {
    const id = ++request.current;
    if (!key) {
      setState({ count: null, loading: false, fields: {}, error: '' });
      return;
    }
    const [, p, sub] = JSON.parse(key) as [string, api.ClaimFilterParams, number | null];
    setState((s) => ({ ...s, loading: true }));
    const t = setTimeout(() => {
      const call =
        scope === 'me'
          ? api.listMyClaims({ ...p, page: 1, pageSize: 1 })
          : api.listClaims({ ...p, subOrgId: sub, page: 1, pageSize: 1 });
      call
        .then((dto) => id === request.current && setState({ count: Number(dto.total) || 0, loading: false, fields: {}, error: '' }))
        .catch((err) => {
          if (id !== request.current) return;
          const placed = placeErrors(err, () => true);
          setState({ count: null, loading: false, fields: placed.fields, error: placed.form });
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [key, scope]);

  return state;
}
