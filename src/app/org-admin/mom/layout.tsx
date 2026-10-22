'use client';

import RouteGuard from '@/components/auth/RouteGuard';

/** Minutes of meeting need the feature switched on for the organization. */
export default function MomLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard requiredFeature="MOM_FEATURE" fallbackPath="/org-admin">{children}</RouteGuard>;
}
