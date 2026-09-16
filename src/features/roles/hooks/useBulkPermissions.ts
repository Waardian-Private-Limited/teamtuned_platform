'use client';

import { useCallback, useState } from 'react';
import * as rolesApi from '../api/roles.api';
import { toBulkPreview, toBulkApply } from '../types/roles.mapper';
import type { BulkAction, BulkPreviewResult, BulkApplyResult } from '../types/roles.model';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';

// Drives the 3-step bulk drawer: roles -> sets/extra permissions -> action.
// Preview never writes; apply commits and refreshes the caller's role list.
export function useBulkPermissions(onApplied?: () => void) {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [preview, setPreview] = useState<BulkPreviewResult | null>(null);
  const [result, setResult] = useState<BulkApplyResult | null>(null);

  const runPreview = useCallback(async (roleIds: number[], setIds: number[], extraCodes: string[], action: BulkAction) => {
    setIsPreviewing(true);
    setPreview(null);
    try {
      const dto = await rolesApi.previewBulkPermissions({ roleIds, setIds, extraCodes, action });
      const mapped = toBulkPreview(dto);
      setPreview(mapped);
      return mapped;
    } catch (err) {
      showError(messageOf(err));
      return null;
    } finally {
      setIsPreviewing(false);
    }
  }, []);

  const apply = useCallback(async (roleIds: number[], setIds: number[], extraCodes: string[], action: BulkAction) => {
    setIsApplying(true);
    try {
      const dto = await rolesApi.applyBulkPermissions({ roleIds, setIds, extraCodes, action });
      const mapped = toBulkApply(dto);
      setResult(mapped);
      showSuccess(`Applied to ${mapped.roles.length} role${mapped.roles.length === 1 ? '' : 's'}`);
      onApplied?.();
      return mapped;
    } catch (err) {
      showError(messageOf(err));
      return null;
    } finally {
      setIsApplying(false);
    }
  }, [onApplied]);

  const reset = useCallback(() => {
    setPreview(null);
    setResult(null);
  }, []);

  return { isPreviewing, isApplying, preview, result, runPreview, apply, reset };
}
