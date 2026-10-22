'use client';

import { useParams } from 'next/navigation';
import { ResultsPage } from '@/features/surveys/components/ResultsPage';

export default function Page() {
  const params = useParams<{ id: string }>();
  return <ResultsPage key={params.id} id={Number(params.id)} basePath="/employee" />;
}
