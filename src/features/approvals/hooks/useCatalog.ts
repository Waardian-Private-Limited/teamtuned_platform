'use client';

import React from 'react';
import * as api from '../api/approvals.api';
import type { Catalog, Lookups } from '../types/approvals';

let catalogCache: Catalog | null = null;
let lookupsCache: Lookups | null = null;

export function useCatalog() {
  const [catalog, setCatalog] = React.useState<Catalog | null>(catalogCache);
  const [lookups, setLookups] = React.useState<Lookups | null>(lookupsCache);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let live = true;
    if (!catalogCache) api.getCatalog().then((c) => { catalogCache = c; if (live) setCatalog(c); }).catch((e) => live && setError(e.message));
    if (!lookupsCache) api.getLookups().then((l) => { lookupsCache = l; if (live) setLookups(l); }).catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, []);

  return { catalog, lookups, error };
}
