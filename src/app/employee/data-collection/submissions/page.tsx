'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { SubmissionsPage } from '@/features/data-collection/components/submissions/SubmissionsPage';

export default function Page_submissions() {
  return (
    <RouteGuard requiredPermissions={['DC_REPORTS']} requireAny>
      <SubmissionsPage />
    </RouteGuard>
  );
}
