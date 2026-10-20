"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import { JobCatalogPage } from "@/features/job-catalogs/components/JobCatalogPage";

export default function EmployeeCostCentresPage() {
  return (
    <RouteGuard requiredPermissions={["EMP_EDIT"]} requireAny>
      <JobCatalogPage kind="cost-centres" />
    </RouteGuard>
  );
}
