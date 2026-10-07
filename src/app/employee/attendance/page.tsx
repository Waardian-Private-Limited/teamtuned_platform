'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { DetailedAttendancePage } from '@/features/detailed-attendance/components/DetailedAttendancePage';

export default function EmployeeAttendancePage() {
  return (
    <RouteGuard requiredPermissions={['ATTEND_VIEW', 'ATTEND_ADD', 'ATTEND_EDIT']} requireAny>
      <DetailedAttendancePage />
    </RouteGuard>
  );
}
