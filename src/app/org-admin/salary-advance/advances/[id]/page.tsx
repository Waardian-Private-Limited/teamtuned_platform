'use client';

import { use } from 'react';
import { AdvanceDetailPage } from '@/features/salary-advance/components/AdvanceDetailPage';

export default function SalaryAdvanceDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AdvanceDetailPage advanceId={Number(id)} />;
}
