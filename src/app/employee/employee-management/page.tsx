"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import { EmployeesPage } from "@/features/employees/components/EmployeesPage";

export default function EmployeeManagementPage() {
  return (
    <RouteGuard requiredPermissions={["EMP_VIEW", "EMP_ADD", "EMP_EDIT", "EMP_DELETE"]} requireAny>
      <EmployeesPage />
    </RouteGuard>
  );
}
