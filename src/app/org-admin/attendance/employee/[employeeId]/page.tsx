'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { EmployeeMonthPage } from '@/features/detailed-attendance/components/EmployeeMonthPage';

export default function OrgAdminEmployeeMonthPage() {
  return (
    <RouteGuard requiredPermissions={['ATTEND_VIEW', 'ATTEND_ADD', 'ATTEND_EDIT']} requireAny>
      <EmployeeMonthPage listPath="/org-admin/attendance/employee" />
    </RouteGuard>
  );
}
