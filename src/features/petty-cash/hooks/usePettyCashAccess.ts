'use client';

import { useFeatures } from '@/lib/hooks/useFeatures';
import { usePermission } from '@/lib/hooks/usePermission';
import { PETTY_CASH_FEATURE } from '../constants/petty-cash.constants';

/** Whether the org has the feature, and the caller's permission checks for the petty-cash codes. */
export function usePettyCashAccess() {
  const { hasFeature } = useFeatures();
  const { can, canAny } = usePermission();
  return { enabled: hasFeature(PETTY_CASH_FEATURE), can, canAny };
}
