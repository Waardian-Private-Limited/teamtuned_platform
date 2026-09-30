"use client";

import { Suspense } from "react";
import RouteGuard from "@/components/auth/RouteGuard";
import { CompensationPage } from "@/features/compensation/components/CompensationPage";

export default function EmployeeCompensationPage() {
  return (
    <RouteGuard requiredPermissions={["COMP_VIEW", "COMP_ADD", "COMP_EDIT", "COMP_APPROVE", "HR_MODE"]} requireAny>
      <Suspense>
        <CompensationPage />
      </Suspense>
    </RouteGuard>
  );
}
