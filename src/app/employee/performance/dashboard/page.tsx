'use client';

import { Suspense } from 'react';
import { PerformanceDashboardPage } from '@/features/performance/components/dashboard/PerformanceDashboardPage';

export default function Page() {
  return <Suspense><PerformanceDashboardPage /></Suspense>;
}
