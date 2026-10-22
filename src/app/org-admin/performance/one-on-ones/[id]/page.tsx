'use client';

import { useParams } from 'next/navigation';
import { OneOnOneDetailPage } from '@/features/performance/components/OneOnOneDetailPage';

export default function Page() {
  const params = useParams<{ id: string }>();
  return <OneOnOneDetailPage key={params.id} id={Number(params.id)} basePath="/org-admin/performance" />;
}
