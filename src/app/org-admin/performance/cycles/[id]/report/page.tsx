'use client';

import { useParams } from 'next/navigation';
import { CycleReportPage } from '@/features/performance/components/CycleReportPage';

export default function Page() {
  const params = useParams<{ id: string }>();
  return <CycleReportPage key={params.id} id={Number(params.id)} basePath="/org-admin/performance" />;
}
