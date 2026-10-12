'use client';

import { useEffect, useState } from 'react';
import type { FilterOption } from '@/components/ui/SearchableFilterDropdown';
import * as api from '../api/salarySlips.api';

export function useSiteOptions() {
  const [options, setOptions] = useState<FilterOption[]>([]);

  useEffect(() => {
    let alive = true;
    api
      .listSiteOptions()
      .then((dto) => alive && setOptions((dto.sites || []).map((s) => ({ value: s.id, label: s.name }))))
      .catch(() => alive && setOptions([]));
    return () => {
      alive = false;
    };
  }, []);

  return options;
}
