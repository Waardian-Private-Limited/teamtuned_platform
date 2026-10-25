'use client';

import { usePathname } from 'next/navigation';

/** HR / Accounts area: /org-admin/petty-cash for admins, /employee/petty-cash for staff with permissions. */
export function usePettyCashBasePath(): string {
  const pathname = usePathname() || '';
  return pathname.startsWith('/employee') ? '/employee/petty-cash' : '/org-admin/petty-cash';
}

/** The employee's own petty cash (spend, my expenses, my fund requests). */
export const MY_PETTY_CASH_PATH = '/employee/my-petty-cash';
