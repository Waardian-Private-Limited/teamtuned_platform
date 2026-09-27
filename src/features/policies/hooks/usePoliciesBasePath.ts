'use client';

import { usePathname } from 'next/navigation';

/**
 * The policies feature is mounted twice — /org-admin/policies for admins and
 * /employee/policies for permission-holding employees. Navigation inside it
 * has to stay on the mount the user came in through, so every internal push
 * is built from this rather than a hardcoded '/org-admin' prefix.
 */
export function usePoliciesBasePath(): string {
  const pathname = usePathname() || '';
  return pathname.startsWith('/employee') ? '/employee/policies' : '/org-admin/policies';
}
