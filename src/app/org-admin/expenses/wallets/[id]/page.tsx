'use client';

import { use } from 'react';
import { WalletDetailPage } from '@/features/reimbursement/components/WalletDetailPage';

export default function ExpenseWalletDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <WalletDetailPage walletId={Number(id)} />;
}
