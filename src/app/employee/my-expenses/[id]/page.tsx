'use client';

import { use } from 'react';
import { MyClaimPage } from '@/features/reimbursement/components/ClaimDetailPage';

export default function MyExpenseRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <MyClaimPage claimId={Number(id)} />;
}
