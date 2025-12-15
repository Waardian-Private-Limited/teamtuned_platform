"use client";

import LeaveRequests from '@/components/requests/LeaveRequests';
import { useOrgContext } from '@/components/shared/OrgContext';

export default function LeaveRequestsPage() {
  const ctx = useOrgContext();
  return <LeaveRequests hqMode={ctx.hqMode} selectedSiteId={ctx.selectedSiteId} />;
}
