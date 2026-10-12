'use client';

import { usePathname } from 'next/navigation';

export function useSalaryAdvanceBasePath(): string {
  const pathname = usePathname() || '';
  return pathname.startsWith('/employee') ? '/employee/salary-advance' : '/org-admin/salary-advance';
}
