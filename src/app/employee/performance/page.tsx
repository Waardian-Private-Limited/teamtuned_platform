'use client';

import { Suspense } from 'react';
import RouteGuard from '@/components/auth/RouteGuard';
import { PerformanceSetup } from '@/features/performance/components/PerformanceSetup';

export default function Page_performance() {
  return (
    <RouteGuard requiredPermissions={['PERF_CONFIGURE', 'PERF_VIEW_ALL', 'PERF_CYCLE_MANAGE']} requireAny>
      <Suspense><PerformanceSetup /></Suspense>
    </RouteGuard>
  );
}
