'use client';

import { use } from 'react';
import { AssignmentDashboard } from '@/features/data-collection/components/assignments/dashboard/AssignmentDashboard';

export default function AssignmentDashboardRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AssignmentDashboard id={Number(id)} basePath="/org-admin/data-collection" />;
}
