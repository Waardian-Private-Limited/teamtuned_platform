'use client';

import { usePathname } from 'next/navigation';

export function useEmployeeRoutes() {
  const pathname = usePathname() || '';
  const base = pathname.startsWith('/org-admin') ? '/org-admin/employees' : '/employee/employee-management';
  return {
    list: base,
    create: `${base}/new`,
    edit: (id: number) => `${base}/${id}/edit`,
  };
}
