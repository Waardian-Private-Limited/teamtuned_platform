'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { CyclesPage } from '@/features/performance/components/CyclesPage';

export default function Page() {
  return <RouteGuard requiredPermissions={['PERF_CYCLE_MANAGE', 'PERF_VIEW_ALL', 'PERF_CONFIGURE', 'PERF_CALIBRATE']} requireAny><CyclesPage basePath="/employee/performance" /></RouteGuard>;
}
