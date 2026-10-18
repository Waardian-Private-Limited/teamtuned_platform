'use client';

import { usePathname } from 'next/navigation';

/** '/org-admin/recruitment' or '/employee/recruitment', following the area the page is mounted in. */
export function useRecruitmentBase() {
  const pathname = usePathname() || '';
  return pathname.startsWith('/org-admin') ? '/org-admin/recruitment' : '/employee/recruitment';
}
