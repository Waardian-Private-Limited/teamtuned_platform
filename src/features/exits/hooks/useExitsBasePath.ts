'use client';

import { usePathname } from 'next/navigation';

/** The HR desk lives under both portals; links stay inside the portal the person is in. */
export function useExitsBasePath(): string {
  const pathname = usePathname() || '';
  return pathname.startsWith('/employee') ? '/employee/exits' : '/org-admin/exits';
}
