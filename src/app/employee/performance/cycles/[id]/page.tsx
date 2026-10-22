'use client';

import { useParams } from 'next/navigation';
import RouteGuard from '@/components/auth/RouteGuard';
import { CycleDetailPage } from '@/features/performance/components/CycleDetailPage';

export default function Page() {
  const params = useParams<{ id: string }>();
  return <RouteGuard requiredPermissions={['PERF_CYCLE_MANAGE', 'PERF_VIEW_ALL', 'PERF_CONFIGURE', 'PERF_CALIBRATE']} requireAny><CycleDetailPage key={params.id} id={Number(params.id)} basePath="/employee/performance" /></RouteGuard>;
}
