'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/jobCatalogs.api';
import { CATALOG_COPY } from '../constants/jobCatalogs.constants';
import { toCatalogItem } from '../types/jobCatalogs.mapper';
import type { CatalogField, CatalogFormInput, CatalogItem, CatalogKind } from '../types/jobCatalogs.model';

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** One catalog (grades or cost centres): the list, and saving or deleting an item. */
export function useJobCatalog(kind: CatalogKind) {
  const noun = CATALOG_COPY[kind].noun;
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState<Partial<Record<CatalogField, string>>>({});
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoadError('');
    api.listCatalog(kind)
      .then((d) => setItems((d.items || []).map(toCatalogItem)))
      .catch((e) => setLoadError(messageOf(e)));
  }, [kind]);
  useEffect(load, [load]);

  /** Resolves true when saved; a rejection lands on the field the server names. */
  const save = useCallback(async (id: number | null, input: CatalogFormInput) => {
    setSaving(true);
    setErrors({});
    try {
      await api.saveCatalogItem(kind, id, input);
      showSuccess(id ? `${capital(noun)} updated` : `${capital(noun)} added`);
      load();
      return true;
    } catch (err) {
      const field = err instanceof ApiError ? (err.data as { field?: CatalogField } | null)?.field : undefined;
      setErrors({ [field && field !== 'id' ? field : 'name']: messageOf(err) });
      return false;
    } finally {
      setSaving(false);
    }
  }, [kind, noun, load]);

  // A refused delete (still in use) is shown on the row itself.
  const remove = useCallback(async (item: CatalogItem) => {
    setRowError(null);
    try {
      await api.deleteCatalogItem(kind, item.id);
      showSuccess(`${capital(noun)} removed`);
      load();
    } catch (err) {
      setRowError({ id: item.id, message: messageOf(err) });
    }
  }, [kind, noun, load]);

  const clearErrors = useCallback(() => setErrors({}), []);

  return { items, loadError, errors, clearErrors, rowError, saving, save, remove };
}
