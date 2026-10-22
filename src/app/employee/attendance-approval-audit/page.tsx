'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { ApprovalAuditPage } from '@/features/approval-audit/components/ApprovalAuditPage';

export default function Page() {
  return (
    <RouteGuard requiredPermissions={['ATTEND_VIEW', 'ATTEND_ADD', 'ATTEND_EDIT']} requireAny>
      <ApprovalAuditPage />
    </RouteGuard>
  );
}
