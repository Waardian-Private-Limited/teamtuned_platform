'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { AuditPage } from '@/features/mom/components/AuditPage';

export default function Page() {
  return (
    <RouteGuard requiredPermissions={['MOM_MANAGE']} fallbackPath="/org-admin/mom">
      <AuditPage basePath="/org-admin/mom" />
    </RouteGuard>
  );
}
