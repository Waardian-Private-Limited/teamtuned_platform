'use client';

import { useParams } from 'next/navigation';
import { PersonProfilePage } from '@/features/performance/components/PersonProfilePage';

export default function Page() {
  const params = useParams<{ id: string }>();
  return <PersonProfilePage key={params.id} id={Number(params.id)} basePath="/employee/performance" />;
}
