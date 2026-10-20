'use client';

import { useCallback, useEffect, useState } from 'react';
import * as employeesApi from '../api/employees.api';
import { messageOf } from '@/lib/api/errors';
import type { EmployeeDetailDto } from '../types/employees.dto';

export function useEmployeeDetail(employeeId: number) {
  const [detail, setDetail] = useState<EmployeeDetailDto | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setError('');
    employeesApi.getEmployee(employeeId)
      .then((d) => active && setDetail(d))
      .catch((e) => active && setError(messageOf(e)));
    return () => { active = false; };
  }, [employeeId]);

  /** Applies a renewal locally so the card updates without a refetch. */
  const setContract = useCallback((start: string, end: string) => {
    setDetail((d) => (d ? { ...d, contract_start: start, contract_end: end } : d));
  }, []);

  return { detail, error, setContract };
}
