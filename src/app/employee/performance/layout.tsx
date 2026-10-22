'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { PERF_FEATURE } from '@/features/performance/constants/perf.constants';

/** Every Performance page needs the feature switched on for the organization. */
export default function PerformanceLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard requiredFeature={PERF_FEATURE} fallbackPath="/employee">{children}</RouteGuard>;
}
