'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { DprPlanningSitePage } from '@/features/dpr/components/PlanningPage';

export default function Page() {
  const params = useParams<{ siteId: string }>();
  return <Suspense><DprPlanningSitePage key={params.siteId} siteId={Number(params.siteId)} basePath="/org-admin/dpr" /></Suspense>;
}
