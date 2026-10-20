'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { TdsOverviewPage } from '@/features/tds/components/TdsOverviewPage';

export default function EmployeeTdsOverviewRoute() {
  return (
    <RouteGuard requiredPermissions={['DEBIT_RULE_VIEW', 'HR_MODE', 'PAYROLL_ADMIN']} requireAny>
      <TdsOverviewPage />
    </RouteGuard>
  );
}
