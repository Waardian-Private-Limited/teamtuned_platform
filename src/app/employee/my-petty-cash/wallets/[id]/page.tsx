'use client';

import { use } from 'react';
import { MyWalletPage } from '@/features/petty-cash/components/MyWalletPage';

export default function MyPettyCashWalletRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <MyWalletPage id={Number(id)} />;
}
