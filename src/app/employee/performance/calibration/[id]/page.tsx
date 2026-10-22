'use client';

import { useParams } from 'next/navigation';
import RouteGuard from '@/components/auth/RouteGuard';
import { CalibrationPage } from '@/features/performance/components/CalibrationPage';

export default function Page() {
  const params = useParams<{ id: string }>();
  return <RouteGuard requiredPermissions={['PERF_CALIBRATE', 'PERF_CYCLE_MANAGE', 'PERF_VIEW_ALL', 'PERF_CONFIGURE']} requireAny><CalibrationPage key={params.id} id={Number(params.id)} basePath="/employee/performance" /></RouteGuard>;
}
