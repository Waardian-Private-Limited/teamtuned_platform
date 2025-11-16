"use client";

import React from "react";
import LeaveRequests from "@/components/requests/LeaveRequests";
import { useOrgContext } from "@/components/shared/OrgContext";

export default function OrgAdminLeaveRequestsPage() {
  const ctx = useOrgContext();
  return (
    <div>
      <LeaveRequests hqMode={ctx.hqMode} selectedSiteId={ctx.selectedSiteId} />
    </div>
  );
}