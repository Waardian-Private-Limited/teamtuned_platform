'use client';

import { useCallback, useMemo } from 'react';
import { showError, showSuccess } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import { cancelAvailability, createAvailability, listAvailability } from '../api/roster.api';
import { listShiftTemplates } from '@/features/shift-templates/api/shiftTemplates.api';
import { useEmployeeRosterQuery } from './useEmployeeRosterQuery';

export function useMyRosterAvailability() {
  const list = useEmployeeRosterQuery(() => listAvailability({ scope: 'mine' }), 'my-availability');
  const shifts = useEmployeeRosterQuery(
    async () => {
      try {
        const res = await listShiftTemplates({ status: 'active', page: 1, pageSize: 100 });
        return res.shifts.map((s) => ({ id: s.id, name: s.name }));
      } catch {
        return [] as { id: number; name: string }[];
      }
    },
    'availability-shifts'
  );

  const shiftNames = useMemo(() => new Map((shifts.data || []).map((s) => [s.id, s.name])), [shifts.data]);

  const add = useCallback(
    async (body: Parameters<typeof createAvailability>[0]): Promise<string | null> => {
      try {
        const res = await createAvailability(body);
        showSuccess(res.status === 'pending' ? 'Sent for approval. This is inside the notice window, so a manager must approve it.' : 'Saved');
        void list.reload();
        return null;
      } catch (err) {
        return messageOf(err);
      }
    },
    [list]
  );

  const cancel = useCallback(
    async (id: number) => {
      try {
        await cancelAvailability(id);
        showSuccess('Entry cancelled');
        void list.reload();
      } catch (err) {
        showError(messageOf(err));
      }
    },
    [list]
  );

  return {
    entries: list.data?.availability || [],
    loading: list.loading && !list.data,
    error: list.error,
    reload: list.reload,
    shiftOptions: shifts.data || [],
    shiftNames, add, cancel,
  };
}
