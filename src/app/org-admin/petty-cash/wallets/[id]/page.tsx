'use client';

import { use } from 'react';
import { WalletDetailPage } from '@/features/petty-cash/components/WalletDetailPage';

export default function OrgAdminPettyCashWalletRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <WalletDetailPage id={Number(id)} />;
}
