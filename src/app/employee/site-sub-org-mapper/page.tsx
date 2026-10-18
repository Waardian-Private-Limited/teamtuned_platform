"use client";

import { SiteSubOrgMapperPage } from "@/features/site-sub-org-mapper/components/SiteSubOrgMapperPage";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeSiteSubOrgMapperPage() {
  return (
    <RouteGuard requiredPermissions={["SITE_VIEW", "SITE_ADD", "SITE_EDIT", "SITE_DELETE"]} requireAny>
      <SiteSubOrgMapperPage />
    </RouteGuard>
  );
}
