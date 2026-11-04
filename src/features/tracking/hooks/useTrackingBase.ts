'use client';

import { usePathname } from 'next/navigation';

/** Where the tracking pages are mounted: the admin area, or the employee area for HR / managers with the tracking permissions. */
export function useTrackingBase(): string {
  return (usePathname() || '').startsWith('/employee') ? '/employee/tracking' : '/org-admin/tracking';
}
