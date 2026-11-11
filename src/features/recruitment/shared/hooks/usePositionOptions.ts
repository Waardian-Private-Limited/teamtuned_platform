'use client';

import { useCallback, useState } from 'react';
import * as api from '../api/recruitment.api';
import { toPaged, toPosition } from '../types/recruitment.mapper';

/** Open positions to pick from (closed and filled ones take no candidates). */
export function usePositionOptions(enabled: boolean) {
  const [options, setOptions] = useState<Array<{ value: number; label: string; description?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const search = useCallback((term: string) => {
    if (!enabled) return;
    setLoading(true);
    api.listPositions({ search: term, pageSize: 50 })
      .then((dto) => setOptions(toPaged(dto, toPosition).items
        .filter((p) => !['closed', 'filled'].includes(p.status))
        .map((p) => ({ value: p.id, label: p.title, description: [p.department?.name, p.status].filter(Boolean).join(' · ') }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [enabled]);
  return { options, loading, search };
}
