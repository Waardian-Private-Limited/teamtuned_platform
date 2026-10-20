'use client';

import { use } from 'react';
import RouteGuard from '@/components/auth/RouteGuard';
import { BuilderPage } from '@/features/data-collection/components/builder/BuilderPage';

export default function FormBuilderRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RouteGuard requiredPermissions={['DC_FORMS_MANAGE','DC_ASSIGN','DC_REPORTS']} requireAny>
      <BuilderPage formId={Number(id)} basePath="/employee/data-collection/forms" />
    </RouteGuard>
  );
}
