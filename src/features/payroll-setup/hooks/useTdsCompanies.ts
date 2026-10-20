'use client';

import React from 'react';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import { usePermission } from '@/lib/hooks/usePermission';
import type { CompanyOption } from '../components/tds/tdsShared';

/**
 * Companies the TDS pages can act for. "Organization" is offered to org admins, or when
 * there are no sub-companies at all; scoped HR sees only their own companies.
 */
export function useTdsCompanies() {
  const { subOrgs } = useManageableSubOrgs();
  const { isOrgAdmin } = usePermission();
  const hasCompanies = subOrgs.length > 0;

  const companyName = React.useCallback(
    (id: number | null) => {
      if (id === null) return 'Organization';
      return subOrgs.find((s) => s.id === id)?.name ?? `Company ${id}`;
    },
    [subOrgs]
  );

  const companyOptions: CompanyOption[] = React.useMemo(
    () => [
      ...(isOrgAdmin || !hasCompanies ? [{ value: null, label: 'Organization' }] : []),
      ...subOrgs.map((s) => ({ value: s.id, label: s.name })),
    ],
    [isOrgAdmin, hasCompanies, subOrgs]
  );

  return { subOrgs, isOrgAdmin, hasCompanies, companyName, companyOptions };
}
