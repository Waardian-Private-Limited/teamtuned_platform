'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { MeetingPage } from '@/features/mom/components/MeetingPage';

export default function Page() {
  const params = useParams<{ id: string }>();
  return <Suspense><MeetingPage key={params.id} id={Number(params.id)} basePath="/org-admin/mom" /></Suspense>;
}
