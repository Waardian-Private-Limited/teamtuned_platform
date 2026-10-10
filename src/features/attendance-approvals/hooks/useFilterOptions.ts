'use client';

import { useEffect, useState } from 'react';
import { getFilterOptions } from '@/features/detailed-attendance/api/detailedAttendance.api';
import type { FilterOptionsDto } from '@/features/attendance-dashboard/types/dashboard.dto';

/**
 * The sites, departments and roles the signed-in person may filter by: their own sites, or every site
 * with HR mode or as an admin. Null when they have no attendance access at all, so those filters hide.
 */
export function useFilterOptions(departmentId: number | null) {
  const [options, setOptions] = useState<FilterOptionsDto | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    getFilterOptions(null, departmentId, controller.signal)
      .then(setOptions)
      .catch(() => { if (!controller.signal.aborted) setOptions(null); });
    return () => controller.abort();
  }, [departmentId]);
  return options;
}
