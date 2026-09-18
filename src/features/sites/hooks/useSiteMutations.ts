'use client';

import { useCallback, useRef, useState } from 'react';
import * as sitesApi from '../api/sites.api';
import type { Site, SiteFormInput } from '../types/sites.model';
import { showError, showSuccess } from '@/lib/toast';
import { FieldValidationError, asFieldError } from '../utils/asyncAction';
import { ApiError, messageOf } from '@/lib/api/errors';
import {
  validateBudgetAmount,
  validateExpiryDate,
  validateGeofence,
  validateOptionalAmount,
  validateSiteCode,
  validateSiteName,
} from '../utils/validators';
import type { SiteFieldName } from '../constants/sites.constants';

export interface FieldError {
  field: SiteFieldName;
  message: string;
}

function validateForm(input: SiteFormInput): FieldError | null {
  const nameError = validateSiteName(input.name);
  if (nameError) return { field: 'name', message: nameError };
  const codeError = validateSiteCode(input.code);
  if (codeError) return { field: 'code', message: codeError };
  const geofenceError = validateGeofence(input);
  if (geofenceError) return { field: 'latitude', message: geofenceError };
  const expiryError = validateExpiryDate(input);
  if (expiryError) return { field: 'expiry_date', message: expiryError };
  const budgetError = validateBudgetAmount(input);
  if (budgetError) return { field: 'budget_amount', message: budgetError };
  if (input.hasBudget) {
    const finalError = validateOptionalAmount(input.finalBudgetAllocated, 'Final allocated budget');
    if (finalError) return { field: 'final_budget_allocated', message: finalError };
    const approvedError = validateOptionalAmount(input.actualBudgetApproved, 'Approved budget');
    if (approvedError) return { field: 'actual_budget_approved', message: approvedError };
  }
  return null;
}

export function useSiteMutations(
  refetch: () => Promise<void>,
  onOptimisticToggle?: (id: number, nextStatus: 'active' | 'inactive') => void
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

  const createSite = useCallback((input: SiteFormInput) => run(async () => {
    const validationError = validateForm(input);
    if (validationError) throw new FieldValidationError(validationError.field, validationError.message);

    await sitesApi
      .createSite(sitesApi.siteToUpsertInput(input))
      .catch((err: unknown) => asFieldError(err, 'code', [409]));

    await refetch();
  }, 'Site created'), [refetch, run]);

  const updateSite = useCallback((id: number, input: SiteFormInput) => run(async () => {
    const validationError = validateForm(input);
    if (validationError) throw new FieldValidationError(validationError.field, validationError.message);

    await sitesApi
      .updateSite(id, sitesApi.siteToUpsertInput(input))
      .catch((err: unknown) => asFieldError(err, 'code', [409]));

    await refetch();
  }, 'Site updated'), [refetch, run]);

  const toggleStatus = useCallback((site: Site) => run(async () => {
    const next = site.status === 'active' ? 'inactive' : 'active';
    setTogglingId(site.id);
    onOptimisticToggle?.(site.id, next);
    try {
      await sitesApi.updateSiteStatus(site.id, next);
      await refetch();
    } catch (err) {
      onOptimisticToggle?.(site.id, site.status);
      throw err;
    } finally {
      setTogglingId(null);
    }
  }), [refetch, run, onOptimisticToggle]);

  const deleteSite = useCallback(async (id: number) => {
    if (inFlightRef.current) return false;
    inFlightRef.current = true;
    setIsSaving(true);
    setDeleteBlockedMessage(null);
    try {
      await sitesApi.deleteSite(id);
      await refetch();
      showSuccess('Site removed');
      return true;
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'SITE_IN_USE' || err.status === 409)) {
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
    createSite,
    updateSite,
    toggleStatus,
    deleteSite,
    deleteBlockedMessage,
    clearDeleteBlockedMessage: () => setDeleteBlockedMessage(null),
  };
}
