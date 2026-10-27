'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useFeatures } from '@/lib/hooks/useFeatures';
import { usePermission } from '@/lib/hooks/usePermission';
import { getSettings } from '../api/labour.api';
import { LABOUR_FEATURE } from '../constants/labour.constants';
import { getOrgTimezone, setOrgTimezone } from '../utils/format';

let loading = false;

export function useLabourAccess() {
  const { hasFeature } = useFeatures();
  const { can, canAny } = usePermission();
  // Every labour page shows times in the organization's time zone: fetch it once, share it through utils/format.
  useEffect(() => {
    if (getOrgTimezone() || loading) return;
    loading = true;
    getSettings().then((r) => setOrgTimezone(r.timezone)).catch(() => {}).finally(() => { loading = false; });
  }, []);
  return { enabled: hasFeature(LABOUR_FEATURE), can, canAny };
}

/** /org-admin/labour for admins, /employee/labour for staff with permissions. */
export function useLabourBasePath(): string {
  const pathname = usePathname() || '';
  return pathname.startsWith('/employee') ? '/employee/labour' : '/org-admin/labour';
}
