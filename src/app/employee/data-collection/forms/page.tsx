'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { FormsPage } from '@/features/data-collection/components/FormsPage';

export default function Page_forms() {
  return (
    <RouteGuard requiredPermissions={['DC_FORMS_MANAGE', 'DC_ASSIGN', 'DC_REPORTS']} requireAny>
      <FormsPage basePath="/employee/data-collection" />
    </RouteGuard>
  );
}
