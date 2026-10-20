'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { TdsDeclarationsPage } from '@/features/tds/components/TdsDeclarationsPage';

export default function EmployeeTdsDeclarationsRoute() {
  return (
    <RouteGuard requiredPermissions={['DEBIT_RULE_VIEW', 'HR_MODE', 'PAYROLL_ADMIN']} requireAny>
      <TdsDeclarationsPage />
    </RouteGuard>
  );
}
