'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { AttendanceDashboardPage } from '@/features/attendance-dashboard/components/AttendanceDashboardPage';

export default function Page() {
  return (
    <RouteGuard requiredPermissions={['ATTEND_VIEW', 'ATTEND_ADD', 'ATTEND_EDIT']} requireAny>
      <AttendanceDashboardPage />
    </RouteGuard>
  );
}
