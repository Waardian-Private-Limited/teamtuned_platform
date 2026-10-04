'use client';

import { HolidaysPage } from '@/features/holidays/components/HolidaysPage';
import { MyHolidays } from '@/features/holidays/components/MyHolidays';
import { usePermission } from '@/lib/hooks/usePermission';

// Employees with a holiday permission manage them; everyone else sees the holidays that apply to them.
export default function EmployeeHolidaysPage() {
  const { canAny } = usePermission();
  return canAny(['HOLIDAY_VIEW', 'HOLIDAY_ADD', 'HOLIDAY_EDIT', 'HOLIDAY_DELETE']) ? <HolidaysPage /> : <MyHolidays />;
}
