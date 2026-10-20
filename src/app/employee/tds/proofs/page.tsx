'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { TdsProofsPage } from '@/features/tds/components/TdsProofsPage';

export default function EmployeeTdsProofsRoute() {
  return (
    <RouteGuard requiredPermissions={['DEBIT_RULE_VIEW', 'HR_MODE', 'PAYROLL_ADMIN']} requireAny>
      <TdsProofsPage />
    </RouteGuard>
  );
}
