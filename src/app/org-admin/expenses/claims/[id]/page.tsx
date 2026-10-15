'use client';

import { use } from 'react';
import { ClaimDetailPage } from '@/features/reimbursement/components/ClaimDetailPage';

export default function ExpenseClaimDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ClaimDetailPage claimId={Number(id)} />;
}
