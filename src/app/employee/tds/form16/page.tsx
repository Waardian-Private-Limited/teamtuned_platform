'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { TdsForm16Page } from '@/features/tds/components/TdsForm16Page';

export default function EmployeeTdsForm16Route() {
  return (
    <RouteGuard requiredPermissions={['DEBIT_RULE_VIEW', 'HR_MODE', 'PAYROLL_ADMIN']} requireAny>
      <TdsForm16Page />
    </RouteGuard>
  );
}
