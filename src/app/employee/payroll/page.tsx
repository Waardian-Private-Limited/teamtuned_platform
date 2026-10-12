'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { PayrollRunsPage } from '@/features/payroll-runs/components/PayrollRunsPage';

export default function EmployeePayrollPage() {
  return (
    <RouteGuard requiredPermissions={['PAYROLL_VIEW', 'HR_MODE']} requireAny>
      <PayrollRunsPage basePath="/employee" />
    </RouteGuard>
  );
}
