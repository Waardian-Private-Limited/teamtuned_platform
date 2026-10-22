'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { WorkforceInsightsPage } from '@/features/attendance-insights/components/WorkforceInsightsPage';

export default function Page() {
  return (
    <RouteGuard requiredPermissions={['ATTEND_VIEW', 'ATTEND_ADD', 'ATTEND_EDIT']} requireAny>
      <WorkforceInsightsPage />
    </RouteGuard>
  );
}
