'use client';

import RouteGuard from '@/components/auth/RouteGuard';

/** Learning pages need the feature switched on for the organization. */
export default function LearningLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard requiredFeature="LEARNING_FEATURE" fallbackPath="/org-admin">{children}</RouteGuard>;
}
