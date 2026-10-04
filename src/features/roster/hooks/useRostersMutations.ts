'use client';

import { useCallback, useState } from 'react';
import { messageOf, isRejectedInput, statusOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../api/roster.api';
import type { RosterRow } from '../types/roster.types';

export interface RosterFieldError {
  field: 'unit' | 'period';
  message: string;
}

export function useRostersMutations(onChanged: () => void) {
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [fieldError, setFieldError] = useState<RosterFieldError | null>(null);

  const clearFieldError = useCallback(() => setFieldError(null), []);

  const create = useCallback(
    async (unitId: number, periodStart: string, periodEnd: string): Promise<number | null> => {
      setSaving(true);
      setFieldError(null);
      try {
        const board = await api.createRoster({ unitId, periodStart, periodEnd });
        showSuccess('Roster created');
        onChanged();
        return board.roster.id;
      } catch (err) {
        if (isRejectedInput(err) || statusOf(err) === 409) {
          const message = messageOf(err);
          setFieldError({ field: /team/i.test(message) && !/period/i.test(message) ? 'unit' : 'period', message });
        } else {
          showError(messageOf(err));
        }
        return null;
      } finally {
        setSaving(false);
      }
    },
    [onChanged]
  );

  const archive = useCallback(
    async (row: RosterRow) => {
      setBusyId(row.id);
      try {
        await api.archiveRoster(row.id);
        showSuccess('Roster archived');
        onChanged();
        return true;
      } catch (err) {
        showError(messageOf(err));
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [onChanged]
  );

  const remove = useCallback(
    async (row: RosterRow) => {
      setBusyId(row.id);
      try {
        await api.deleteRoster(row.id);
        showSuccess('Roster deleted');
        onChanged();
        return true;
      } catch (err) {
        showError(messageOf(err));
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [onChanged]
  );

  return { saving, busyId, fieldError, clearFieldError, create, archive, remove };
}
