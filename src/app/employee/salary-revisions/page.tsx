"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import { SalaryRevisionsPage } from "@/features/salary-revisions/components/SalaryRevisionsPage";

export default function EmployeeSalaryRevisionsPage() {
  return (
    <RouteGuard requiredPermissions={["COMP_VIEW", "COMP_ADD", "COMP_EDIT", "COMP_APPROVE", "HR_MODE"]} requireAny>
      <SalaryRevisionsPage />
    </RouteGuard>
  );
}
