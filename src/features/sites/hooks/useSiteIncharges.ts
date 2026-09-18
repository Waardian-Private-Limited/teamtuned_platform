'use client';

import { useCallback, useEffect, useState } from 'react';
import * as sitesApi from '../api/sites.api';
import { toInchargeCandidates, toSiteIncharges } from '../types/sites.mapper';
import type { SiteIncharge, SiteInchargeCandidate } from '../types/sites.model';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';

export function useSiteIncharges(siteId: number | null, onChanged?: () => void) {
  const [incharges, setIncharges] = useState<SiteIncharge[]>([]);
  const [candidates, setCandidates] = useState<SiteInchargeCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadIncharges = useCallback(async () => {
    if (!siteId) return;
    setIsLoading(true);
    try {
      const dto = await sitesApi.listSiteIncharges(siteId);
      setIncharges(toSiteIncharges(dto));
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    if (siteId) loadIncharges();
    else setIncharges([]);
  }, [siteId, loadIncharges]);

  const searchCandidates = useCallback(async (term: string) => {
    setCandidatesLoading(true);
    try {
      const dto = await sitesApi.listInchargeCandidates(term);
      setCandidates(toInchargeCandidates(dto.candidates));
    } catch {
      setCandidates([]);
    } finally {
      setCandidatesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (siteId) searchCandidates('');
  }, [siteId, searchCandidates]);

  const assignIncharge = useCallback(
    async (employeeId: number) => {
      if (!siteId) return;
      setIsSaving(true);
      try {
        await sitesApi.assignSiteIncharge(siteId, employeeId);
        showSuccess('Site incharge assigned');
        await loadIncharges();
        await searchCandidates('');
        onChanged?.();
      } catch (err) {
        showError(messageOf(err));
      } finally {
        setIsSaving(false);
      }
    },
    [siteId, loadIncharges, searchCandidates, onChanged]
  );

  const removeIncharge = useCallback(
    async (employeeId: number) => {
      if (!siteId) return;
      setIsSaving(true);
      try {
        await sitesApi.removeSiteIncharge(siteId, employeeId);
        showSuccess('Site incharge removed');
        await loadIncharges();
        await searchCandidates('');
        onChanged?.();
      } catch (err) {
        showError(messageOf(err));
      } finally {
        setIsSaving(false);
      }
    },
    [siteId, loadIncharges, searchCandidates, onChanged]
  );

  return {
    incharges,
    candidates,
    isLoading,
    candidatesLoading,
    isSaving,
    searchCandidates,
    assignIncharge,
    removeIncharge,
    refetch: loadIncharges,
  };
}
