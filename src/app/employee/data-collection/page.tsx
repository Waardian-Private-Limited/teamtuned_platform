'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { DashboardPage } from '@/features/data-collection/components/dashboard/DashboardPage';

export default function Page_home() {
  return (
    <RouteGuard requiredPermissions={['DC_REPORTS']} requireAny>
      <DashboardPage basePath="/employee/data-collection" />
    </RouteGuard>
  );
}
