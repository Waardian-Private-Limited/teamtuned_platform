"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import { EmployeeFormPage } from "@/features/employees/components/EmployeeFormPage";

export default function EmployeeNewEmployeePage() {
  return (
    <RouteGuard requiredPermissions={["EMP_ADD"]} requireAny>
      <EmployeeFormPage employeeId={null} />
    </RouteGuard>
  );
}
