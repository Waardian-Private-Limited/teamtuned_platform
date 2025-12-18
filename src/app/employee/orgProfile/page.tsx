"use client";

import React from "react";
import OrganizationProfile from "@/components/organization-profile/OrganizationProfile";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeOrgProfilePage() {
  return (
    <RouteGuard requiredPermissions={["ORGPROFILE_VIEW", "ORGPROFILE_ADD", "ORGPROFILE_EDIT", "ORGPROFILE_DELETE"]} requireAny>
      <div>
        <OrganizationProfile />
      </div>
    </RouteGuard>
  );
}