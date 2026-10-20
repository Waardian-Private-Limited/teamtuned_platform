'use client';

import { use } from 'react';
import { FillPage } from '@/features/data-collection/components/my/FillPage';

export default function OpenRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <FillPage kind="open" id={Number(id)} basePath="/employee/data-collection" />;
}
