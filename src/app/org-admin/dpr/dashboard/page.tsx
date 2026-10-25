'use client';

import { Suspense } from 'react';
import { DprDashboardPage } from '@/features/dpr/components/DashboardPage';

export default function Page() {
  return <Suspense><DprDashboardPage basePath="/org-admin/dpr" /></Suspense>;
}
