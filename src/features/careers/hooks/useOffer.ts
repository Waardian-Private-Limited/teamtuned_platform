'use client';

import { useCallback, useEffect, useState } from 'react';
import { PublicApiError, fetchOffer, respondToOffer } from '../api/careers.api';
import type { OfferInfo } from '../types/careers.types';

type State = 'loading' | 'ready' | 'invalid' | 'error';

export function useOffer(token: string) {
  const [offer, setOffer] = useState<OfferInfo | null>(null);
  const [state, setState] = useState<State>('loading');
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState<'accept' | 'decline' | null>(null);
  const [respondError, setRespondError] = useState<{ field?: string; message: string } | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetchOffer(token, signal);
        setOffer(res);
        setState('ready');
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        if (err instanceof PublicApiError && err.status === 404) {
          setState('invalid');
          return;
        }
        setError(err instanceof Error ? err.message : 'Could not load the offer.');
        setState('error');
      }
    },
    [token]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const respond = useCallback(
    async (decision: 'accept' | 'decline', payload: { signatureName?: string; note?: string }): Promise<boolean> => {
      setResponding(decision);
      setRespondError(null);
      try {
        await respondToOffer(token, {
          decision,
          ...(decision === 'accept' ? { signature_name: payload.signatureName } : {}),
          ...(payload.note?.trim() ? { note: payload.note.trim() } : {}),
        });
        await load();
        return true;
      } catch (err) {
        if (err instanceof PublicApiError && (err.status === 409 || err.status === 410)) {
          // Offer changed state meanwhile (withdrawn, expired, already answered) — show the current state.
          await load();
          return true;
        }
        setRespondError({
          field: err instanceof PublicApiError ? err.field : undefined,
          message: err instanceof Error ? err.message : 'Could not send your response. Please try again.',
        });
        return false;
      } finally {
        setResponding(null);
      }
    },
    [token, load]
  );

  return { offer, state, error, responding, respondError, clearRespondError: () => setRespondError(null), respond, reload: () => load() };
}
