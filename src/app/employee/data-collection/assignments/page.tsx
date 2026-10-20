'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { AssignmentsPage } from '@/features/data-collection/components/assignments/AssignmentsPage';

export default function Page_assignments() {
  return (
    <RouteGuard requiredPermissions={['DC_ASSIGN', 'DC_REPORTS']} requireAny>
      <AssignmentsPage />
    </RouteGuard>
  );
}
