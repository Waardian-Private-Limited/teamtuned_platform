'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { TdsSettingsPage } from '@/features/tds/components/TdsSettingsPage';

export default function EmployeeTdsSettingsRoute() {
  return (
    <RouteGuard requiredPermissions={['DEBIT_RULE_VIEW', 'HR_MODE', 'PAYROLL_ADMIN']} requireAny>
      <TdsSettingsPage />
    </RouteGuard>
  );
}
