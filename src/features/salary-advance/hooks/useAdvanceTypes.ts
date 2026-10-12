'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/salaryAdvance.api';
import { toAdvanceTypeBody, toAdvanceTypeList } from '../types/salaryAdvance.mapper';
import type { AdvanceType, AdvanceTypeFieldErrors, AdvanceTypeFieldName, AdvanceTypeFormInput } from '../types/salaryAdvance.model';
import { SEARCH_DEBOUNCE_MS } from '../constants/salaryAdvance.constants';
import { routeError } from '../utils/errors';
import { invalidateAdvanceTypeOptions } from './useAdvanceTypeOptions';

export type AdvanceTypeStatusFilter = 'all' | 'active' | 'inactive';

const FIELDS: AdvanceTypeFieldName[] = ['code', 'name', 'description'];

export function useAdvanceTypes() {
  const [types, setTypes] = useState<AdvanceType[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AdvanceTypeStatusFilter>('all');
  const [subOrgId, setSubOrgId] = useState<number | null>(null);
  const request = useRef(0);

  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AdvanceTypeFieldErrors>({});
  const [formError, setFormError] = useState('');
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const id = ++request.current;
    setIsFetching(true);
    setError('');
    try {
      const dto = await api.listTypes({ search, status, subOrgId, pageSize: 200 });
      if (id === request.current) setTypes(toAdvanceTypeList(dto).types);
    } catch (err) {
      if (id === request.current) setError(messageOf(err));
    } finally {
      if (id === request.current) {
        setIsFetching(false);
        setIsInitialLoading(false);
      }
    }
  }, [search, status, subOrgId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const clearFormErrors = useCallback(() => {
    setFieldErrors({});
    setFormError('');
  }, []);

  const save = useCallback(
    async (input: AdvanceTypeFormInput, id?: number) => {
      setIsSaving(true);
      clearFormErrors();
      try {
        const body = toAdvanceTypeBody(input);
        if (id) await api.updateType(id, body);
        else await api.createType(body);
        showSuccess(id ? 'Advance type saved' : 'Advance type created');
        invalidateAdvanceTypeOptions();
        load();
        return true;
      } catch (err) {
        routeError(err, FIELDS, setFieldErrors, setFormError);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [clearFormErrors, load]
  );

  const toggleStatus = useCallback(
    async (type: AdvanceType) => {
      const next = type.status === 'active' ? 'inactive' : 'active';
      setTogglingId(type.id);
      setError('');
      try {
        await api.setTypeStatus(type.id, next);
        setTypes((list) => list.map((t) => (t.id === type.id ? { ...t, status: next } : t)));
        invalidateAdvanceTypeOptions();
        showSuccess(next === 'active' ? `${type.name} is active` : `${type.name} is inactive`);
      } catch (err) {
        setError(messageOf(err));
      } finally {
        setTogglingId(null);
      }
    },
    []
  );

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setStatus('all');
  }, []);

  return {
    types,
    isInitialLoading,
    isFetching,
    error,
    searchInput,
    setSearchInput,
    status,
    setStatus,
    subOrgId,
    setSubOrgId,
    clearFilters,
    hasActiveFilters: Boolean(search) || status !== 'all',
    isSaving,
    fieldErrors,
    setFieldErrors,
    formError,
    clearFormErrors,
    save,
    toggleStatus,
    togglingId,
  };
}
