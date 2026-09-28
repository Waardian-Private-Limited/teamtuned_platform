'use client';

import { useCallback, useRef, useState } from 'react';
import * as api from '../api/otherLocations.api';
import type { OtherLocation, OtherLocationFormInput } from '../types/otherLocations.model';
import { showError, showSuccess } from '@/lib/toast';
import { FieldValidationError } from '../utils/asyncAction';
import { validateForm } from '../utils/validators';
import { ApiError, messageOf } from '@/lib/api/errors';
import type { OtherLocationFieldName } from '../constants/otherLocations.constants';

export interface FieldError {
  field: OtherLocationFieldName;
  message: string;
}

export function useOtherLocationMutations(
  refetch: () => Promise<void>,
  onOptimisticToggle?: (id: number, next: 'active' | 'inactive') => void
) {
  const [isSaving, setIsSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [fieldError, setFieldError] = useState<FieldError | null>(null);
  const [deleteBlockedMessage, setDeleteBlockedMessage] = useState<string | null>(null);
  const inFlightRef = useRef(false);

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
      if (err instanceof FieldValidationError) setFieldError({ field: err.field, message: err.message });
      else showError(messageOf(err));
      return false;
    } finally {
      inFlightRef.current = false;
      setIsSaving(false);
    }
  }, []);

  const createLocation = useCallback((input: OtherLocationFormInput) => run(async () => {
    const validationError = validateForm(input);
    if (validationError) throw new FieldValidationError(validationError.field, validationError.message);
    await api.createOtherLocation(api.toUpsertInput(input));
    await refetch();
  }, 'Location created'), [refetch, run]);

  const updateLocation = useCallback((id: number, input: OtherLocationFormInput) => run(async () => {
    const validationError = validateForm(input);
    if (validationError) throw new FieldValidationError(validationError.field, validationError.message);
    await api.updateOtherLocation(id, api.toUpsertInput(input));
    await refetch();
  }, 'Location updated'), [refetch, run]);

  const toggleStatus = useCallback((location: OtherLocation) => run(async () => {
    const next = location.status === 'active' ? 'inactive' : 'active';
    setTogglingId(location.id);
    onOptimisticToggle?.(location.id, next);
    try {
      await api.updateOtherLocationStatus(location.id, next);
      await refetch();
    } catch (err) {
      onOptimisticToggle?.(location.id, location.status);
      throw err;
    } finally {
      setTogglingId(null);
    }
  }), [refetch, run, onOptimisticToggle]);

  const deleteLocation = useCallback(async (id: number) => {
    if (inFlightRef.current) return false;
    inFlightRef.current = true;
    setIsSaving(true);
    setDeleteBlockedMessage(null);
    try {
      await api.deleteOtherLocation(id);
      await refetch();
      showSuccess('Location removed');
      return true;
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'OTHER_LOCATION_IN_USE' || err.status === 409)) {
        setDeleteBlockedMessage(messageOf(err));
        return false;
      }
      showError(messageOf(err));
      return false;
    } finally {
      inFlightRef.current = false;
      setIsSaving(false);
    }
  }, [refetch]);

  return {
    isSaving,
    togglingId,
    fieldError,
    clearFieldError: () => setFieldError(null),
    createLocation,
    updateLocation,
    toggleStatus,
    deleteLocation,
    deleteBlockedMessage,
    clearDeleteBlockedMessage: () => setDeleteBlockedMessage(null),
  };
}
