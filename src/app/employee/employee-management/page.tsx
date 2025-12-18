"use client";

import EmployeeManagement from "@/components/employee/EmployeeManagement";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeManagementPage() {
  return (
    <RouteGuard requiredPermissions={["EMP_VIEW", "EMP_ADD", "EMP_EDIT", "EMP_DELETE"]} requireAny>
      <EmployeeManagement />
    </RouteGuard>
  );
}