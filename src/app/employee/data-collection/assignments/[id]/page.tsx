'use client';

import { use } from 'react';
import RouteGuard from '@/components/auth/RouteGuard';
import { AssignmentDashboard } from '@/features/data-collection/components/assignments/dashboard/AssignmentDashboard';

export default function AssignmentDashboardRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RouteGuard requiredPermissions={['DC_REPORTS']} requireAny>
      <AssignmentDashboard id={Number(id)} basePath="/employee/data-collection" />
    </RouteGuard>
  );
}
