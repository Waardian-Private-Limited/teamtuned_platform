"use client";

import { DepartmentsPage } from "@/features/departments/components/DepartmentsPage";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeDepartmentsPage() {
  return (
    <RouteGuard requiredPermissions={["DEPT_VIEW", "DEPT_ADD", "DEPT_EDIT", "DEPT_DELETE"]} requireAny>
      <DepartmentsPage />
    </RouteGuard>
  );
}
