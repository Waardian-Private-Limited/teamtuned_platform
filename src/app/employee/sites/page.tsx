"use client";

import SitesPage from "@/features/sites/components/SitesPage";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeSitesPage() {
  return (
    <RouteGuard requiredPermissions={["SITE_VIEW", "SITE_ADD", "SITE_EDIT", "SITE_DELETE"]} requireAny>
      <SitesPage />
    </RouteGuard>
  );
}
