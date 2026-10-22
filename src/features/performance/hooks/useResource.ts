'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/perf.api';
import type { Resource } from '../api/perf.api';
import type { StatusFilter } from '../types/perf.types';

export type FieldErrors = Record<string, string>;

/** Field errors the server names, falling back to the first field. */
export function errorsOf(err: unknown, fallback: string): FieldErrors {
  if (err instanceof ApiError) {
    const data = err.data as { field?: string; errors?: FieldErrors } | null;
    if (data?.errors && Object.keys(data.errors).length) return data.errors;
    if (data?.field) return { [data.field]: err.message };
  }
  return { [fallback]: messageOf(err) };
}

/** One library list (KRAs, KPIs, ...): loading, the active/archived filter, saving and archiving. */
export function useResource<T extends { id: number }>(resource: Resource, subOrgId: number | null) {
  const [status, setStatus] = useState<StatusFilter>('active');
  const [items, setItems] = useState<T[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoadError('');
    api.list<T>(resource, status, subOrgId)
      .then((d) => setItems(d.items))
      .catch((e) => setLoadError(messageOf(e)));
  }, [resource, status, subOrgId]);
  useEffect(() => { setItems(null); load(); }, [load]);

  /** Resolves with the saved row, or null when the server refused (errors are then set). */
  const save = useCallback(async (id: number | null, body: unknown, firstField = 'name'): Promise<T | null> => {
    setSaving(true);
    setErrors({});
    try {
      const row = await api.save<T>(resource, id, body);
      showSuccess(id ? 'Saved' : 'Added');
      load();
      return row;
    } catch (err) {
      setErrors(errorsOf(err, firstField));
      return null;
    } finally {
      setSaving(false);
    }
  }, [resource, load]);

  const archive = useCallback(async (id: number, archived: boolean) => {
    try {
      await api.setArchived(resource, id, archived);
      showSuccess(archived ? 'Archived' : 'Restored');
      load();
      return '';
    } catch (err) {
      return messageOf(err);
    }
  }, [resource, load]);

  const clearErrors = useCallback(() => setErrors({}), []);
  return { status, setStatus, items, loadError, errors, clearErrors, saving, save, archive, reload: load };
}
