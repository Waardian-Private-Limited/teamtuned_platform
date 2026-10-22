'use client';

import { useParams } from 'next/navigation';
import { PersonPlanPage } from '@/features/learning/components/LearningPage';

export default function Page() {
  const params = useParams<{ id: string }>();
  return <PersonPlanPage key={params.id} id={Number(params.id)} basePath="/org-admin" />;
}
