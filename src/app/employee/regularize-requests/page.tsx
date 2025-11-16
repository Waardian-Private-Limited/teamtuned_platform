"use client";

import React from "react";
import RegularizeRequests from "@/components/requests/RegularizeRequests";
import { useOrgContext } from "@/components/shared/OrgContext";

export default function EmployeeRegularizeRequestsPage() {
  const ctx = useOrgContext();
  return (
    <div>
      <RegularizeRequests hqMode={ctx.hqMode} selectedSiteId={ctx.selectedSiteId} />
    </div>
  );
}