"use client";

import DepartmentsManager from "@/components/org/DepartmentsManager";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeDepartmentsPage() {
  return (
    <RouteGuard requiredPermissions={["DEPT_VIEW", "DEPT_ADD", "DEPT_EDIT", "DEPT_DELETE"]} requireAny>
      <DepartmentsManager />
    </RouteGuard>
  );
}