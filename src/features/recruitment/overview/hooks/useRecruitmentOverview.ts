'use client';

import { useCallback, useEffect, useState } from 'react';
import { messageOf, statusOf } from '@/lib/api/errors';
import { orgToday } from '@/lib/datetime';
import * as api from '../../shared/api/recruitment.api';
import { toOverview, toPaged, toPosition } from '../../shared/types/recruitment.mapper';
import type { Position, RecruitmentOverview } from '../../shared/types/recruitment.model';

export interface AttentionItem {
  position: Position;
  reason: 'no_applicants' | 'past_close';
}

/** Overview KPIs + open positions that need a look (no applicants yet, or past closes_on). */
export function useRecruitmentOverview() {
  const [overview, setOverview] = useState<RecruitmentOverview | null>(null);
  const [attention, setAttention] = useState<AttentionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [ov, positions] = await Promise.all([
        api.getOverview(),
        api.listPositions({ status: 'open', pageSize: 100 }).catch(() => null),
      ]);
      setOverview(toOverview(ov));
      const today = orgToday();
      const items: AttentionItem[] = [];
      (positions ? toPaged(positions, toPosition).items : []).forEach((p) => {
        const total = Object.values(p.counts).reduce((a, b) => a + b, 0);
        if (p.closesOn && p.closesOn < today) items.push({ position: p, reason: 'past_close' });
        else if (total === 0) items.push({ position: p, reason: 'no_applicants' });
      });
      setAttention(items);
    } catch (err) {
      if (statusOf(err) === 403) setForbidden(true);
      else setError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { overview, attention, isLoading, error, forbidden, reload: load };
}
