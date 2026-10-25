'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { DprReportPage } from '@/features/dpr/components/ReportPage';

function Report() {
  const params = useParams<{ siteId: string; date: string }>();
  const kind = useSearchParams().get('kind') === 'billing' ? 'billing' : 'progress';
  return <DprReportPage key={`${params.siteId}:${params.date}:${kind}`} siteId={Number(params.siteId)} date={params.date} kind={kind} basePath="/org-admin/dpr" />;
}

export default function Page() {
  return <Suspense><Report /></Suspense>;
}
