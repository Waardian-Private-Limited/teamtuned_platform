'use client';

import { useCallback, useRef, useState } from 'react';
import * as mapperApi from '../api/siteSubOrgMapper.api';
import type { MappingFormInput } from '../types/siteSubOrgMapper.model';
import { ApiError, messageOf, statusOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import type { MappingFieldName } from '../constants/siteSubOrgMapper.constants';

export type FieldErrors = Partial<Record<MappingFieldName, string>>;

const SERVER_FIELD: Record<string, MappingFieldName> = {
  site_id: 'siteId',
  sub_org_id: 'subOrgId',
};

class FormValidationError extends Error {
  constructor(readonly fields: FieldErrors) {
    super('Invalid form');
  }
}

// Routes a server rejection onto the form field it names (the backend sends
// `field` alongside `code`/`message`); a duplicate pair lands on the site.
function toFieldErrors(err: unknown): FieldErrors | null {
  const status = statusOf(err);
  const serverField = err instanceof ApiError ? (err.data as { field?: unknown } | null)?.field : undefined;
  const field = typeof serverField === 'string' ? SERVER_FIELD[serverField] : undefined;
  if (field && status !== undefined && [400, 404, 409, 422].includes(status)) return { [field]: messageOf(err) };
  if (err instanceof ApiError && err.code === 'SITE_SUB_ORG_MAPPING_DUPLICATE') return { siteId: messageOf(err) };
  return null;
}

export function useMappingMutations(refetch: () => Promise<void>) {
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const inFlightRef = useRef(false);

  const run = useCallback(async (action: () => Promise<void>, successMessage: string) => {
    if (inFlightRef.current) return false;
    inFlightRef.current = true;
    setIsSaving(true);
    setFieldErrors({});
    try {
      await action();
      showSuccess(successMessage);
      return true;
    } catch (err) {
      if (err instanceof FormValidationError) {
        setFieldErrors(err.fields);
        return false;
      }
      const routed = toFieldErrors(err);
      if (routed) setFieldErrors(routed);
      else showError(messageOf(err));
      return false;
    } finally {
      inFlightRef.current = false;
      setIsSaving(false);
    }
  }, []);

  const createMapping = useCallback((input: MappingFormInput) => run(async () => {
    const errors: FieldErrors = {};
    if (!input.siteId) errors.siteId = 'Select a site';
    if (!input.subOrgId) errors.subOrgId = 'Select a sub-organization';
    if (Object.keys(errors).length) throw new FormValidationError(errors);

    await mapperApi.createMapping({ siteId: input.siteId as number, subOrgId: input.subOrgId as number });
    await refetch();
  }, 'Mapping created'), [refetch, run]);

  const deleteMapping = useCallback((id: number) => run(async () => {
    await mapperApi.deleteMapping(id);
    await refetch();
  }, 'Mapping deleted'), [refetch, run]);

  const clearFieldError = useCallback((field: MappingFieldName) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  return {
    isSaving,
    fieldErrors,
    clearFieldError,
    clearFieldErrors: () => setFieldErrors({}),
    createMapping,
    deleteMapping,
  };
}
