'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as rolesApi from '../api/roles.api';
import { toPermissionSet } from '../types/roles.mapper';
import type { PermissionSet } from '../types/roles.model';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { FieldValidationError, asFieldError } from '../utils/asyncAction';
import { validateSetName } from '../utils/validators';

export function usePermissionSets() {
  const [sets, setSets] = useState<PermissionSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldError, setFieldError] = useState<{ field: 'name'; message: string } | null>(null);
  const inFlightRef = useRef(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const dto = await rolesApi.listPermissionSets();
      setSets((dto.sets || []).map(toPermissionSet));
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = useCallback(async (action: () => Promise<void>, successMessage?: string) => {
    if (inFlightRef.current) return false;
    inFlightRef.current = true;
    setIsSaving(true);
    setFieldError(null);
    try {
      await action();
      if (successMessage) showSuccess(successMessage);
      return true;
    } catch (err) {
      if (err instanceof FieldValidationError) setFieldError({ field: 'name', message: err.message });
      else showError(messageOf(err));
      return false;
    } finally {
      inFlightRef.current = false;
      setIsSaving(false);
    }
  }, []);

  const createSet = useCallback((input: { name: string; description: string; permissions: string[] }) => run(async () => {
    const nameError = validateSetName(input.name);
    if (nameError) throw new FieldValidationError('name', nameError);
    await rolesApi.createPermissionSet(input).catch((err: unknown) => asFieldError(err, 'name', [409]));
    await load();
  }, 'Permission set created'), [run, load]);

  const updateSet = useCallback((id: number, input: { name: string; description: string; permissions: string[] }) => run(async () => {
    const nameError = validateSetName(input.name);
    if (nameError) throw new FieldValidationError('name', nameError);
    await rolesApi.updatePermissionSet(id, input).catch((err: unknown) => asFieldError(err, 'name', [409]));
    await load();
  }, 'Permission set updated'), [run, load]);

  const deleteSet = useCallback((id: number) => run(async () => {
    await rolesApi.deletePermissionSet(id);
    await load();
  }, 'Permission set deleted'), [run, load]);

  return { sets, isLoading, isSaving, fieldError, clearFieldError: () => setFieldError(null), createSet, updateSet, deleteSet, refetch: load };
}
