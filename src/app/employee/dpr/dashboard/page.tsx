'use client';

import { Suspense } from 'react';
import { DprDashboardPage } from '@/features/dpr/components/DashboardPage';

export default function Page() {
  return <Suspense><DprDashboardPage basePath="/employee/dpr" /></Suspense>;
}
