'use client';

import { useEffect, useState } from 'react';
import * as api from '../api/jobCatalogs.api';
import { toCatalogItem } from '../types/jobCatalogs.mapper';
import type { CatalogItem, CatalogKind } from '../types/jobCatalogs.model';

/** Items of a catalog for a picker or filter. Empty on failure: a filter is never worth an error. */
export function useCatalogOptions(kind: CatalogKind) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  useEffect(() => {
    let active = true;
    api.listCatalog(kind)
      .then((d) => active && setItems((d.items || []).map(toCatalogItem)))
      .catch(() => active && setItems([]));
    return () => { active = false; };
  }, [kind]);
  return items;
}
