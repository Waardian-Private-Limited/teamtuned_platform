'use client';

import { use } from 'react';
import { ExpenseDetailPage } from '@/features/petty-cash/components/ExpenseDetailPage';

export default function MyPettyCashExpenseRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ExpenseDetailPage id={Number(id)} scope="me" />;
}
