'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as policiesApi from '../api/policies.api';
import { messageOf } from '@/lib/api/errors';
import type { SalaryComponentOption } from '../components/editor/form/SchemaForm';

/**
 * Active credit-type salary components for this org (Basic, HRA, custom
 * earnings…) — populates the "salary used for the hourly rate" pickers in
 * overtime, night overtime and leave encashment instead of the old fixed
 * basic / basic_plus_da / gross enum.
 */
export function useSalaryComponentList() {
  const [components, setComponents] = useState<SalaryComponentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const inFlightRef = useRef(false);

  const refetch = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsLoading(true);
    setError('');
    try {
      const dto = await policiesApi.listSalaryComponents();
      setComponents((dto.components || []).map((c) => ({ id: c.id, name: c.component_name })));
    } catch (err) {
      setError(messageOf(err));
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { salaryComponents: components, isLoading, error, refetch };
}
