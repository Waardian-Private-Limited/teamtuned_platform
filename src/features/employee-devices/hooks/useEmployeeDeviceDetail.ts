'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api/employeeDevices.api';
import { toEmployeeDeviceDetail } from '../types/employeeDevices.mapper';
import type { EmployeeDeviceDetail } from '../types/employeeDevices.model';
import { messageOf } from '@/lib/api/errors';

export function useEmployeeDeviceDetail(userId: number | null) {
  const [detail, setDetail] = useState<EmployeeDeviceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (userId === null) {
      setDetail(null);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const dto = await api.getEmployeeDevice(userId);
      if (requestId === requestIdRef.current) setDetail(toEmployeeDeviceDetail(dto));
    } catch (err) {
      if (requestId === requestIdRef.current) setError(messageOf(err));
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setDetail(null);
    load();
  }, [load]);

  return { detail, isLoading, error, reload: load };
}
