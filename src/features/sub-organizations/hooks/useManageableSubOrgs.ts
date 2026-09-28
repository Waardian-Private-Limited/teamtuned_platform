'use client';

import { useEffect, useState } from 'react';
import * as api from '../api/subOrganizations.api';
import { messageOf } from '../utils/asyncAction';

export interface ManageableSubOrg {
  id: number;
  name: string;
  code: string;
  isPrimary: boolean;
}

// Module-level cache so the many consumers on a page (pickers, per-row badges,
// the filter dropdown) share ONE network fetch instead of each firing its own.
let cache: ManageableSubOrg[] | null = null;
let inflight: Promise<ManageableSubOrg[]> | null = null;

async function load(): Promise<ManageableSubOrg[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = api
      .listManageableSubOrganizations()
      .then((dto) => {
        cache = (dto.sub_organizations || []).map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          isPrimary: s.is_primary === 1,
        }));
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

// Clears the shared cache — call after a change that alters the set (e.g. a
// sub-org admin assignment) so the next read refetches.
export function invalidateManageableSubOrgs() {
  cache = null;
}

// Loads the sub-orgs the current user may act in. OrgAdmin gets every active
// sub-org, a scoped user gets only their assigned ones.
export function useManageableSubOrgs() {
  const [subOrgs, setSubOrgs] = useState<ManageableSubOrg[]>(cache || []);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState('');

  useEffect(() => {
    if (cache) {
      setSubOrgs(cache);
      setLoading(false);
      return;
    }
    let active = true;
    load()
      .then((list) => {
        if (active) setSubOrgs(list);
      })
      .catch((err) => {
        if (active) setError(messageOf(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { subOrgs, loading, error };
}
