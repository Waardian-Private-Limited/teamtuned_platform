"use client";

import SitesPage from "@/components/sites/page";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeSitesPage() {
  return (
    <RouteGuard requiredPermissions={["SITE_VIEW", "SITE_ADD", "SITE_EDIT", "SITE_DELETE"]} requireAny>
      <SitesPage />
    </RouteGuard>
  );
}