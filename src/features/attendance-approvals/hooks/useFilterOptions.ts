'use client';

import { useEffect, useState } from 'react';
import { getFilterOptions } from '@/features/detailed-attendance/api/detailedAttendance.api';
import type { FilterOptionsDto } from '@/features/attendance-dashboard/types/dashboard.dto';

/**
 * The sites and departments the signed-in person may filter by: their own sites, or every site with
 * HR mode or as an admin. Null when they have no attendance access at all, so those filters hide.
 */
export function useFilterOptions() {
  const [options, setOptions] = useState<FilterOptionsDto | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    getFilterOptions(null, null, controller.signal)
      .then(setOptions)
      .catch(() => { if (!controller.signal.aborted) setOptions(null); });
    return () => controller.abort();
  }, []);
  return options;
}
