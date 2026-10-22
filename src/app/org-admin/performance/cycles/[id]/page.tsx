'use client';

import { useParams } from 'next/navigation';
import { CycleDetailPage } from '@/features/performance/components/CycleDetailPage';

export default function Page() {
  const params = useParams<{ id: string }>();
  return <CycleDetailPage key={params.id} id={Number(params.id)} basePath="/org-admin/performance" />;
}
