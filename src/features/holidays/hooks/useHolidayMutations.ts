'use client';

import { useState } from 'react';
import { messageOf, statusOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../api/holidays.api';
import type { Holiday, HolidayInput } from '../types/holidays';

export interface HolidayFieldError { field: string; message: string }

export function useHolidayMutations(refetch: () => Promise<void> | void) {
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<HolidayFieldError | null>(null);

  async function run(action: () => Promise<unknown>, ok: string): Promise<boolean> {
    if (saving) return false;
    setSaving(true);
    setFieldError(null);
    try {
      await action();
      showSuccess(ok);
      await refetch();
      return true;
    } catch (err) {
      const status = statusOf(err);
      const data = (err as { data?: { field?: string } })?.data;
      if (status && [400, 404, 409, 422].includes(status) && data?.field) setFieldError({ field: data.field, message: messageOf(err) });
      else if (status === 409) setFieldError({ field: 'name', message: messageOf(err) });
      else showError(messageOf(err));
      return false;
    } finally {
      setSaving(false);
    }
  }

  return {
    saving, fieldError, clearFieldError: () => setFieldError(null),
    create: (input: HolidayInput) => run(() => api.createHoliday(input), 'Holiday added'),
    update: (id: number, input: HolidayInput) => run(() => api.updateHoliday(id, input), 'Holiday updated'),
    remove: (h: Holiday) => run(() => api.deleteHoliday(h.id), 'Holiday deleted'),
    toggle: (h: Holiday) => run(() => api.setHolidayStatus(h.id, h.status === 'active' ? 'inactive' : 'active'), h.status === 'active' ? 'Holiday turned off' : 'Holiday turned on'),
    copy: (from: number, to: number) => run(async () => {
      const r = await api.copyHolidays(from, to);
      showSuccess(`${r.created} copied, ${r.skipped} already there`);
    }, 'Done'),
  };
}
