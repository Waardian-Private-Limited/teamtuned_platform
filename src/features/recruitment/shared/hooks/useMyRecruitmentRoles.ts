'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';

export type RecruitmentRole = 'interviewer' | 'hiring_manager' | 'reviewer';

interface MyRolesDto {
  interviewer: boolean;
  hiringManager: boolean;
  reviewer?: boolean;
  upcomingInterviews: number;
  pendingScorecards: number;
}

const TTL_MS = 5 * 60 * 1000;
let cached: { at: number; roles: RecruitmentRole[] } | null = null;
let inFlight: Promise<RecruitmentRole[]> | null = null;

function load(): Promise<RecruitmentRole[]> {
  if (cached && Date.now() - cached.at < TTL_MS) return Promise.resolve(cached.roles);
  inFlight = inFlight || apiClient.get<MyRolesDto>('/recruitment/me/roles', undefined, { withAuth: true })
    .then((r) => {
      const roles: RecruitmentRole[] = [...(r.interviewer ? ['interviewer' as const] : []), ...(r.hiringManager ? ['hiring_manager' as const] : []), ...(r.reviewer ? ['reviewer' as const] : [])];
      cached = { at: Date.now(), roles };
      return roles;
    })
    .catch(() => [] as RecruitmentRole[])
    .finally(() => { inFlight = null; });
  return inFlight;
}

/**
 * The hiring parts the signed-in employee plays without a recruitment permission (interview panel,
 * hiring manager), so the sidebar shows "My interviews" / "My hiring" only to them. One small
 * request, cached for five minutes across the app.
 */
export function useMyRecruitmentRoles(enabled = true): RecruitmentRole[] | undefined {
  const [roles, setRoles] = useState<RecruitmentRole[] | undefined>(cached?.roles);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    load().then((r) => { if (alive) setRoles(r); });
    return () => { alive = false; };
  }, [enabled]);
  return roles;
}
