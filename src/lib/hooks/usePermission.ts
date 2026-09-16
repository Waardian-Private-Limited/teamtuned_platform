'use client';

import { useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

// Shared permission-gating hook: every feature (departments, roles, ...)
// was re-declaring this same "isOrgAdmin || hasPerm(code)" check inline.
// OrgAdmin/SuperAdmin bypass every permission code, matching the backend's
// authorizeOrgAdminOrPermissions.
export function usePermission() {
  const { role, permissions } = useAuth();

  const isOrgAdmin = (role || '') !== 'Employee';

  const permSet = useMemo(
    () => new Set((permissions || []).map((p) => (p || '').toUpperCase())),
    [permissions]
  );

  const hasPerm = useCallback((code: string) => permSet.has(code.toUpperCase()), [permSet]);
  const hasAnyPerm = useCallback((codes: string[]) => codes.some((c) => permSet.has(c.toUpperCase())), [permSet]);
  const can = useCallback((code: string) => isOrgAdmin || hasPerm(code), [isOrgAdmin, hasPerm]);
  const canAny = useCallback((codes: string[]) => isOrgAdmin || hasAnyPerm(codes), [isOrgAdmin, hasAnyPerm]);

  return { isOrgAdmin, hasPerm, hasAnyPerm, can, canAny };
}
