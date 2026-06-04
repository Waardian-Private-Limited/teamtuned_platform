"use client";

import React from "react";
import RegularizeRequests from "@/components/requests/RegularizeRequests";
import { useOrgContext } from "@/components/shared/OrgContext";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeRegularizeRequestsPage() {
  const ctx = useOrgContext();
  return (
    <RouteGuard requiredPermissions={["ATTREG_VIEW", "ATTREG_APPROVE"]} requireAny>
      <div>
        <RegularizeRequests hqMode={ctx.hqMode} selectedSiteId={ctx.selectedSiteId} />
      </div>
    </RouteGuard>
  );
}