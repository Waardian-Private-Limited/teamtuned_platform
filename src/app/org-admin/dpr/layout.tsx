'use client';

import RouteGuard from '@/components/auth/RouteGuard';

/** The daily progress report needs the feature switched on for the organization. */
export default function DprLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard requiredFeature="DPR_FEATURE" fallbackPath="/org-admin">{children}</RouteGuard>;
}
