'use client';

import { use } from 'react';
import { BuilderPage } from '@/features/data-collection/components/builder/BuilderPage';

export default function FormBuilderRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <BuilderPage formId={Number(id)} basePath="/org-admin/data-collection/forms" />;
}
