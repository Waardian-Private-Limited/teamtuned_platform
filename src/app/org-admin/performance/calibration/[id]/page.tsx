'use client';

import { useParams } from 'next/navigation';
import { CalibrationPage } from '@/features/performance/components/CalibrationPage';

export default function Page() {
  const params = useParams<{ id: string }>();
  return <CalibrationPage key={params.id} id={Number(params.id)} basePath="/org-admin/performance" />;
}
