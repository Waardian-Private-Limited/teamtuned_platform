'use client';

import RouteGuard from '@/components/auth/RouteGuard';

/** Survey pages need the feature switched on for the organization. */
export default function SurveysLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard requiredFeature="ENGAGEMENT_FEATURE" fallbackPath="/org-admin">{children}</RouteGuard>;
}
