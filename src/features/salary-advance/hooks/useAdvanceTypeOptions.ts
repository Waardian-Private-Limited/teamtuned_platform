'use client';

import { useCallback, useEffect, useState } from 'react';
import * as api from '../api/salaryAdvance.api';
import { toAdvanceTypeList } from '../types/salaryAdvance.mapper';
import type { AdvanceType } from '../types/salaryAdvance.model';

let cache: AdvanceType[] | null = null;

export function useAdvanceTypeOptions(includeInactive = false) {
  const [types, setTypes] = useState<AdvanceType[]>(cache ?? []);
  const [isLoading, setIsLoading] = useState(!cache);

  const refetch = useCallback(async () => {
    try {
      const dto = await api.listTypes({ pageSize: 200 });
      cache = toAdvanceTypeList(dto).types;
      setTypes(cache);
    } catch {
      setTypes(cache ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    types: includeInactive ? types : types.filter((t) => t.status === 'active'),
    isLoading,
    refetch,
  };
}

export function invalidateAdvanceTypeOptions() {
  cache = null;
}
