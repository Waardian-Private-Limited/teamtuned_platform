'use client';

import { useCallback, useState } from 'react';
import { showError, showSuccess } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import * as api from '../../shared/api/recruitment.api';
import type { Position } from '../../shared/types/recruitment.model';

export type PositionStatusAction = 'publish' | 'unpublish' | 'pause' | 'resume' | 'close' | 'reopen';

/** Which quick actions a position offers in its current state. */
export function availableStatusActions(p: Pick<Position, 'status' | 'published'>): PositionStatusAction[] {
  const out: PositionStatusAction[] = [];
  if (p.status === 'draft') out.push('publish');
  if (p.status === 'open' || p.status === 'paused') out.push(p.published ? 'unpublish' : 'publish');
  if (p.status === 'open') out.push('pause');
  if (p.status === 'paused') out.push('resume');
  if (p.status === 'open' || p.status === 'paused' || p.status === 'draft') out.push('close');
  if (p.status === 'closed') out.push('reopen');
  return out;
}

export const STATUS_ACTION_LABELS: Record<PositionStatusAction, string> = {
  publish: 'Publish to careers',
  unpublish: 'Unpublish',
  pause: 'Pause',
  resume: 'Resume',
  close: 'Close position',
  reopen: 'Reopen',
};

const SUCCESS: Record<PositionStatusAction, string> = {
  publish: 'Published to careers',
  unpublish: 'Removed from careers',
  pause: 'Position paused',
  resume: 'Position reopened',
  close: 'Position closed',
  reopen: 'Position reopened',
};

/** PATCH /positions/:id/status for the quick actions. Draft → publish opens and publishes in one call. */
export function usePositionStatusActions(onDone?: () => void) {
  const [busyId, setBusyId] = useState<number | null>(null);

  const run = useCallback(async (p: Pick<Position, 'id' | 'status' | 'published'>, action: PositionStatusAction) => {
    setBusyId(p.id);
    try {
      const keep = p.status === 'paused' ? 'paused' : 'open';
      if (action === 'publish') await api.setPositionStatus(p.id, keep, true);
      else if (action === 'unpublish') await api.setPositionStatus(p.id, keep, false);
      else if (action === 'pause') await api.setPositionStatus(p.id, 'paused');
      else if (action === 'resume' || action === 'reopen') await api.setPositionStatus(p.id, 'open');
      else await api.setPositionStatus(p.id, 'closed');
      showSuccess(SUCCESS[action]);
      onDone?.();
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    } finally {
      setBusyId(null);
    }
  }, [onDone]);

  return { busyId, run };
}
