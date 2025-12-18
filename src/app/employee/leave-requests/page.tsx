"use client";

import React from "react";
import LeaveRequests from "@/components/requests/LeaveRequests";
import { useOrgContext } from "@/components/shared/OrgContext";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeLeaveRequestsPage() {
  const ctx = useOrgContext();
  return (
    <RouteGuard requiredPermissions={["LEAVE_VIEW", "LEAVE_ADD", "LEAVE_EDIT", "LEAVE_APPROVE"]} requireAny>
      <div>
        <LeaveRequests hqMode={ctx.hqMode} selectedSiteId={ctx.selectedSiteId} />
      </div>
    </RouteGuard>
  );
}