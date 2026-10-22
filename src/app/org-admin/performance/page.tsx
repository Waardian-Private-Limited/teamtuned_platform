'use client';

import { Suspense } from 'react';
import { PerformanceSetup } from '@/features/performance/components/PerformanceSetup';

export default function Page_performance() {
  return <Suspense><PerformanceSetup /></Suspense>;
}
