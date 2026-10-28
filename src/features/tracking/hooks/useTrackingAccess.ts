'use client';

import { useAuth } from '@/context/AuthContext';

/**
 * Whether the signed-in user may open a tracking page that needs any of `codes`. Mirrors the backend's
 * authorizeOrgAdminOrPermissions: org admins and super admins always pass, HR mode passes, everyone else
 * needs one of the permissions. (The shared usePermission().can() passes every non-Employee role, which is
 * too loose to gate on by itself.)
 */
export function useTrackingAccess(codes: string[]) {
  const { role, permissions, loading } = useAuth();
  const r = (role || '').toLowerCase();
  const held = new Set((permissions || []).map((p) => (p || '').toUpperCase()));
  const allowed = r === 'orgadmin' || r === 'superadmin' || held.has('HR_MODE') || codes.some((c) => held.has(c.toUpperCase()));
  return { allowed, loading };
}
