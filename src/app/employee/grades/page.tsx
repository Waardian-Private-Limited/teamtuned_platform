"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import { JobCatalogPage } from "@/features/job-catalogs/components/JobCatalogPage";

export default function EmployeeGradesPage() {
  return (
    <RouteGuard requiredPermissions={["EMP_EDIT"]} requireAny>
      <JobCatalogPage kind="grades" />
    </RouteGuard>
  );
}
