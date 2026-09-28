'use client';

import { useCallback, useEffect, useState } from 'react';
import * as policiesApi from '../api/policies.api';
import { toPolicyDetail, toPolicyVersionList, toPolicyImpact } from '../types/policies.mapper';
import type { PolicyDetail, PolicyVersion, PolicyImpact } from '../types/policies.model';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';

export function usePolicyDetail(id: number) {
  const [policy, setPolicy] = useState<PolicyDetail | null>(null);
  const [versions, setVersions] = useState<PolicyVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [impact, setImpact] = useState<PolicyImpact | null>(null);
  const [isLoadingImpact, setIsLoadingImpact] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [detailDto, versionsDto] = await Promise.all([
        policiesApi.getPolicy(id),
        policiesApi.listPolicyVersions(id),
      ]);
      setPolicy(toPolicyDetail(detailDto));
      setVersions(toPolicyVersionList(versionsDto.versions));
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveDraft = useCallback(async (config: any, changeNote?: string) => {
    setIsSaving(true);
    try {
      await policiesApi.updatePolicyDraft(id, { config, changeNote });
      await load();
      showSuccess('Draft saved');
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [id, load]);

  // Name, description, sub_organization_id and the draft's effective date go through the same
  // draft update endpoint as the config — renaming a policy must not touch
  // what is currently live either.
  const updateDetails = useCallback(async (input: { name: string; description: string; effectiveFrom: string; subOrganizationId?: number | null }) => {
    setIsSaving(true);
    try {
      await policiesApi.updatePolicyDraft(id, {
        name: input.name,
        description: input.description,
        effectiveFrom: input.effectiveFrom || undefined,
        subOrganizationId: input.subOrganizationId,
      });
      await load();
      showSuccess('Policy details updated');
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [id, load]);

  const loadImpact = useCallback(async () => {
    if (!policy?.draftVersion) return;
    setIsLoadingImpact(true);
    try {
      const dto = await policiesApi.previewPolicyImpact(id, policy.draftVersion.id);
      setImpact(toPolicyImpact(dto));
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setIsLoadingImpact(false);
    }
  }, [id, policy]);

  const publishDraft = useCallback(async () => {
    if (!policy?.draftVersion) return false;
    setIsSaving(true);
    try {
      await policiesApi.publishPolicyVersion(id, policy.draftVersion.id);
      await load();
      showSuccess('Policy published — now live for assigned employees');
      setImpact(null);
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [id, policy, load]);

  const rollbackTo = useCallback(async (toVersionId: number) => {
    setIsSaving(true);
    try {
      await policiesApi.rollbackPolicyVersion(id, toVersionId);
      await load();
      showSuccess('Rolled back to earlier version');
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [id, load]);

  return { policy, versions, isLoading, error, isSaving, refetch: load, saveDraft, updateDetails, publishDraft, rollbackTo, impact, isLoadingImpact, loadImpact };
}
