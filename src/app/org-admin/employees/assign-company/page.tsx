'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { AssignCompanyPage } from '@/features/employees/components/AssignCompanyPage';

export default function OrgAdminAssignCompanyPage() {
  return (
    <RouteGuard requiredPermissions={['EMP_EDIT']}>
      <AssignCompanyPage />
    </RouteGuard>
  );
}
