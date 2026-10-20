'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { TdsReturnsPage } from '@/features/tds/components/TdsReturnsPage';

export default function EmployeeTdsReturnsRoute() {
  return (
    <RouteGuard requiredPermissions={['DEBIT_RULE_VIEW', 'HR_MODE', 'PAYROLL_ADMIN']} requireAny>
      <TdsReturnsPage />
    </RouteGuard>
  );
}
