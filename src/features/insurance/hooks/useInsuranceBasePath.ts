'use client';

import { usePathname } from 'next/navigation';

export function useInsuranceBasePath(): string {
  return (usePathname() || '').startsWith('/employee') ? '/employee/insurance' : '/org-admin/insurance';
}
