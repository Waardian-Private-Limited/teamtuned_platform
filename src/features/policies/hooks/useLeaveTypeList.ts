'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as policiesApi from '../api/policies.api';
import { toLeaveTypes } from '../types/policies.mapper';
import type { LeaveType } from '../types/policies.model';
import { messageOf } from '@/lib/api/errors';

export function useLeaveTypeList() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const inFlightRef = useRef(false);

  const refetch = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsLoading(true);
    setError('');
    try {
      const dto = await policiesApi.listLeaveTypes();
      setLeaveTypes(toLeaveTypes(dto.leave_types));
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

  return { leaveTypes, isLoading, error, refetch };
}
