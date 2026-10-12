'use client';

import { usePathname } from 'next/navigation';

export function useEmployeeRoutes() {
  const pathname = usePathname() || '';
  const orgAdmin = pathname.startsWith('/org-admin');
  const base = orgAdmin ? '/org-admin/employees' : '/employee/employee-management';
  return {
    list: base,
    create: `${base}/new`,
    edit: (id: number) => `${base}/${id}/edit`,
    revisions: orgAdmin ? '/org-admin/salary-revisions' : '/employee/salary-revisions',
  };
}
