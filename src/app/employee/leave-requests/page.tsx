"use client";

import { Suspense } from "react";
import { LeaveHubPage } from "@/features/leave/components/LeaveHubPage";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeLeaveRequestsPage() {
  return (
    <RouteGuard requiredPermissions={["LEAVE_VIEW", "LEAVE_ADD", "LEAVE_EDIT", "LEAVE_APPROVE"]} requireAny>
      <Suspense fallback={null}><LeaveHubPage /></Suspense>
    </RouteGuard>
  );
}
