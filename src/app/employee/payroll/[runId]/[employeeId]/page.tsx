'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { EmployeePayPage } from '@/features/payroll-runs/components/EmployeePayPage';

export default function EmployeeEmployeePayPage() {
  return (
    <RouteGuard requiredPermissions={['PAYROLL_VIEW', 'HR_MODE']} requireAny>
      <EmployeePayPage basePath="/employee" />
    </RouteGuard>
  );
}
