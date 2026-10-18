'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as employeeSitesApi from '../api/employeeSites.api';
import { toEmployeeSiteDetail, toOtherLocation, toSiteOption } from '../types/employeeSites.mapper';
import type { AssignedSite, EmployeeSiteDetail, OtherLocation, SiteOption } from '../types/employeeSites.model';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { SITE_SEARCH_DEBOUNCE_MS, type EmployeeSiteFieldName } from '../constants/employeeSites.constants';

type FieldErrors = Partial<Record<EmployeeSiteFieldName, string>>;

// Backend validation details name the request field; map them onto the
// drawer's fields so the error lands as a red border on the right control.
const SERVER_FIELD: Record<string, EmployeeSiteFieldName> = {
  sites: 'sites',
  primary_site_id: 'primary',
  location_access: 'locationAccess',
  location_ids: 'otherLocations',
};

function serverField(err: unknown): EmployeeSiteFieldName | null {
  if (!(err instanceof ApiError) || err.status >= 500) return null;
  const field = (err.data as { field?: unknown } | null)?.field;
  return typeof field === 'string' ? SERVER_FIELD[field] ?? null : null;
}

function sameIds(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

function siteKey(sites: AssignedSite[]) {
  return sites.map((s) => `${s.siteId}:${s.isPrimary ? 1 : 0}`).sort().join(',');
}

export function useEmployeeSiteEditor(employeeId: number | null, onSaved?: () => void) {
  const [detail, setDetail] = useState<EmployeeSiteDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [sites, setSites] = useState<AssignedSite[]>([]);
  const [locationAccess, setLocationAccessState] = useState('assigned');
  const [otherLocationIds, setOtherLocationIds] = useState<number[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const [allOtherLocations, setAllOtherLocations] = useState<OtherLocation[]>([]);
  const [siteTerm, setSiteTerm] = useState('');
  const [siteOptions, setSiteOptions] = useState<SiteOption[]>([]);
  const [siteOptionsLoading, setSiteOptionsLoading] = useState(false);

  const savingRef = useRef(false);

  const applyDetail = useCallback((next: EmployeeSiteDetail) => {
    setDetail(next);
    setSites(next.sites);
    setLocationAccessState(next.locationAccess);
    setOtherLocationIds(next.otherLocations.map((l) => l.id));
    setFieldErrors({});
  }, []);

  // Load the employee whenever the drawer opens on someone new.
  useEffect(() => {
    if (!employeeId) {
      setDetail(null);
      setLoadError('');
      setSiteTerm('');
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setLoadError('');
    setDetail(null);
    employeeSitesApi.getEmployeeSites(employeeId)
      .then((dto) => { if (!cancelled) applyDetail(toEmployeeSiteDetail(dto)); })
      .catch((err) => { if (!cancelled) setLoadError(messageOf(err)); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [employeeId, applyDetail]);

  // The org's other locations change rarely; load them once per open.
  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    employeeSitesApi.listOtherLocations()
      .then((dto) => { if (!cancelled) setAllOtherLocations((dto.locations || []).map(toOtherLocation)); })
      .catch(() => { if (!cancelled) setAllOtherLocations([]); });
    return () => { cancelled = true; };
  }, [employeeId]);

  // Server-side site search, debounced, narrowed to sites this employee's
  // company may use.
  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    setSiteOptionsLoading(true);
    const timeout = setTimeout(() => {
      employeeSitesApi.searchSiteOptions({ search: siteTerm, employeeId })
        .then((dto) => { if (!cancelled) setSiteOptions((dto.sites || []).map(toSiteOption)); })
        .catch(() => { if (!cancelled) setSiteOptions([]); })
        .finally(() => { if (!cancelled) setSiteOptionsLoading(false); });
    }, SITE_SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [employeeId, siteTerm]);

  const clearError = useCallback((field: EmployeeSiteFieldName) => {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }, []);

  const addSite = useCallback((option: SiteOption) => {
    setSites((prev) => {
      if (prev.some((s) => s.siteId === option.id)) return prev;
      return [
        ...prev,
        {
          siteId: option.id,
          name: option.name,
          code: option.code,
          city: option.city,
          status: 'active',
          // The first site becomes primary on its own.
          isPrimary: prev.length === 0,
          isIncharge: false,
        },
      ];
    });
    clearError('sites');
    clearError('primary');
  }, [clearError]);

  const removeSite = useCallback((siteId: number) => {
    setSites((prev) => {
      const next = prev.filter((s) => s.siteId !== siteId);
      // Keep a primary when the removed one was it.
      if (next.length && !next.some((s) => s.isPrimary)) next[0] = { ...next[0], isPrimary: true };
      return next;
    });
    clearError('sites');
    clearError('primary');
  }, [clearError]);

  const setPrimary = useCallback((siteId: number) => {
    setSites((prev) => prev.map((s) => ({ ...s, isPrimary: s.siteId === siteId })));
    clearError('primary');
  }, [clearError]);

  const setLocationAccess = useCallback((value: string) => {
    setLocationAccessState(value);
    clearError('locationAccess');
  }, [clearError]);

  const toggleOtherLocation = useCallback((id: number) => {
    setOtherLocationIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    clearError('otherLocations');
  }, [clearError]);

  const sitesChanged = Boolean(detail) && (siteKey(sites) !== siteKey(detail!.sites) || locationAccess !== detail!.locationAccess);
  const otherChanged = Boolean(detail) && !sameIds(otherLocationIds, detail!.otherLocations.map((l) => l.id));
  const isDirty = sitesChanged || otherChanged;

  // Assigned locations stay listed even if they were deactivated, so they can
  // still be removed.
  const otherLocationChoices = useMemo(() => {
    const assigned = new Set(detail?.otherLocations.map((l) => l.id) || []);
    const list = allOtherLocations.filter((l) => (l.status || 'active') === 'active' || assigned.has(l.id));
    for (const l of detail?.otherLocations || []) {
      if (!list.some((x) => x.id === l.id)) list.push(l);
    }
    return list;
  }, [allOtherLocations, detail]);

  const save = useCallback(async () => {
    if (!employeeId || !detail || savingRef.current) return false;
    if (sites.length > 1 && sites.filter((s) => s.isPrimary).length !== 1) {
      setFieldErrors({ primary: 'Choose one primary site' });
      return false;
    }

    savingRef.current = true;
    setIsSaving(true);
    setFieldErrors({});
    let next = detail;
    try {
      if (sitesChanged) {
        const dto = await employeeSitesApi.updateEmployeeSites(employeeId, {
          sites: sites.map((s) => ({ site_id: s.siteId, is_primary: s.isPrimary })),
          location_access: locationAccess,
        });
        next = toEmployeeSiteDetail(dto);
      }
    } catch (err) {
      const field = serverField(err);
      if (field) setFieldErrors({ [field]: messageOf(err) });
      else showError(messageOf(err));
      savingRef.current = false;
      setIsSaving(false);
      return false;
    }

    try {
      if (otherChanged) {
        await employeeSitesApi.updateEmployeeOtherLocations(employeeId, otherLocationIds);
        const assigned = new Set(otherLocationIds);
        next = { ...next, otherLocations: otherLocationChoices.filter((l) => assigned.has(l.id)) };
      }
      applyDetail(next);
      showSuccess('Site assignment saved');
      onSaved?.();
      return true;
    } catch (err) {
      // Sites may already be saved; keep that as the new baseline but leave
      // the picked locations on screen so the user can retry.
      setDetail(next);
      setFieldErrors({ otherLocations: messageOf(err) });
      if (sitesChanged) onSaved?.();
      return false;
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [employeeId, detail, sites, locationAccess, otherLocationIds, otherLocationChoices, sitesChanged, otherChanged, applyDetail, onSaved]);

  const reset = useCallback(() => {
    if (detail) applyDetail(detail);
  }, [detail, applyDetail]);

  return {
    detail,
    isLoading,
    loadError,
    sites,
    addSite,
    removeSite,
    setPrimary,
    locationAccess,
    setLocationAccess,
    otherLocationIds,
    toggleOtherLocation,
    otherLocationChoices,
    siteTerm,
    setSiteTerm,
    siteOptions,
    siteOptionsLoading,
    fieldErrors,
    isSaving,
    isDirty,
    save,
    reset,
  };
}
