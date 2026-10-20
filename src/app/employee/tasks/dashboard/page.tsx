'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { DashboardPage } from '@/features/task-management/components/DashboardPage';

export default function Page_tasks_dashboard() {
  return (
    <RouteGuard requiredPermissions={['TM_VIEW_ALL', 'TM_MANAGE_ALL']} requireAny>
      <DashboardPage basePath="/employee/tasks" />
    </RouteGuard>
  );
}
