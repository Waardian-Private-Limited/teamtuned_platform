'use client';

import { useMemo } from 'react';
import { usePermission } from '@/lib/hooks/usePermission';
import { ALL_RECRUIT_PERMISSIONS, RECRUIT_PERMISSIONS } from '../constants/recruitment.constants';

/**
 * Recruitment capability flags for the signed-in user (org admin passes all).
 * These only shape the UI; the server re-checks every call, and implicit
 * access (hiring manager, panelist) is decided there.
 */
export function useRecruitmentAccess() {
  const { can, canAny, isOrgAdmin } = usePermission();
  return useMemo(() => ({
    isOrgAdmin,
    canView: canAny([RECRUIT_PERMISSIONS.VIEW, RECRUIT_PERMISSIONS.MANAGE]),
    canManage: can(RECRUIT_PERMISSIONS.MANAGE),
    canOffer: can(RECRUIT_PERMISSIONS.OFFER),
    canHire: can(RECRUIT_PERMISSIONS.HIRE) && can('EMP_ADD'),
    canSettings: can(RECRUIT_PERMISSIONS.SETTINGS),
    hasAny: canAny([...ALL_RECRUIT_PERMISSIONS]),
  }), [can, canAny, isOrgAdmin]);
}

export type RecruitmentAccess = ReturnType<typeof useRecruitmentAccess>;
