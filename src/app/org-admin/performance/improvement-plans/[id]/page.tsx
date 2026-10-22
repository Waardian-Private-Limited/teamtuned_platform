'use client';

import { useParams } from 'next/navigation';
import { PipDetailPage } from '@/features/performance/components/PipDetailPage';

export default function Page() {
  const params = useParams<{ id: string }>();
  return <PipDetailPage key={params.id} id={Number(params.id)} basePath="/org-admin/performance" />;
}
