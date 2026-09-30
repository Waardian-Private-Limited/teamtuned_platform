'use client';

import { useCallback, useState } from 'react';
import * as employeesApi from '../api/employees.api';
import type { EmployeeListItemDto, EmployeeStatus } from '../types/employees.dto';
import { showError, showSuccess } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';

export type StatusAction = 'activate' | 'deactivate' | 'terminate' | 'delete';

export function useEmployeeStatus(refetch: () => Promise<void>, patchLocally: (id: number, status: EmployeeStatus) => void) {
  const [busyId, setBusyId] = useState<number | null>(null);

  const run = useCallback(async (employee: EmployeeListItemDto, action: StatusAction, exit?: { exitDate: string; reason: string }) => {
    setBusyId(employee.id);
    try {
      if (action === 'delete') {
        await employeesApi.deleteEmployee(employee.id);
        showSuccess(`${employee.name} removed`);
      } else {
        const status: EmployeeStatus = action === 'activate' ? 'Active' : action === 'deactivate' ? 'Inactive' : 'Terminated';
        await employeesApi.changeEmployeeStatus(employee.id, {
          status,
          exit_date: exit?.exitDate,
          reason: exit?.reason,
        });
        patchLocally(employee.id, status);
        showSuccess(`${employee.name} is now ${status.toLowerCase()}`);
      }
      await refetch();
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    } finally {
      setBusyId(null);
    }
  }, [refetch, patchLocally]);

  return { busyId, run };
}
