'use client';

import { useParams } from 'next/navigation';
import { ExitCaseDetailPage } from '@/features/exits/components/ExitCaseDetailPage';

// No permission guard here: the approver of an open case may open it too. The server enforces access.
export default function ExitCaseRoute() {
  const { id } = useParams<{ id: string }>();
  return <ExitCaseDetailPage id={Number(id)} />;
}
