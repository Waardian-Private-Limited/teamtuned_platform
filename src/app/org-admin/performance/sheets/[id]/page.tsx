'use client';

import { useParams } from 'next/navigation';
import { SheetEditor } from '@/features/performance/components/SheetEditor';

export default function Page() {
  const params = useParams<{ id: string }>();
  return <SheetEditor key={params.id} id={Number(params.id)} backHref="/org-admin/performance/team-goals" />;
}
