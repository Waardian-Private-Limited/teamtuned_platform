'use client';

import { usePathname } from 'next/navigation';

/** HR / Accounts area: /org-admin/expenses for admins, /employee/expenses for staff with permissions. */
export function useExpensesBasePath(): string {
  const pathname = usePathname() || '';
  return pathname.startsWith('/employee') ? '/employee/expenses' : '/org-admin/expenses';
}

/** The employee's own expenses (like /employee/my-advances). */
export const MY_EXPENSES_PATH = '/employee/my-expenses';
