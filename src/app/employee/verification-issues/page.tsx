"use client";

import React from "react";
import VerificationIssues from "@/components/requests/VerificationIssues";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeVerificationIssuesPage() {
  return (
    <RouteGuard requiredPermissions={["ATTVERIFY_VIEW", "ATTVERIFY_APPROVE"]} requireAny>
      <div>
        <VerificationIssues />
      </div>
    </RouteGuard>
  );
}