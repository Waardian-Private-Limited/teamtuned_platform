'use client';

import Link from 'next/link';
import { usePermission } from '@/lib/hooks/usePermission';
import type { TeamDetailTabProps } from './TeamTabProps';

export function ApprovalsTab(_props: TeamDetailTabProps) {
  const { isOrgAdmin } = usePermission();
  const base = isOrgAdmin ? '/org-admin' : '/employee';
  return (
    <div className="space-y-3 p-4 text-sm text-fg-muted">
      <p className="font-semibold text-fg">Approvals are set in Approval Flows</p>
      <p>
        Shift swaps and open shift requests use the same approval flows as every other request. Create a flow for
        &ldquo;Shift swap&rdquo; or &ldquo;Open shift request&rdquo; and scope it to this team. Sub-teams use the nearest team&apos;s flow.
        A swap partner always accepts first.
      </p>
      <Link href={`${base}/approval-flows`} className="inline-block font-semibold text-fg underline">Open Approval Flows</Link>
    </div>
  );
}
