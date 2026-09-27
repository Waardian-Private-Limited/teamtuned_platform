"use client";

import { Suspense } from "react";
import { PoliciesPage } from "@/features/policies/components/PoliciesPage";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeePoliciesPage() {
  return (
    <RouteGuard requiredPermissions={["POLICY_VIEW", "POLICY_ADD", "POLICY_EDIT", "POLICY_DELETE"]} requireAny>
      <Suspense fallback={null}>
        <PoliciesPage />
      </Suspense>
    </RouteGuard>
  );
}
