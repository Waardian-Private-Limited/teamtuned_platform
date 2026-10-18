"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import { EmployeeSitesPage as EmployeeSitesFeaturePage } from "@/features/employee-sites/components/EmployeeSitesPage";

export default function EmployeeSitesPage() {
  return (
    <RouteGuard requiredPermissions={["EMPSITE_VIEW", "EMPLOYEE_ASSIGN_SITE"]} requireAny>
      <EmployeeSitesFeaturePage />
    </RouteGuard>
  );
}
