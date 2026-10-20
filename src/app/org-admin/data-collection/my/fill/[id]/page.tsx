'use client';

import { use } from 'react';
import { FillPage } from '@/features/data-collection/components/my/FillPage';

export default function FillRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <FillPage kind="run" id={Number(id)} basePath="/org-admin/data-collection" />;
}
