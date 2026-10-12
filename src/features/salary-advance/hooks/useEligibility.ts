'use client';

import { useEffect, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/salaryAdvance.api';
import { toEligibility } from '../types/salaryAdvance.mapper';
import type { Eligibility } from '../types/salaryAdvance.model';

export function useEligibility(employeeId: number | null, typeId: number | null) {
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);

  useEffect(() => {
    if (!employeeId || !typeId) {
      setEligibility(null);
      setError('');
      setIsLoading(false);
      return;
    }
    const id = ++request.current;
    setIsLoading(true);
    setError('');
    api
      .getEligibility(employeeId, typeId)
      .then((dto) => id === request.current && setEligibility(toEligibility(dto)))
      .catch((err) => {
        if (id !== request.current) return;
        setEligibility(null);
        setError(messageOf(err));
      })
      .finally(() => id === request.current && setIsLoading(false));
  }, [employeeId, typeId]);

  return { eligibility, isLoading, error };
}
