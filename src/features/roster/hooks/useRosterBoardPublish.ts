'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, messageOf, statusOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/roster.api';
import type { DiffChange } from '../types/roster.types';

export interface Clash {
  employee_id: number;
  work_date: string;
  unit_id: number | null;
}

function clashesOf(err: unknown): Clash[] {
  if (!(err instanceof ApiError)) return [];
  const data = err.data as { details?: { clashes?: Clash[] }; error?: { details?: { clashes?: Clash[] } } } | null;
  return data?.details?.clashes ?? data?.error?.details?.clashes ?? [];
}

export function useRosterBoardPublish(rosterId: number, open: boolean, version: number, onPublished: () => Promise<unknown>) {
  const [changes, setChanges] = useState<DiffChange[]>([]);
  const [employeeIds, setEmployeeIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [clashes, setClashes] = useState<Clash[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    setPublishError('');
    setClashes([]);
    api
      .diffRoster(rosterId)
      .then((res) => {
        if (cancelled) return;
        setChanges(res.changes);
        setEmployeeIds(res.employeeIds);
      })
      .catch((err) => !cancelled && setLoadError(messageOf(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, rosterId]);

  const publish = useCallback(
    async (notify: boolean) => {
      setPublishing(true);
      setPublishError('');
      setClashes([]);
      try {
        const res = await api.publishRoster(rosterId, { version, notify });
        showSuccess(`Published. ${res.employees} employee${res.employees === 1 ? '' : 's'} updated.`);
        await onPublished();
        return true;
      } catch (err) {
        setPublishError(messageOf(err));
        if (statusOf(err) === 409) setClashes(clashesOf(err));
        return false;
      } finally {
        setPublishing(false);
      }
    },
    [rosterId, version, onPublished]
  );

  return { changes, employeeIds, loading, loadError, publishing, publishError, clashes, publish };
}
